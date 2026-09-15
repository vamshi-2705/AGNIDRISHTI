import React, { useEffect, useRef, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';

/**
 * Calculates high-precision geodesic destination point on WGS84 sphere.
 * @param {number} lat - Origin latitude (degrees)
 * @param {number} lon - Origin longitude (degrees)
 * @param {number} bearingDeg - Azimuth / bearing in degrees (0 = N, 90 = E, 180 = S, 270 = W)
 * @param {number} distKm - Distance in kilometers
 * @returns {[number, number]} [latitude, longitude]
 */
export function calculateGeodesicDestination(lat, lon, bearingDeg, distKm) {
  const R = 6371.0; // Mean Earth radius in km
  const delta = distKm / R;
  const theta = (bearingDeg * Math.PI) / 180;
  const phi1 = (lat * Math.PI) / 180;
  const lambda1 = (lon * Math.PI) / 180;

  const sinPhi2 = Math.sin(phi1) * Math.cos(delta) + Math.cos(phi1) * Math.sin(delta) * Math.cos(theta);
  const phi2 = Math.asin(Math.max(-1, Math.min(1, sinPhi2)));
  const y = Math.sin(theta) * Math.sin(delta) * Math.cos(phi1);
  const x = Math.cos(delta) - Math.sin(phi1) * Math.sin(phi2);
  const lambda2 = lambda1 + Math.atan2(y, x);

  const lat2 = (phi2 * 180) / Math.PI;
  const lon2 = (((lambda2 * 180) / Math.PI + 540) % 360) - 180;
  return [Number(lat2.toFixed(6)), Number(lon2.toFixed(6))];
}

/**
 * Creates a directional atmospheric dispersion plume / wedge polygon.
 * Originates EXACTLY from the thermal hotspot and extends DOWNWIND.
 * 
 * @param {number} latitude - Hotspot latitude
 * @param {number} longitude - Hotspot longitude
 * @param {number} downwindBearing - Direction TOWARD which the plume travels (degrees 0-360)
 * @param {number} lengthKm - Estimated transport distance / plume reach (km)
 * @param {number} apertureDegrees - Plume cone aperture / dispersion angle (degrees, default 32.0)
 * @returns {{
 *   leafletPositions: [number, number][],
 *   centerline: [number, number][],
 *   arrow: [number, number][],
 *   downwindBearing: number,
 *   lengthKm: number
 * }}
 */
export function createDirectionalPlume(
  latitude,
  longitude,
  downwindBearing,
  lengthKm
) {
  const originLat = Number(latitude);
  const originLon = Number(longitude);
  const normBearing = ((Number(downwindBearing) % 360) + 360) % 360;
  const dist = Math.max(1.5, Math.min(35.0, Number(lengthKm) || 5.0));

  const leftCrossBearing = (normBearing - 90.0 + 360.0) % 360.0;
  const rightCrossBearing = (normBearing + 90.0) % 360.0;

  // 1. Outer Atmospheric Transport Envelope:
  // Originates EXACTLY at the hotspot source (W = 0).
  // Widens gradually with distance following Gaussian dispersion W(d) = 0.04 + 0.32 * sqrt(d)
  const outerPolygon = [[originLat, originLon]];
  const numSteps = 12;
  const distances = [];
  for (let i = 1; i <= numSteps; i++) {
    distances.push(dist * (i / numSteps));
  }

  // Left flank from source to leading edge
  for (const d of distances) {
    const center = calculateGeodesicDestination(originLat, originLon, normBearing, d);
    const halfWidth = 0.04 + 0.32 * Math.sqrt(d);
    outerPolygon.push(calculateGeodesicDestination(center[0], center[1], leftCrossBearing, halfWidth));
  }

  // Smooth rounded aerodynamic nose around the plume tip
  const tip = calculateGeodesicDestination(originLat, originLon, normBearing, dist * 1.02);
  outerPolygon.push(tip);

  // Right flank from leading edge back to source
  for (let i = distances.length - 1; i >= 0; i--) {
    const d = distances[i];
    const center = calculateGeodesicDestination(originLat, originLon, normBearing, d);
    const halfWidth = 0.04 + 0.32 * Math.sqrt(d);
    outerPolygon.push(calculateGeodesicDestination(center[0], center[1], rightCrossBearing, halfWidth));
  }
  // Close loop back to hotspot source
  outerPolygon.push([originLat, originLon]);

  // 2. Inner Core Transport Corridor (denser near source, higher concentration)
  const corePolygon = [[originLat, originLon]];
  const coreDist = dist * 0.65;
  const coreSteps = 8;
  const coreDistances = [];
  for (let i = 1; i <= coreSteps; i++) {
    coreDistances.push(coreDist * (i / coreSteps));
  }
  for (const d of coreDistances) {
    const center = calculateGeodesicDestination(originLat, originLon, normBearing, d);
    const halfWidth = 0.02 + 0.16 * Math.sqrt(d);
    corePolygon.push(calculateGeodesicDestination(center[0], center[1], leftCrossBearing, halfWidth));
  }
  const coreTip = calculateGeodesicDestination(originLat, originLon, normBearing, coreDist * 1.02);
  corePolygon.push(coreTip);
  for (let i = coreDistances.length - 1; i >= 0; i--) {
    const d = coreDistances[i];
    const center = calculateGeodesicDestination(originLat, originLon, normBearing, d);
    const halfWidth = 0.02 + 0.16 * Math.sqrt(d);
    corePolygon.push(calculateGeodesicDestination(center[0], center[1], rightCrossBearing, halfWidth));
  }
  corePolygon.push([originLat, originLon]);

  // 3. Directional centerline from hotspot to downwind front
  const centerline = [
    [originLat, originLon],
    calculateGeodesicDestination(originLat, originLon, normBearing, dist * 0.45),
    calculateGeodesicDestination(originLat, originLon, normBearing, dist * 0.82)
  ];

  // 4. Subtle downwind directional vector arrowhead (event ● ───────────────→ downwind)
  const arrowHeadDist = dist * 0.82;
  const arrowWingDist = dist * 0.70;
  const arrowTip = calculateGeodesicDestination(originLat, originLon, normBearing, arrowHeadDist);
  const arrowLeft = calculateGeodesicDestination(originLat, originLon, (normBearing - 12.0 + 360.0) % 360.0, arrowWingDist);
  const arrowRight = calculateGeodesicDestination(originLat, originLon, (normBearing + 12.0) % 360.0, arrowWingDist);

  return {
    originLat,
    originLon,
    leafletPositions: outerPolygon,
    corePositions: corePolygon,
    centerline: centerline,
    arrow: [arrowLeft, arrowTip, arrowRight],
    arrowTip: arrowTip,
    downwindBearing: normBearing,
    lengthKm: dist
  };
}

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

  if (isEmergency || ratio >= 4.0) return 'critical';
  if (ratio >= 2.2 || fire.threat_level === 'HIGH' || frp >= 100) return 'high';
  if (ratio >= 1.5 || fire.threat_level === 'MODERATE' || frp >= 45) return 'moderate';
  return 'low';
}

function createFireIcon(fire, isSelected) {
  const color = getClassificationColor(fire);
  const tier = getThermalIntensityTier(fire);

  const outlineStyle = isSelected 
    ? 'border: 1.5px solid #ffffff; box-shadow: 0 0 6px rgba(255,255,255,0.9);' 
    : 'border: 1px solid rgba(0,0,0,0.65);';

  if (tier === 'critical') {
    const containerSize = isSelected ? 42 : 36;
    const coreSize = isSelected ? 16 : 13;

    return L.divIcon({
      className: 'gis-thermal-hotspot-marker',
      html: `
        <div class="relative flex items-center justify-center w-full h-full" style="--dot-color: ${color}; color: ${color};">
          <span class="absolute rounded-full thermal-halo-critical pointer-events-none" style="width: ${containerSize}px; height: ${containerSize}px; background-color: ${color};"></span>
          ${isSelected ? `
            <span class="absolute rounded-full pointer-events-none" style="width: ${coreSize + 8}px; height: ${coreSize + 8}px; border: 1.5px solid #ffffff; box-shadow: 0 0 6px rgba(255,255,255,0.8);"></span>
          ` : ''}
          <span class="relative rounded-full thermal-core-critical" style="width: ${coreSize}px; height: ${coreSize}px; background-color: ${color}; border: 1.5px solid #ffffff; box-shadow: 0 0 14px ${color}, 0 0 24px ${hexToRgba(color, 0.45)};"></span>
        </div>
      `,
      iconSize: [containerSize, containerSize],
      iconAnchor: [containerSize / 2, containerSize / 2],
      popupAnchor: [0, -containerSize / 2]
    });
  } else if (tier === 'high') {
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
  } else {
    const containerSize = isSelected ? 24 : 18;
    const coreSize = isSelected ? 10 : 8;

    return L.divIcon({
      className: 'gis-thermal-hotspot-marker',
      html: `
        <div class="relative flex items-center justify-center w-full h-full" style="--dot-color: ${color}; color: ${color};">
          ${isSelected ? `
            <span class="absolute rounded-full pointer-events-none" style="width: ${coreSize + 6}px; height: ${coreSize + 6}px; border: 1.5px solid #ffffff; box-shadow: 0 0 5px rgba(255,255,255,0.8);"></span>
          ` : ''}
          <span class="relative rounded-full" style="width: ${coreSize}px; height: ${coreSize}px; background-color: ${color}; ${outlineStyle} box-shadow: 0 0 6px ${color};"></span>
        </div>
      `,
      iconSize: [containerSize, containerSize],
      iconAnchor: [containerSize / 2, containerSize / 2],
      popupAnchor: [0, -containerSize / 2]
    });
  }
}

function createSensitiveIcon(type, isIntersecting) {
  let color = '#38bdf8'; // settlements = cyan
  let label = 'SET';
  if (type === 'school') {
    color = '#c084fc'; // purple
    label = 'SCH';
  } else if (type === 'hospital') {
    color = '#f43f5e'; // rose/red
    label = 'HOS';
  }

  return L.divIcon({
    className: 'gis-sensitive-location-marker',
    html: `
      <div class="relative flex items-center justify-center w-full h-full">
        <span class="w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold font-mono text-black shadow-sm border border-black/30" style="background-color: ${color};">
          ${label}
        </span>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10]
  });
}

export default function GisMapViewer({
  fires = [],
  facilities = null,
  sensitiveLocations = null,
  selectedFire = null,
  onSelectFire = () => {},
  activePlume = null
}) {
  // Layer visibility toggles
  const [layersOpen, setLayersOpen] = useState(false);
  const [showSatelliteBasemap, setShowSatelliteBasemap] = useState(false);
  const [showThermalEvents, setShowThermalEvents] = useState(true);
  const [showFacilities, setShowFacilities] = useState(true);
  const [showSettlements, setShowSettlements] = useState(true);
  const [showSchools, setShowSchools] = useState(true);
  const [showHospitals, setShowHospitals] = useState(true);
  const [showPlume, setShowPlume] = useState(true);

  // Derive intersecting receptors ONLY when an event is selected
  const activeExposure = activePlume?.properties?.community_exposure || selectedFire?.community_exposure;
  const corridorReceptors = useMemo(() => {
    if (!selectedFire || !activeExposure) return [];
    const list = [];
    (activeExposure.intersecting_settlements || []).forEach(s => list.push({ ...s, type: 'settlement' }));
    (activeExposure.intersecting_schools || []).forEach(s => list.push({ ...s, type: 'school' }));
    (activeExposure.intersecting_hospitals || []).forEach(h => list.push({ ...h, type: 'hospital' }));
    return list;
  }, [selectedFire, activeExposure]);

  const intersectingIds = useMemo(() => {
    return new Set(corridorReceptors.map(r => r.id));
  }, [corridorReceptors]);

  // Derive directional dispersion plume geometry from activePlume or selectedFire
  const directionalPlume = useMemo(() => {
    if (!selectedFire) return null;

    const lat = Number(selectedFire.latitude);
    const lon = Number(selectedFire.longitude);
    if (isNaN(lat) || isNaN(lon)) return null;

    // 1. Determine DOWNWIND bearing (direction plume travels TO)
    let downwindBearing = null;
    if (activePlume?.properties?.downwind_azimuth_deg != null) {
      downwindBearing = Number(activePlume.properties.downwind_azimuth_deg);
    } else if (selectedFire.wind_direction_deg != null) {
      // wind_direction_deg is the meteorological direction wind blows FROM -> plume travels TO (wind + 180) % 360
      downwindBearing = (Number(selectedFire.wind_direction_deg) + 180.0) % 360.0;
    } else {
      // Default prevailing boundary-layer thermal drift (ENE)
      downwindBearing = 65.0;
    }

    // 2. Determine plume length (km)
    let lengthKm = 5.0;
    if (activePlume?.properties?.hazard_length_km != null) {
      lengthKm = Number(activePlume.properties.hazard_length_km);
    } else if (selectedFire.hazard_radius_km != null) {
      lengthKm = Number(selectedFire.hazard_radius_km);
    } else {
      const frp = Number(selectedFire.frp) || 25.0;
      const windSpeed = Number(selectedFire.wind_speed_kmh) || 15.0;
      lengthKm = Math.max(2.5, Math.min(28.0, (frp / 25.0) * (0.8 + (windSpeed / 30.0))));
    }

    return createDirectionalPlume(lat, lon, downwindBearing, lengthKm);
  }, [selectedFire, activePlume]);

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={[21.5, 78.5]}
        zoom={5}
        className="w-full h-full z-0 bg-[#080b10]"
        zoomControl={false}
        attributionControl={true}
        preferCanvas={true}
      >
        {/* Basemap Switcher */}
        {showSatelliteBasemap ? (
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
          />
        ) : (
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
        )}

        <MapCameraController selectedFire={selectedFire} />

        {/* Layer 1: OSM Industrial Facility Boundary Polygons */}
        {showFacilities && facilities?.features?.map((fac) => {
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

        {/* Layer 2: Directional Downwind Atmospheric Dispersion Plume */}
        {showPlume && directionalPlume && (
          <>
            {/* Outer Atmospheric Transport Envelope */}
            <Polygon
              positions={directionalPlume.leafletPositions}
              pathOptions={{
                color: activePlume?.properties?.stroke_color || (selectedFire?.is_emergency ? '#ef4444' : '#f97316'),
                weight: 1.2,
                fillColor: activePlume?.properties?.fill_color || (selectedFire?.is_emergency ? '#ef4444' : '#f97316'),
                fillOpacity: 0.16,
                dashArray: '4, 4'
              }}
            >
              <Popup>
                <div className="p-1 font-sans text-xs">
                  <div className="font-semibold text-red-300">
                    {activePlume?.properties?.hazard_tier || 'ESTIMATED DOWNWIND DISPERSION'}
                  </div>
                  <div className="text-slate-300 mt-1 font-mono text-[11px]">
                    Estimated Dispersion: <strong>{directionalPlume.lengthKm.toFixed(1)} km downwind</strong>
                  </div>
                  <div className="text-slate-300 font-mono text-[11px]">
                    Transport Bearing: <strong>{Math.round(directionalPlume.downwindBearing)}°</strong> • Wind: {selectedFire?.wind_speed_kmh || activePlume?.properties?.wind_speed_kmh || 18} km/h
                  </div>
                  {activePlume?.properties?.community_exposure && (
                    <div className="mt-1.5 pt-1.5 border-t border-white/[0.1] text-[10.5px]">
                      <span className="text-red-300 font-semibold">Affected Communities: </span>
                      <span>
                        {activePlume.properties.community_exposure.affected_settlements_count} settlements, {activePlume.properties.community_exposure.affected_schools_count} schools
                      </span>
                    </div>
                  )}
                </div>
              </Popup>
            </Polygon>

            {/* Inner Core Corridor (dense concentration near source) */}
            {directionalPlume.corePositions && (
              <Polygon
                positions={directionalPlume.corePositions}
                pathOptions={{
                  color: activePlume?.properties?.stroke_color || (selectedFire?.is_emergency ? '#ef4444' : '#f97316'),
                  weight: 1.0,
                  fillColor: activePlume?.properties?.fill_color || (selectedFire?.is_emergency ? '#ef4444' : '#f97316'),
                  fillOpacity: 0.28,
                  stroke: false
                }}
              />
            )}

            {/* Subtle Downwind Dispersion Centerline */}
            <Polyline
              positions={directionalPlume.centerline}
              pathOptions={{
                color: activePlume?.properties?.stroke_color || (selectedFire?.is_emergency ? '#ef4444' : '#f97316'),
                weight: 1.2,
                dashArray: '4, 4',
                opacity: 0.65
              }}
            />

            {/* Downwind Vector Directional Arrowhead */}
            <Polyline
              positions={directionalPlume.arrow}
              pathOptions={{
                color: '#ffffff',
                weight: 2.0,
                opacity: 0.85
              }}
            />
          </>
        )}

        {/* Layer 3: Sensitive Locations within Estimated Exposure Corridor (Rendered ONLY when an event is selected) */}
        {selectedFire && corridorReceptors.map((rec) => {
          const type = rec.type;
          if (type === 'settlement' && !showSettlements) return null;
          if (type === 'school' && !showSchools) return null;
          if (type === 'hospital' && !showHospitals) return null;

          const lat = Number(rec.latitude);
          const lon = Number(rec.longitude);
          if (isNaN(lat) || isNaN(lon)) return null;

          return (
            <Marker
              key={rec.id || `${lat}-${lon}`}
              position={[lat, lon]}
              icon={createSensitiveIcon(type, true)}
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={0.96}>
                <div className="text-xs text-slate-100 p-1 min-w-[180px] font-sans">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="font-bold text-[11px] text-white">{rec.name}</span>
                    <span className="px-1 py-0.2 rounded bg-red-950 text-red-300 font-mono text-[9px] font-bold border border-red-700">
                      IN PLUME
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-300 font-mono">
                    {rec.category || (type === 'settlement' ? 'Settlement' : type === 'school' ? 'Educational Facility' : 'Healthcare Facility')} • {rec.district || ''}, {rec.state || ''}
                  </div>
                  <div className="text-[9.5px] text-amber-300 font-mono mt-0.5">
                    Distance: {rec.distance_km} km from hotspot
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                    Source: {rec.is_live_osm ? 'Live OpenStreetMap' : 'Curated receptor coverage — demonstration dataset'}
                  </div>
                </div>
              </Tooltip>
            </Marker>
          );
        })}

        {/* Layer 4: Thermal Hotspot Markers */}
        {showThermalEvents && fires.map((fire) => {
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
                      <span className="font-mono text-[11px]">{fire.event_id || fire.fire_id}</span>
                    </div>
                    <span className="text-orange-300 font-bold font-mono">{fire.frp} MW</span>
                  </div>

                  <div className="text-[11px] font-medium text-white truncate">
                    {fire.location?.district ? `${fire.location.district}, ${fire.location.state}` : (fire.facility_name || fire.site_hint || 'Rural Sector')}
                  </div>

                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {fire.location?.formatted_coords || `${fire.latitude.toFixed(4)}° N, ${fire.longitude.toFixed(4)}° E`}
                  </div>

                  {fire.exposure_risk_level && (
                    <div className="mt-1 pt-1 border-t border-white/[0.08] flex items-center justify-between text-[9.5px] font-mono">
                      <span className="text-slate-400">Community Exposure:</span>
                      <span className={`font-bold ${
                        fire.exposure_risk_level === 'CRITICAL' ? 'text-red-400' :
                        fire.exposure_risk_level === 'HIGH' ? 'text-orange-400' : 'text-emerald-400'
                      }`}>
                        {fire.exposure_risk_level}
                      </span>
                    </div>
                  )}
                </div>
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Floating Layer Control Panel (Top-Right, offsets when inspector is open) */}
      <div className={`absolute top-3 ${selectedFire ? 'right-[410px]' : 'right-3'} z-[950] font-sans select-none transition-all duration-300`}>
        <div className="glass-panel rounded-xl shadow-2xl overflow-hidden border border-white/[0.1] bg-[#090d14]/90 backdrop-blur-md text-slate-100 w-[220px]">
          <button
            onClick={() => setLayersOpen(!layersOpen)}
            className="w-full px-3 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-200 hover:text-white cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span>Map Layers</span>
            </div>
            {layersOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          {layersOpen && (
            <div className="p-3 border-t border-white/[0.06] space-y-2 text-[11px]">
              <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white">
                <span>Thermal Hotspots</span>
                <input
                  type="checkbox"
                  checked={showThermalEvents}
                  onChange={(e) => setShowThermalEvents(e.target.checked)}
                  className="rounded accent-orange-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white">
                <span>Industrial Facilities</span>
                <input
                  type="checkbox"
                  checked={showFacilities}
                  onChange={(e) => setShowFacilities(e.target.checked)}
                  className="rounded accent-sky-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white">
                <span>Dispersion Plume</span>
                <input
                  type="checkbox"
                  checked={showPlume}
                  onChange={(e) => setShowPlume(e.target.checked)}
                  className="rounded accent-red-500 cursor-pointer"
                />
              </label>

              <div className="pt-1.5 border-t border-white/[0.06] space-y-1.5">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                  Sensitive Places
                </span>
                <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                    <span>Settlements</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={showSettlements}
                    onChange={(e) => setShowSettlements(e.target.checked)}
                    className="rounded accent-cyan-400 cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                    <span>Schools</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={showSchools}
                    onChange={(e) => setShowSchools(e.target.checked)}
                    className="rounded accent-purple-400 cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                    <span>Hospitals</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={showHospitals}
                    onChange={(e) => setShowHospitals(e.target.checked)}
                    className="rounded accent-rose-400 cursor-pointer"
                  />
                </label>
              </div>

              <div className="pt-1.5 border-t border-white/[0.06]">
                <label className="flex items-center justify-between cursor-pointer text-slate-300 hover:text-white">
                  <span>Satellite Imagery</span>
                  <input
                    type="checkbox"
                    checked={showSatelliteBasemap}
                    onChange={(e) => setShowSatelliteBasemap(e.target.checked)}
                    className="rounded accent-sky-400 cursor-pointer"
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Map Symbology Legend */}
      <div 
        id="map-symbology-legend"
        className="absolute bottom-[76px] left-[352px] z-[950] rounded-xl p-3 text-xs backdrop-blur-md select-none font-sans w-[215px] pointer-events-auto transition-all"
        style={{
          backgroundColor: 'rgba(10, 17, 27, 0.92)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.55), 0 0 1px rgba(255, 255, 255, 0.15)'
        }}
      >
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.08]">
          <span className="font-bold text-slate-100 uppercase tracking-wider text-[10.5px] font-mono flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            MAP SYMBOLOGY
          </span>
        </div>

        {/* Classification & Severity Symbology */}
        <div className="space-y-1.5 text-[11px]">
          <div className="flex items-center gap-2 text-slate-200 font-medium">
            <span className="w-3 h-3 rounded-full bg-red-500 ring-2 ring-red-400/50 shadow-sm shrink-0"></span>
            <span>Critical Industrial</span>
          </div>
          <div className="flex items-center gap-2 text-slate-200 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-400 ring-2 ring-orange-400/40 shadow-sm shrink-0 ml-[1px]"></span>
            <span>Industrial Flare</span>
          </div>
          <div className="flex items-center gap-2 text-slate-200 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-amber-400/40 shadow-sm shrink-0 ml-[1px]"></span>
            <span>Coal Combustion</span>
          </div>
          <div className="flex items-center gap-2 text-slate-200 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/40 shadow-sm shrink-0 ml-[1px]"></span>
            <span>Agricultural / Forest</span>
          </div>
        </div>

        {/* Sensitive Receptors Symbology */}
        <div className="pt-2 border-t border-white/[0.08] mt-2.5 space-y-1.5 text-[10.5px]">
          <div className="text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1">
            RECEPTORS (IN PLUME CORRIDOR)
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-3.5 h-3.5 rounded bg-cyan-400 text-black font-bold font-mono flex items-center justify-center text-[7.5px] shrink-0 shadow-sm">
              SET
            </span>
            <span>Settlements</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-3.5 h-3.5 rounded bg-purple-400 text-black font-bold font-mono flex items-center justify-center text-[7.5px] shrink-0 shadow-sm">
              SCH
            </span>
            <span>Schools</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-3.5 h-3.5 rounded bg-rose-400 text-black font-bold font-mono flex items-center justify-center text-[7.5px] shrink-0 shadow-sm">
              HOS
            </span>
            <span>Hospitals</span>
          </div>
        </div>
      </div>
    </div>
  );
}
