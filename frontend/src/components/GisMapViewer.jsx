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

// Create clean, professional GIS HTML markers for Leaflet (Restrained, not gaming HUD)
function createFireIcon(fire, isSelected) {
  const isEmergency = fire.is_emergency;
  const isFlare = fire.category === 'PERSISTENT_INDUSTRIAL_FLARE';
  const isCoal = fire.category === 'COAL_MINING_FIRE';

  let size = 16;
  let innerHtml = '';

  if (isEmergency) {
    size = isSelected ? 24 : 20;
    innerHtml = `
      <div class="relative flex items-center justify-center w-full h-full">
        <span class="absolute w-full h-full rounded-full bg-red-500 opacity-30 ${isSelected ? 'marker-pulse-critical' : ''}"></span>
        <span class="relative w-3 h-3 rounded-full bg-red-500 border border-white shadow-sm"></span>
      </div>
    `;
  } else if (isFlare) {
    size = isSelected ? 20 : 16;
    innerHtml = `
      <div class="relative flex items-center justify-center w-full h-full">
        ${isSelected ? '<span class="absolute w-full h-full rounded-full bg-orange-400 opacity-25"></span>' : ''}
        <span class="relative w-2.5 h-2.5 rounded-full bg-orange-400 border border-slate-900"></span>
      </div>
    `;
  } else if (isCoal) {
    size = isSelected ? 18 : 14;
    innerHtml = `
      <div class="relative flex items-center justify-center w-full h-full">
        <span class="relative w-2 h-2 rounded-full bg-amber-400 border border-slate-900"></span>
      </div>
    `;
  } else {
    // Stubble or Forest fire (natural vegetation context)
    size = isSelected ? 16 : 12;
    const color = fire.category === 'FOREST_FIRE' ? '#10b981' : '#22c55e';
    innerHtml = `
      <div class="relative flex items-center justify-center w-full h-full">
        <span class="w-2 h-2 rounded-full" style="background-color: ${color}; opacity: 0.85;"></span>
      </div>
    `;
  }

  return L.divIcon({
    className: 'clean-gis-marker',
    html: innerHtml,
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
    <div className="relative w-full h-full bg-[#080b0f] overflow-hidden">
      <MapContainer
        center={center}
        zoom={5}
        minZoom={4}
        maxZoom={16}
        zoomControl={false}
        className="w-full h-full"
      >
        {/* Defense / Earth Observation Dark GIS Basemap */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          maxZoom={16}
          attribution='&copy; Esri, &copy; OpenStreetMap contributors, NASA FIRMS'
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
                weight: 1.2,
                dashArray: '4, 4',
                fillColor: '#0284c7',
                fillOpacity: 0.06
              }}
            >
              <Tooltip sticky>
                <div className="text-xs font-sans text-slate-100 p-1">
                  <div className="font-semibold text-sky-300 font-mono text-[10px]">
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

        {/* Layer 2: Estimated Downwind Dispersion Plume Polygon (GeoJSON Model Output) */}
        {activePlume?.geometry?.coordinates && (
          <Polygon
            positions={activePlume.geometry.coordinates[0].map(([lon, lat]) => [lat, lon])}
            pathOptions={{
              color: activePlume.properties?.stroke_color || '#ef4444',
              weight: 1.5,
              fillColor: activePlume.properties?.fill_color || '#ef4444',
              fillOpacity: 0.25
            }}
          >
            <Popup>
              <div className="p-1 font-mono text-xs">
                <div className="font-semibold text-red-300">
                  {activePlume.properties?.hazard_tier || 'ESTIMATED DISPERSION CORRIDOR'}
                </div>
                <div className="text-slate-300 mt-1">
                  Estimated Hazard Corridor: <strong>{activePlume.properties?.hazard_length_km} km</strong>
                </div>
                <div className="text-slate-400 text-[10px]">
                  Downwind Bearing: {activePlume.properties?.downwind_azimuth_deg}° • Wind: {activePlume.properties?.wind_speed_kmh} km/h
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
              <Tooltip direction="top" offset={[0, -8]} opacity={0.96}>
                <div className="font-mono text-xs text-slate-100 p-1 min-w-[200px]">
                  <div className="flex items-center justify-between gap-1.5 font-semibold mb-0.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full inline-block"
                        style={{ backgroundColor: fire.threat_color || '#fff' }}
                      ></span>
                      <span>{fire.fire_id}</span>
                    </div>
                    <span className="text-orange-300 font-bold">{fire.frp} MW</span>
                  </div>

                  <div className="text-[11px] font-sans font-medium text-white truncate">
                    {fire.location?.district ? `${fire.location.district}, ${fire.location.state}` : (fire.facility_name || fire.site_hint || 'Rural Sector')}
                  </div>

                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {fire.location?.formatted_coords || `${fire.latitude.toFixed(4)}° N, ${fire.longitude.toFixed(4)}° E`}
                  </div>

                  <div className="text-[9px] text-slate-400 mt-1 pt-1 border-t border-white/[0.08] flex items-center justify-between">
                    <span className="truncate max-w-[130px] text-slate-300">
                      {fire.cause_analysis?.cause_title || fire.category}
                    </span>
                    <span className="text-slate-300 font-medium">
                      {fire.anomaly_ratio ? `${fire.anomaly_ratio}x` : '1.0x'}
                    </span>
                  </div>
                </div>
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Map Legend Overlay (Bottom-Left) */}
      <div className="absolute bottom-4 left-4 z-[999] bg-[#0c1015]/90 border border-white/[0.08] rounded-md p-2.5 text-[11px] font-mono shadow-lg backdrop-blur-md text-slate-300 select-none">
        <div className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] mb-1.5">
          Map Symbology
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            <span>Critical Thermal Anomaly</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-400"></span>
            <span>Refinery Operational Flare</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>Coal Seam Combustion</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Agricultural Stubble / Forest</span>
          </div>
          <div className="flex items-center gap-2 pt-0.5 border-t border-white/[0.08] mt-1">
            <span className="w-3.5 h-1 border border-sky-400 border-dashed bg-sky-900/30"></span>
            <span className="text-sky-300">OSM Industrial Boundary</span>
          </div>
        </div>
      </div>
    </div>
  );
}
