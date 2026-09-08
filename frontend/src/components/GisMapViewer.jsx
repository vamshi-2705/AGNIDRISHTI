import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Component to handle smooth camera flyTo when selectedFire changes
function MapCameraController({ selectedFire }) {
  const map = useMap();
  const prevIdRef = useRef(null);

  useEffect(() => {
    if (selectedFire && selectedFire.fire_id !== prevIdRef.current) {
      prevIdRef.current = selectedFire.fire_id;
      map.flyTo([selectedFire.latitude, selectedFire.longitude], 11, {
        duration: 1.5,
        easeLinearity: 0.25
      });
    }
  }, [selectedFire, map]);

  return null;
}

// Create custom animated radar pulse HTML markers for Leaflet
function createFireIcon(fire, isSelected) {
  const isEmergency = fire.is_emergency;
  const isFlare = fire.category === 'PERSISTENT_INDUSTRIAL_FLARE';
  const isCoal = fire.category === 'COAL_MINING_FIRE';

  let markerClass = '';
  let innerDot = '';
  let size = 24;

  if (isEmergency) {
    size = 36;
    markerClass = 'relative flex items-center justify-center';
    innerDot = `
      <div class="relative flex items-center justify-center w-8 h-8">
        <span class="absolute w-8 h-8 rounded-full bg-red-500 opacity-60 pulse-ring-red"></span>
        <span class="relative w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white shadow-lg shadow-red-500"></span>
      </div>
    `;
  } else if (isFlare) {
    size = 26;
    markerClass = 'relative flex items-center justify-center';
    innerDot = `
      <div class="relative flex items-center justify-center w-6 h-6">
        <span class="absolute w-6 h-6 rounded-full bg-orange-500 opacity-50 pulse-ring-orange"></span>
        <span class="relative w-2.5 h-2.5 rounded-full bg-orange-400 border border-white/80 shadow-md"></span>
      </div>
    `;
  } else if (isCoal) {
    size = 24;
    markerClass = 'relative flex items-center justify-center';
    innerDot = `
      <div class="relative flex items-center justify-center w-5 h-5">
        <span class="relative w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-200"></span>
      </div>
    `;
  } else {
    // Agricultural stubble or Forest fire
    size = 20;
    const color = fire.category === 'FOREST_FIRE' ? '#10b981' : '#22c55e';
    innerDot = `
      <div class="relative flex items-center justify-center w-4 h-4">
        <span class="w-2 h-2 rounded-full" style="background-color: ${color}; opacity: 0.85;"></span>
      </div>
    `;
  }

  return L.divIcon({
    className: 'custom-fire-marker',
    html: innerDot,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  });
}

export default function GisMapViewer({
  fires,
  facilities,
  selectedFire,
  onSelectFire,
  activePlume
}) {
  // Center coordinates of India
  const center = [22.5937, 78.9629];

  return (
    <div className="relative w-full h-full bg-[#080c14] overflow-hidden">
      <MapContainer
        center={center}
        zoom={5}
        minZoom={4}
        maxZoom={16}
        zoomControl={false}
        className="w-full h-full"
      >
        {/* Clean Watermark-Free Defense Dark GIS Basemap (Zero API Key Needed) */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          maxZoom={16}
          attribution='&copy; Esri, &copy; OpenStreetMap contributors, NTRO'
        />
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
          maxZoom={16}
        />

        {/* Camera Controller */}
        <MapCameraController selectedFire={selectedFire} />

        {/* Layer 1: OSM Industrial Facility Boundary Polygons */}
        {facilities?.features?.map((fac) => {
          const coords = fac.geometry.coordinates[0].map(([lon, lat]) => [lat, lon]);
          const props = fac.properties;

          return (
            <Polygon
              key={fac.id || props.facility_id}
              positions={coords}
              pathOptions={{
                color: '#38bdf8',
                weight: 1.5,
                dashArray: '5, 5',
                fillColor: '#0284c7',
                fillOpacity: 0.08
              }}
            >
              <Tooltip sticky>
                <div className="text-xs font-sans text-slate-100 p-1">
                  <div className="font-bold text-sky-400 font-mono text-[11px]">
                    OSM INDUSTRIAL PERIMETER
                  </div>
                  <div className="font-semibold text-slate-100 mt-0.5">{props.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Baseline: {props.baseline_frp_mw} MW • Max Normal: {props.max_normal_frp_mw} MW
                  </div>
                </div>
              </Tooltip>
            </Polygon>
          );
        })}

        {/* Layer 2: Dynamic Toxic Smoke Plume Polygon (GeoJSON Cone) */}
        {activePlume?.geometry?.coordinates && (
          <Polygon
            positions={activePlume.geometry.coordinates[0].map(([lon, lat]) => [lat, lon])}
            pathOptions={{
              color: activePlume.properties?.stroke_color || '#ef4444',
              weight: 2,
              fillColor: activePlume.properties?.fill_color || '#ef4444',
              fillOpacity: activePlume.properties?.fill_opacity || 0.35
            }}
          >
            <Popup>
              <div className="p-1 font-mono text-xs">
                <div className="font-bold text-red-400">
                  {activePlume.properties?.hazard_tier || 'TOXIC SMOKE HAZARD CORRIDOR'}
                </div>
                <div className="text-slate-300 mt-1">
                  Hazard Length: <strong>{activePlume.properties?.hazard_length_km} km</strong>
                </div>
                <div className="text-slate-400 text-[10px]">
                  Bearing: {activePlume.properties?.downwind_azimuth_deg}° • Wind: {activePlume.properties?.wind_speed_kmh} km/h
                </div>
              </div>
            </Popup>
          </Polygon>
        )}

        {/* Layer 3: Thermal Fire Hotspot Markers */}
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
              <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                <div className="font-mono text-xs text-slate-100 p-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ backgroundColor: fire.threat_color || '#fff' }}
                    ></span>
                    <span>{fire.fire_id}</span>
                    <span className="text-amber-300">({fire.frp} MW)</span>
                  </div>
                  <div className="text-[10px] text-slate-300 mt-0.5">
                    {fire.facility_name || fire.site_hint || fire.category}
                  </div>
                </div>
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Map Legend Overlay (Bottom-Left) */}
      <div className="absolute bottom-4 left-4 z-[999] bg-[#0b0f19]/90 border border-slate-800/90 rounded-lg p-2.5 text-[11px] font-mono shadow-xl backdrop-blur-md text-slate-300 select-none">
        <div className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1.5">
          Map Symbology
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 border border-white pulse-ring-red"></span>
            <span>Critical Industrial Emergency</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
            <span>Routine Refinery Flare Stack</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <span>Coal Seam Combustion</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Agricultural Stubble / Forest</span>
          </div>
          <div className="flex items-center gap-2 pt-0.5 border-t border-slate-800 mt-1">
            <span className="w-3.5 h-1.5 border border-sky-400 border-dashed bg-sky-900/30"></span>
            <span className="text-sky-300">OSM Industrial Boundary</span>
          </div>
        </div>
      </div>
    </div>
  );
}
