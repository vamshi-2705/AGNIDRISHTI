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
  const isEmergency = fire.is_emergency || fire.category === 'CRITICAL_INDUSTRIAL_EMERGENCY' || fire.threat_level === 'CRITICAL';
  const ratio = fire.anomaly_ratio != null ? Number(fire.anomaly_ratio) : 1.0;
  const frp = fire.frp || 20;

  // 1. CRITICAL: Emergency classification or anomaly_ratio >= 4.0
  if (isEmergency || ratio >= 4.0) {
    return 'critical';
  }

  // 2. HIGH: 2.2 <= ratio < 4.0 or threat HIGH or FRP >= 100
  if (ratio >= 2.2 || fire.threat_level === 'HIGH' || frp >= 100) {
    return 'high';
  }

  // 3. MODERATE: 1.5 <= ratio < 2.2 or threat MODERATE or FRP >= 45
  if (ratio >= 1.5 || fire.threat_level === 'MODERATE' || frp >= 45) {
    return 'moderate';
  }

  // 4. LOW: ratio < 1.5
  return 'low';
}

function createFireIcon(fire, isSelected) {
  const color = getClassificationColor(fire);
  const tier = getThermalIntensityTier(fire);

  const outlineStyle = isSelected 
    ? 'border: 1.5px solid #ffffff; box-shadow: 0 0 6px rgba(255,255,255,0.9);' 
    : 'border: 1px solid rgba(0,0,0,0.65);';

  if (tier === 'critical') {
    // CRITICAL: ONE thermal core with strongest glow + ONE soft expanding halo (non-targeting)
    const containerSize = isSelected ? 42 : 36;
    const coreSize = isSelected ? 16 : 13;

    return L.divIcon({
      className: 'gis-thermal-hotspot-marker',
      html: `
        <div class="relative flex items-center justify-center w-full h-full" style="--dot-color: ${color}; color: ${color};">
          <!-- ONE soft expanding halo for high thermal intensity -->
          <span class="absolute rounded-full thermal-halo-critical pointer-events-none" style="width: ${containerSize}px; height: ${containerSize}px; background-color: ${color};"></span>
          
          ${isSelected ? `
            <span class="absolute rounded-full pointer-events-none" style="width: ${coreSize + 8}px; height: ${coreSize + 8}px; border: 1.5px solid #ffffff; box-shadow: 0 0 6px rgba(255,255,255,0.8);"></span>
          ` : ''}
          
          <!-- ONE solid thermal core with strongest glow -->
          <span class="relative rounded-full thermal-core-critical" style="width: ${coreSize}px; height: ${coreSize}px; background-color: ${color}; border: 1.5px solid #ffffff; box-shadow: 0 0 14px ${color}, 0 0 24px ${hexToRgba(color, 0.45)};"></span>
        </div>
      `,
      iconSize: [containerSize, containerSize],
      iconAnchor: [containerSize / 2, containerSize / 2],
      popupAnchor: [0, -containerSize / 2]
    });
  } else if (tier === 'high') {
    // HIGH: stronger glow
    const containerSize = isSelected ? 30 : 24;
    const coreSize = isSelected ? 13 : 10.5;

    return L.divIcon({
      className: 'gis-thermal-hotspot-marker',
      html: `
        <div class="relative flex items-center justify-center w-full h-full" style="--dot-color: ${color}; color: ${color};">
          ${isSelected ? `
            <span class="absolute rounded-full pointer-events-none" style="width: ${coreSize + 6}px; height: ${coreSize + 6}px; border: 1.5px solid #ffffff; box-shadow: 0 0 5px rgba(255,255,255,0.8);"></span>
          ` : ''}
          <span class="relative rounded-full thermal-pulse-high" style="width: ${coreSize}px; height: ${coreSize}px; background-color: ${color}; ${outlineStyle} box-shadow: 0 0 10px ${color}, 0 0 18px ${hexToRgba(color, 0.35)};"></span>
        </div>
      `,
      iconSize: [containerSize, containerSize],
      iconAnchor: [containerSize / 2, containerSize / 2],
      popupAnchor: [0, -containerSize / 2]
    });
  } else if (tier === 'moderate') {
    // MODERATE: soft glow
    const containerSize = isSelected ? 26 : 20;
    const coreSize = isSelected ? 11 : 9;

    return L.divIcon({
      className: 'gis-thermal-hotspot-marker',
      html: `
        <div class="relative flex items-center justify-center w-full h-full" style="--dot-color: ${color}; color: ${color};">
          ${isSelected ? `
            <span class="absolute rounded-full pointer-events-none" style="width: ${coreSize + 6}px; height: ${coreSize + 6}px; border: 1.5px solid #ffffff; box-shadow: 0 0 5px rgba(255,255,255,0.8);"></span>
          ` : ''}
          <span class="relative rounded-full thermal-pulse-moderate" style="width: ${coreSize}px; height: ${coreSize}px; background-color: ${color}; ${outlineStyle} box-shadow: 0 0 7px ${color}, 0 0 12px ${hexToRgba(color, 0.25)};"></span>
        </div>
      `,
      iconSize: [containerSize, containerSize],
      iconAnchor: [containerSize / 2, containerSize / 2],
      popupAnchor: [0, -containerSize / 2]
    });
  } else {
    // LOW: subtle glow
    const containerSize = isSelected ? 22 : 16;
    const coreSize = isSelected ? 9 : 7;

    return L.divIcon({
      className: 'gis-thermal-hotspot-marker',
      html: `
        <div class="relative flex items-center justify-center w-full h-full" style="--dot-color: ${color}; color: ${color};">
          ${isSelected ? `
            <span class="absolute rounded-full pointer-events-none" style="width: ${coreSize + 5}px; height: ${coreSize + 5}px; border: 1.5px solid #ffffff; box-shadow: 0 0 5px rgba(255,255,255,0.8);"></span>
          ` : ''}
          <span class="relative rounded-full thermal-pulse-low" style="width: ${coreSize}px; height: ${coreSize}px; background-color: ${color}; ${outlineStyle} box-shadow: 0 0 4px ${color}, 0 0 7px ${hexToRgba(color, 0.2)};"></span>
        </div>
      `,
      iconSize: [containerSize, containerSize],
      iconAnchor: [containerSize / 2, containerSize / 2],
      popupAnchor: [0, -containerSize / 2]
    });
  }
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
                <div className="text-slate-300 mt-1 font-mono text-[11px]">
                  Estimated Dispersion: <strong>{activePlume.properties?.hazard_length_km} km</strong>
                </div>
                <div className="text-slate-300 font-mono text-[11px]">
                  Estimated Hazard Radius: <strong className="text-red-400">{activePlume.properties?.evacuation_zone_radius_km || 2.0} km</strong>
                </div>
                <div className="text-slate-400 text-[10px] font-mono mt-0.5">
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
      <div className="absolute bottom-4 left-[344px] z-[999] bg-[#0c1017]/92 border border-white/[0.08] rounded-lg p-3 text-xs shadow-xl backdrop-blur-md text-slate-300 select-none font-sans max-w-[250px]">
        <div className="font-semibold text-slate-300 uppercase tracking-wider text-[10px] mb-2 flex items-center justify-between">
          <span>Map Symbology</span>
        </div>


        {/* 1. Classification & Corona Symbology */}
        <div className="space-y-1.5 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 ring-2 ring-red-400/50 inline-block"></span>
            <span>Critical Industrial</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-400 ring-2 ring-orange-400/40 inline-block"></span>
            <span>Industrial Flare</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-amber-400/40 inline-block"></span>
            <span>Coal Combustion</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/40 inline-block"></span>
            <span>Agricultural / Forest</span>
          </div>
        </div>

        {/* 2. Neutral Boundary */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06] mt-2">
          <span className="w-3.5 h-1 border border-slate-400 border-dashed bg-slate-700/30 inline-block"></span>
          <span className="text-slate-400 font-mono text-[10px]">OSM Industrial Perimeter</span>
        </div>

        <div className="pt-2 border-t border-white/[0.06] mt-2 text-[10px] text-slate-400 font-sans">
          <div><strong className="text-slate-300">Dot color</strong> = classification</div>
          <div><strong className="text-slate-300">Glow intensity</strong> = thermal severity</div>
        </div>
      </div>
    </div>
  );
}
