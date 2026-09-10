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

// Flame SVG geometry path (Lucide style flame glyph)
const FLAME_PATH = "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z";

function getFlameColor(fire) {
  if (fire.is_emergency || fire.category === 'CRITICAL_INDUSTRIAL_EMERGENCY') {
    return '#ef4444'; // Red
  }
  if (fire.category === 'PERSISTENT_INDUSTRIAL_FLARE') {
    return '#f97316'; // Orange
  }
  if (fire.category === 'COAL_MINING_FIRE') {
    return '#eab308'; // Amber
  }
  if (fire.category === 'AGRICULTURAL_STUBBLE') {
    return '#22c55e'; // Green
  }
  if (fire.category === 'FOREST_FIRE') {
    return '#10b981'; // Emerald
  }
  return '#f97316';
}

function createFireIcon(fire, isSelected) {
  const isEmergency = fire.is_emergency || fire.category === 'CRITICAL_INDUSTRIAL_EMERGENCY';
  const color = getFlameColor(fire);

  // Marker sizes: Normal 16-18px, Selected 20-24px
  const containerSize = isSelected ? (isEmergency ? 26 : 22) : (isEmergency ? 18 : 16);
  const flameSize = isSelected ? (isEmergency ? 22 : 18) : (isEmergency ? 16 : 14);

  let haloHtml = '';
  if (isSelected) {
    if (isEmergency) {
      haloHtml = `<span class="absolute -inset-1 rounded-full bg-red-500/30 ring-1 ring-red-400"></span>`;
    } else {
      haloHtml = `<span class="absolute -inset-0.5 rounded-full bg-white/15 ring-1 ring-white/40"></span>`;
    }
  }

  const strokeColor = isSelected ? (isEmergency ? '#ffffff' : '#f8fafc') : 'rgba(0,0,0,0.6)';
  const strokeWidth = isSelected ? '1.5' : '1';

  const innerHtml = `
    <div class="relative flex items-center justify-center w-full h-full">
      ${haloHtml}
      <svg
        viewBox="0 0 24 24"
        width="${flameSize}"
        height="${flameSize}"
        fill="${color}"
        stroke="${strokeColor}"
        stroke-width="${strokeWidth}"
        stroke-linecap="round"
        stroke-linejoin="round"
        style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.9));"
      >
        <path d="${FLAME_PATH}" />
      </svg>
    </div>
  `;

  return L.divIcon({
    className: 'gis-flame-glyph-marker',
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

        {/* Layer 1: OSM Industrial Facility Boundary Polygons (Neutral gray/white dashed line) */}
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

        {/* Layer 3: Fire / Ignition Glyph Hotspot Markers */}
        {fires.map((fire) => {
          const isSelected = selectedFire?.fire_id === fire.fire_id;

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
                      <svg viewBox="0 0 24 24" width="12" height="12" fill={getFlameColor(fire)} stroke="none">
                        <path d={FLAME_PATH} />
                      </svg>
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

      {/* Map Symbology Legend with Flame Glyphs & Neutral Perimeter */}
      <div className="absolute bottom-4 left-4 z-[999] bg-[#0c1015]/90 border border-white/[0.08] rounded-md p-2.5 text-[11px] shadow-lg backdrop-blur-md text-slate-300 select-none font-sans">
        <div className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] mb-1.5">
          Map Symbology
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="#ef4444" stroke="#7f1d1d" strokeWidth="0.5">
              <path d={FLAME_PATH} />
            </svg>
            <span>Critical Industrial Anomaly</span>
          </div>
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="#f97316" stroke="#7c2d12" strokeWidth="0.5">
              <path d={FLAME_PATH} />
            </svg>
            <span>Persistent Industrial Flare</span>
          </div>
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="#eab308" stroke="#713f12" strokeWidth="0.5">
              <path d={FLAME_PATH} />
            </svg>
            <span>Coal Seam Combustion</span>
          </div>
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="#22c55e" stroke="#14532d" strokeWidth="0.5">
              <path d={FLAME_PATH} />
            </svg>
            <span>Agricultural / Forest</span>
          </div>
          <div className="flex items-center gap-2 pt-1 border-t border-white/[0.08] mt-1">
            <span className="w-3.5 h-1 border border-slate-400 border-dashed bg-slate-700/30"></span>
            <span className="text-slate-300 font-mono text-[10px]">OSM Industrial Perimeter</span>
          </div>
        </div>
      </div>
    </div>
  );
}
