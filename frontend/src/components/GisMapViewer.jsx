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


/**
 * COLOR = WHAT TYPE? (Classification)
 */
function getClassificationColor(fire) {
  if (fire.is_emergency || fire.category === 'CRITICAL_INDUSTRIAL_EMERGENCY') {
    return '#ef4444'; // Red (Critical Emergency)
  }
  if (fire.category === 'PERSISTENT_INDUSTRIAL_FLARE') {
    return '#f97316'; // Orange (Operational Flare)
  }
  if (fire.category === 'COAL_MINING_FIRE') {
    return '#eab308'; // Amber (Coal Seam Combustion)
  }
  if (fire.category === 'AGRICULTURAL_STUBBLE') {
    return '#22c55e'; // Green (Agricultural)
  }
  if (fire.category === 'FOREST_FIRE') {
    return '#10b981'; // Emerald (Forest)
  }
  return '#f97316';
}

/**
 * INTENSITY = HOW STRONG/ABNORMAL?
 * Derived from Anomaly Ratio, FRP, and Critical status
 * Levels: LOW, MODERATE, HIGH, CRITICAL
 */
function getThermalIntensity(fire) {
  if (fire.is_emergency || fire.category === 'CRITICAL_INDUSTRIAL_EMERGENCY' || fire.threat_level === 'CRITICAL') {
    return 'CRITICAL';
  }
  const ratio = fire.anomaly_ratio || (fire.frp && fire.baseline_frp_mw ? fire.frp / fire.baseline_frp_mw : 1.0);
  const frp = fire.frp || 0;

  if (ratio >= 2.5 || frp >= 150) {
    return 'HIGH';
  }
  if (ratio >= 1.25 || frp >= 50) {
    return 'MODERATE';
  }
  return 'LOW';
}

function createFireIcon(fire, isSelected) {
  const color = getClassificationColor(fire);
  const intensity = getThermalIntensity(fire);

  let containerSize = 20;
  let coreSize = 8;
  let innerHtml = '';

  const outlineStyle = isSelected 
    ? 'border: 1.5px solid #ffffff; box-shadow: 0 0 0 2px rgba(255,255,255,0.4);' 
    : 'border: 1px solid rgba(0,0,0,0.6);';

  if (intensity === 'CRITICAL') {
    // CRITICAL: ◉  ●  ◉ (strong expanding halo + concentric corona + core pulse)
    containerSize = isSelected ? 44 : 38;
    coreSize = isSelected ? 20 : 17;
    const coronaSize = coreSize + 10;

    innerHtml = `
      <div class="relative flex items-center justify-center w-full h-full">
        <!-- Strong expanding outer halo ring (1.4s) -->
        <span class="absolute w-full h-full rounded-full thermal-ring-critical" style="background-color: ${color}; opacity: 0.42;"></span>
        
        <!-- Concentric inner corona ring ◉ -->
        <span class="absolute rounded-full" style="width: ${coronaSize}px; height: ${coronaSize}px; border: 1.5px solid ${color}; background-color: ${color}25; box-shadow: 0 0 8px ${color}60;"></span>
        
        <!-- Solid core with subtle breathing pulse ● -->
        <span class="relative rounded-full thermal-core-critical" style="width: ${coreSize}px; height: ${coreSize}px; background-color: ${color}; ${outlineStyle} box-shadow: 0 0 14px ${color};"></span>
      </div>
    `;
  } else if (intensity === 'HIGH') {
    // HIGH: ·  ●  · (stronger glow + soft expanding ring + corona ring)
    containerSize = isSelected ? 34 : 28;
    coreSize = isSelected ? 17 : 14;
    const coronaSize = coreSize + 8;

    innerHtml = `
      <div class="relative flex items-center justify-center w-full h-full">
        <!-- Expanding soft halo ring (2.0s) -->
        <span class="absolute w-full h-full rounded-full thermal-ring-high" style="background-color: ${color}; opacity: 0.28;"></span>
        
        <!-- Inner glow ring · ● · -->
        <span class="absolute rounded-full" style="width: ${coronaSize}px; height: ${coronaSize}px; border: 1px solid ${color}60; background-color: ${color}18;"></span>
        
        <!-- Solid core with stronger glow ● -->
        <span class="relative rounded-full" style="width: ${coreSize}px; height: ${coreSize}px; background-color: ${color}; ${outlineStyle} box-shadow: 0 0 10px ${color}a0;"></span>
      </div>
    `;
  } else if (intensity === 'MODERATE') {
    // MODERATE: ·  ·  · (soft glow + breathing aura + core)
    containerSize = isSelected ? 26 : 22;
    coreSize = isSelected ? 13 : 11;
    const auraSize = coreSize + 8;

    innerHtml = `
      <div class="relative flex items-center justify-center w-full h-full">
        <!-- Soft breathing ambient aura · · · -->
        <span class="absolute rounded-full thermal-pulse-moderate" style="width: ${auraSize}px; height: ${auraSize}px; background-color: ${color}; opacity: 0.22; filter: blur(1.5px);"></span>
        
        <!-- Core dot with soft breathing glow ● -->
        <span class="relative rounded-full thermal-pulse-moderate" style="width: ${coreSize}px; height: ${coreSize}px; background-color: ${color}; ${outlineStyle} box-shadow: 0 0 6px ${color}80;"></span>
      </div>
    `;
  } else {
    // LOW: ··· (very subtle glow, static clean dot)
    containerSize = isSelected ? 20 : 16;
    coreSize = isSelected ? 10 : 8;
    const auraSize = coreSize + 4;

    innerHtml = `
      <div class="relative flex items-center justify-center w-full h-full">
        <!-- Very subtle glow aura ··· -->
        <span class="absolute rounded-full" style="width: ${auraSize}px; height: ${auraSize}px; background-color: ${color}; opacity: 0.15; filter: blur(1px);"></span>
        
        <!-- Core dot ● -->
        <span class="relative rounded-full" style="width: ${coreSize}px; height: ${coreSize}px; background-color: ${color}; ${outlineStyle} box-shadow: 0 0 3px ${color}50;"></span>
      </div>
    `;
  }

  return L.divIcon({
    className: 'gis-thermal-dot-marker',
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
    <div className="relative w-full h-full bg-[#080b0f] overflow-hidden">
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

        {/* Layer 1: OSM Industrial Facility Boundary Polygons (Neutral slate/white dashed line) */}
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
                weight: isSelectedFacility ? 2 : 1.2,
                dashArray: isSelectedFacility ? '6, 3' : '4, 4',
                fillColor: isSelectedFacility ? '#cbd5e1' : '#64748b',
                fillOpacity: isSelectedFacility ? 0.14 : 0.04
              }}
            >
              <Tooltip sticky>
                <div className="text-xs font-sans text-slate-100 p-1">
                  <div className="font-semibold text-slate-300 font-mono text-[10px]">
                    OSM INDUSTRIAL PERIMETER
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
              fillOpacity: 0.22
            }}
          >
            <Popup>
              <div className="p-1 font-sans text-xs">
                <div className="font-semibold text-red-300">
                  {activePlume.properties?.hazard_tier || 'ESTIMATED DISPERSION CORRIDOR'}
                </div>
                <div className="text-slate-300 mt-1 font-mono">
                  Hazard Reach: <strong>{activePlume.properties?.hazard_length_km} km</strong>
                </div>
                <div className="text-slate-400 text-[10px] font-mono">
                  Bearing: {activePlume.properties?.downwind_azimuth_deg}° • Wind: {activePlume.properties?.wind_speed_kmh} km/h
                </div>
              </div>
            </Popup>
          </Polygon>
        )}

        {/* Layer 3: Intensity-Based Thermal Dot Hotspot Markers */}
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
              <Tooltip direction="top" offset={[0, -8]} opacity={0.96}>
                <div className="text-xs text-slate-100 p-1 min-w-[200px] font-sans">
                  <div className="flex items-center justify-between gap-1.5 font-semibold mb-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: color }}></span>
                      <span className="font-mono">{fire.fire_id}</span>
                    </div>
                    <span className="text-orange-300 font-bold font-mono">{fire.frp} MW</span>
                  </div>

                  <div className="text-[11px] font-medium text-white truncate">
                    {fire.location?.district ? `${fire.location.district}, ${fire.location.state}` : (fire.facility_name || fire.site_hint || 'Rural Sector')}
                  </div>

                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {fire.location?.formatted_coords || `${fire.latitude.toFixed(4)}° N, ${fire.longitude.toFixed(4)}° E`}
                  </div>

                  <div className="text-[9px] text-slate-400 mt-1 pt-1 border-t border-white/[0.08] flex items-center justify-between">
                    <span className="truncate max-w-[130px] text-slate-300">
                      {fire.cause_analysis?.cause_title || fire.category}
                    </span>
                    <span className="text-slate-300 font-medium font-mono">
                      {fire.anomaly_ratio ? `${fire.anomaly_ratio}x` : '1.0x'}
                    </span>
                  </div>
                </div>
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Map Symbology Legend: Intensity-Based Thermal Dots & Neutral Perimeter */}
      <div className="absolute bottom-4 left-4 z-[999] bg-[#0c1015]/90 border border-white/[0.08] rounded-md p-2.5 text-[11px] shadow-lg backdrop-blur-md text-slate-300 select-none font-sans">
        <div className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] mb-1.5">
          Map Symbology
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 ring-2 ring-red-400/40 inline-block"></span>
            <span>Critical Industrial</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block"></span>
            <span>Industrial Flare</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
            <span>Coal Combustion</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            <span>Agricultural / Forest</span>
          </div>
          <div className="flex items-center gap-2 pt-1 border-t border-white/[0.08] mt-1">
            <span className="w-3.5 h-1 border border-slate-400 border-dashed bg-slate-700/30 inline-block"></span>
            <span className="text-slate-300 font-mono text-[10px]">OSM Industrial Perimeter</span>
          </div>
          <div className="pt-1.5 border-t border-white/[0.06] text-[9.5px] text-slate-400 space-y-0.5 font-sans">
            <div><strong className="text-slate-300">Dot color</strong> = classification</div>
            <div><strong className="text-slate-300">Dot intensity</strong> = thermal severity</div>
          </div>
        </div>
      </div>
    </div>
  );
}
