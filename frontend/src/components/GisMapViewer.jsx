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
  if (!hex) return `rgba(239, 68, 68, ${alpha})`;
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  if (cleanHex.length === 6) {
    const num = parseInt(cleanHex, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return `rgba(239, 68, 68, ${alpha})`;
}

function getThermalIntensityTier(fire) {
  const isEmergency = fire.is_emergency || fire.category === 'CRITICAL_INDUSTRIAL_EMERGENCY';
  const ratio = fire.anomaly_ratio || 1.0;
  const threat = fire.threat_level?.toUpperCase();
  const frp = fire.frp || 20;

  // Prefer anomaly_ratio and existing severity over absolute FRP
  if (isEmergency || threat === 'CRITICAL' || ratio >= 4.0) {
    return 'critical';
  }
  if (threat === 'HIGH' || ratio >= 2.0 || (fire.is_industrial && ratio >= 1.5) || frp >= 100) {
    return 'high';
  }
  if (threat === 'MODERATE' || threat === 'EVALUATED' || ratio >= 1.2 || fire.category === 'PERSISTENT_INDUSTRIAL_FLARE' || fire.category === 'COAL_MINING_FIRE' || frp >= 35) {
    return 'moderate';
  }
  return 'low';
}

function createFireIcon(fire, isSelected) {
  const color = getClassificationColor(fire);
  const tier = getThermalIntensityTier(fire);

  // Core dot size: low (7px), moderate (8px), high (9.5px), critical (11px)
  let coreSize = 7;
  let containerSize = 22;

  if (tier === 'critical') {
    coreSize = isSelected ? 13 : 11;
    containerSize = isSelected ? 34 : 28;
  } else if (tier === 'high') {
    coreSize = isSelected ? 11.5 : 9.5;
    containerSize = isSelected ? 30 : 24;
  } else if (tier === 'moderate') {
    coreSize = isSelected ? 10 : 8;
    containerSize = isSelected ? 28 : 22;
  } else {
    // low
    coreSize = isSelected ? 9 : 7;
    containerSize = isSelected ? 26 : 20;
  }

  // Markers use CSS classes: .thermal-dot-low, .thermal-dot-moderate, .thermal-dot-high, .thermal-dot-critical
  // COLOR = Classification (Red/Orange/Amber/Green), GLOW INTENSITY = Severity (Static -> Breathe -> Pulse -> Beacon)
  const innerHtml = `
    <div class="relative flex items-center justify-center w-full h-full" style="--dot-color: ${color};">
      ${tier === 'critical' ? `
        <span class="absolute rounded-full thermal-dot-critical-ring pointer-events-none" style="width: ${coreSize * 2.2}px; height: ${coreSize * 2.2}px; background-color: ${hexToRgba(color, 0.28)};"></span>
      ` : ''}
      ${tier === 'high' ? `
        <span class="absolute rounded-full pointer-events-none" style="width: ${coreSize * 1.8}px; height: ${coreSize * 1.8}px; background-color: ${hexToRgba(color, 0.14)}; filter: blur(2px);"></span>
      ` : ''}
      ${isSelected ? `
        <span class="absolute rounded-full pointer-events-none" style="width: ${coreSize + 8}px; height: ${coreSize + 8}px; border: 1.5px solid #ffffff; box-shadow: 0 0 6px rgba(255,255,255,0.5);"></span>
      ` : ''}
      <span class="relative rounded-full thermal-dot-${tier}" style="width: ${coreSize}px; height: ${coreSize}px; background-color: ${color}; border: ${isSelected || tier === 'critical' ? '1.5px solid #ffffff' : '1px solid rgba(0,0,0,0.85)'};"></span>
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

        {/* Layer 1: OSM Industrial Facility Boundary Polygons (Neutral Gray/White Dashed Boundary) */}
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
                color: isSelectedFacility ? 'rgba(255, 255, 255, 0.85)' : 'rgba(148, 163, 184, 0.45)',
                weight: isSelectedFacility ? 1.5 : 1.0,
                dashArray: '4, 4',
                fillColor: isSelectedFacility ? 'rgba(255, 255, 255, 0.08)' : 'rgba(148, 163, 184, 0.03)',
                fillOpacity: isSelectedFacility ? 0.08 : 0.02
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

      {/* Map Symbology Legend: Explaining Color = Classification, Intensity = Severity */}
      <div className="absolute bottom-4 left-4 z-[999] bg-[#0c1017]/92 border border-white/[0.08] rounded-lg p-3 text-xs shadow-xl backdrop-blur-md text-slate-300 select-none font-sans max-w-[250px]">
        <div className="font-semibold text-slate-300 uppercase tracking-wider text-[10px] mb-2 flex items-center justify-between">
          <span>Map Symbology</span>
        </div>

        {/* 1. Dot Color = Classification */}
        <div className="text-[9.5px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 border-b border-white/[0.06] pb-1">
          Dot Color = Classification
        </div>
        <div className="space-y-1 text-[10.5px]">
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
        </div>

        {/* 2. Dot Intensity = Thermal Severity */}
        <div className="text-[9.5px] font-semibold text-slate-400 uppercase tracking-wider mt-2.5 mb-1.5 border-b border-white/[0.06] pb-1">
          Dot Intensity = Thermal Severity
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shadow-[0_0_3px_#94a3b8]"></span>
            <span>Low: Static</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shadow-[0_0_5px_#f97316]"></span>
            <span>Mod: Breathe</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-400 shadow-[0_0_8px_#f97316]"></span>
            <span>High: Pulse</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_#ef4444]"></span>
            <span>Crit: Beacon</span>
          </div>
        </div>

        {/* 3. Neutral Boundary */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06] mt-2">
          <span className="w-3.5 h-2 border border-slate-400 border-dashed bg-white/[0.04] inline-block rounded-xs"></span>
          <span className="text-slate-400 font-mono text-[10px]">Industrial Facility (OSM)</span>
        </div>
      </div>
    </div>
  );
}
