import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function MapCameraController({ selectedFire }) {
  const map = useMap();
  const prevIdRef = useRef(null);

  useEffect(() => {
    if (selectedFire && selectedFire.fire_id !== prevIdRef.current) {
      prevIdRef.current = selectedFire.fire_id;
      map.flyTo([selectedFire.latitude, selectedFire.longitude], 11, {
        duration: 0.8,
        easeLinearity: 0.25
      });
    }
  }, [selectedFire, map]);

  return null;
}

function getClassificationColor(fire) {
  if (fire.is_emergency || fire.category === 'CRITICAL_INDUSTRIAL_EMERGENCY') {
    return '#ef4444'; // Red (Critical Industrial Emergency)
  }
  if (fire.category === 'PERSISTENT_INDUSTRIAL_FLARE') {
    return '#f97316'; // Orange (Persistent Industrial Source)
  }
  if (fire.category === 'COAL_MINING_FIRE') {
    return '#eab308'; // Amber (Coal Seam Combustion)
  }
  if (fire.category === 'AGRICULTURAL_STUBBLE' || fire.category === 'FOREST_FIRE') {
    return '#10b981'; // Emerald (Natural / Biomass)
  }
  return '#10b981';
}

function hexToRgba(hex, alpha) {
  let r = 239, g = 68, b = 68;
  if (hex === '#ef4444') { r = 239; g = 68; b = 68; }
  else if (hex === '#f97316') { r = 249; g = 115; b = 22; }
  else if (hex === '#eab308') { r = 234; g = 179; b = 8; }
  else if (hex === '#10b981') { r = 16; g = 185; b = 129; }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getThermalIntensityTier(fire) {
  const isEmergency = fire.is_emergency || fire.category === 'CRITICAL_INDUSTRIAL_EMERGENCY';
  const frp = fire.frp || 20;

  if (isEmergency || frp >= 180) {
    return 'critical';
  }
  if (frp >= 80) {
    return 'high';
  }
  if (frp >= 30) {
    return 'moderate';
  }
  return 'low';
}

function createFireIcon(fire, isSelected) {
  const color = getClassificationColor(fire);
  const isEmergency = fire.is_emergency || fire.category === 'CRITICAL_INDUSTRIAL_EMERGENCY';
  const tier = getThermalIntensityTier(fire);

  // Intensity-based visual scaling with diminishing returns (capped at 0.45 glow)
  let coreSize = 7;
  let glowAlpha = 0.15;
  let glowBlur = '5px';
  let glowSpread = '1px';
  let containerSize = 20;

  if (tier === 'critical') {
    coreSize = isSelected ? 12 : 9.5;
    glowAlpha = 0.45; // Capped max glow
    glowBlur = '12px';
    glowSpread = '2.5px';
    containerSize = isSelected ? 32 : 24;
  } else if (tier === 'high') {
    coreSize = isSelected ? 10.5 : 8.5;
    glowAlpha = 0.35;
    glowBlur = '9px';
    glowSpread = '2px';
    containerSize = isSelected ? 30 : 22;
  } else if (tier === 'moderate') {
    coreSize = isSelected ? 9.5 : 7.5;
    glowAlpha = 0.25;
    glowBlur = '7px';
    glowSpread = '1.5px';
    containerSize = isSelected ? 28 : 20;
  } else {
    // low
    coreSize = isSelected ? 8 : 6.5;
    glowAlpha = 0.15;
    glowBlur = '5px';
    glowSpread = '1px';
    containerSize = isSelected ? 26 : 18;
  }

  const glowBoxShadow = `0 0 0 1px rgba(0,0,0,0.85), 0 0 ${glowBlur} ${glowSpread} ${hexToRgba(color, glowAlpha)}`;

  // Selected hotspot: distinct concentric white target ring + clear center point
  // Only selected or critical markers have subtle emphasis motion; low/moderate/high unselected are clean & static
  const innerHtml = `
    <div class="relative flex items-center justify-center w-full h-full">
      ${(isEmergency || isSelected) ? `
        <span class="absolute rounded-full marker-beacon-critical" style="width: ${containerSize}px; height: ${containerSize}px; background-color: ${hexToRgba(color, 0.18)};"></span>
      ` : ''}
      ${isSelected ? `
        <span class="absolute rounded-full" style="width: ${coreSize + 8}px; height: ${coreSize + 8}px; border: 1.5px solid #ffffff; box-shadow: 0 0 6px rgba(255,255,255,0.45);"></span>
      ` : ''}
      <span class="relative rounded-full" style="width: ${coreSize}px; height: ${coreSize}px; background-color: ${color}; border: ${isSelected || isEmergency ? '1.5px solid #ffffff' : '1px solid rgba(0,0,0,0.8)'}; box-shadow: ${glowBoxShadow};"></span>
    </div>
  `;

  return L.divIcon({
    className: 'gis-thermal-hotspot-marker',
    html: innerHtml,
    iconSize: [containerSize, containerSize],
    iconAnchor: [containerSize / 2, containerSize / 2],
    popupAnchor: [0, -containerSize / 2]
  });
}

export default function GisMapViewer({
  fires,
  facilities,
  selectedFire,
  onSelectFire,
  activePlume
}) {
  const center = [22.5937, 78.9629];

  return (
    <div className="relative w-full h-full bg-[#080b10] overflow-hidden select-none">
      <MapContainer
        center={center}
        zoom={5}
        minZoom={4}
        maxZoom={16}
        zoomControl={false}
        className="w-full h-full"
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          maxZoom={16}
          attribution='&copy; Esri, &copy; OpenStreetMap contributors, NASA FIRMS'
        />
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
          maxZoom={16}
        />

        <MapCameraController selectedFire={selectedFire} />

        {/* Layer 1: OSM Industrial Facility Boundary Polygons (Subtle dashed perimeter) */}
        {facilities?.features?.map((fac) => {
          const coords = fac.geometry.coordinates[0].map(([lon, lat]) => [lat, lon]);
          const props = fac.properties;
          const isSelectedFacility = selectedFire && (
            selectedFire.facility_id === fac.id ||
            selectedFire.facility_id === props.facility_id ||
            (selectedFire.facility_name && props.name && selectedFire.facility_name.toLowerCase() === props.name.toLowerCase())
          );

          return (
            <Polygon
              key={fac.id || props.facility_id}
              positions={coords}
              pathOptions={{
                color: isSelectedFacility ? '#f1f5f9' : '#94a3b8',
                weight: isSelectedFacility ? 1.8 : 1.0,
                dashArray: '4, 4',
                fillColor: isSelectedFacility ? '#cbd5e1' : '#64748b',
                fillOpacity: isSelectedFacility ? 0.12 : 0.03
              }}
            >
              <Tooltip sticky>
                <div className="text-xs font-sans text-slate-100 p-1">
                  <div className="font-semibold text-slate-400 font-mono text-[10px]">
                    INDUSTRIAL PERIMETER
                  </div>
                  <div className="font-medium text-slate-100 mt-0.5">{props.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Baseline: {props.baseline_frp_mw} MW • Max Normal: {props.max_normal_frp_mw} MW
                  </div>
                </div>
              </Tooltip>
            </Polygon>
          );
        })}

        {/* Layer 2: Estimated Downwind Dispersion Plume Polygon */}
        {activePlume?.geometry?.coordinates && (
          <Polygon
            positions={activePlume.geometry.coordinates[0].map(([lon, lat]) => [lat, lon])}
            pathOptions={{
              color: activePlume.properties?.stroke_color || '#ef4444',
              weight: 1.5,
              fillColor: activePlume.properties?.fill_color || '#ef4444',
              fillOpacity: 0.20
            }}
          >
            <Popup>
              <div className="p-1 font-sans text-xs">
                <div className="font-semibold text-red-300">
                  {activePlume.properties?.hazard_tier || 'ESTIMATED DOWNWIND DISPERSION'}
                </div>
                <div className="text-slate-300 mt-1 font-mono">
                  Reach: <strong>{activePlume.properties?.hazard_length_km} km</strong>
                </div>
                <div className="text-slate-400 text-[10px] font-mono">
                  Bearing: {activePlume.properties?.downwind_azimuth_deg}° • Wind: {activePlume.properties?.wind_speed_kmh} km/h
                </div>
              </div>
            </Popup>
          </Polygon>
        )}

        {/* Layer 3: Clean, Precise Thermal Hotspot Markers */}
        {fires.map((fire) => {
          const isSelected = selectedFire?.fire_id === fire.fire_id;
          const color = getClassificationColor(fire);

          return (
            <Marker
              key={fire.fire_id}
              position={[fire.latitude, fire.longitude]}
              icon={createFireIcon(fire, isSelected)}
              eventHandlers={{
                click: () => onSelectFire(fire)
              }}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={0.96}>
                <div className="text-xs text-slate-100 p-1 min-w-[190px] font-sans">
                  <div className="flex items-center justify-between gap-2 font-semibold mb-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: color }}></span>
                      <span className="font-mono text-[11px]">{fire.fire_id}</span>
                    </div>
                    <span className="text-orange-300 font-bold font-mono">{fire.frp} MW</span>
                  </div>

                  <div className="text-[11px] font-medium text-white truncate">
                    {fire.location?.district ? `${fire.location.district}, ${fire.location.state}` : (fire.facility_name || fire.site_hint || 'Rural Sector')}
                  </div>

                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {fire.location?.formatted_coords || `${fire.latitude.toFixed(4)}° N, ${fire.longitude.toFixed(4)}° E`}
                  </div>
                </div>
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Clean Map Symbology Legend (Requested Format) */}
      <div className="absolute bottom-4 left-4 z-[999] bg-[#0c1017]/92 border border-white/[0.08] rounded-lg p-3 text-xs shadow-xl backdrop-blur-md text-slate-300 select-none font-sans">
        <div className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] mb-2">
          Map Symbology
        </div>
        <div className="space-y-1.5 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block shadow-sm"></span>
            <span>Industrial Fire</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span>
            <span>Persistent Industrial Source</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
            <span>Coal / Mining</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            <span>Agricultural / Forest</span>
          </div>
          <div className="flex items-center gap-2 pt-1 border-t border-white/[0.06] mt-1">
            <span className="w-3.5 h-2 border border-slate-400 border-dashed bg-slate-700/20 inline-block rounded-xs"></span>
            <span className="text-slate-400 font-mono text-[10.5px]">Industrial Facility</span>
          </div>
        </div>
      </div>
    </div>
  );
}
