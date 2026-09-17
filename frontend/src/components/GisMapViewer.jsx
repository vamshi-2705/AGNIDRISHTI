import React, { useEffect, useRef, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, Marker, Popup, Tooltip, Pane, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Layers, ChevronDown, ChevronUp, Eye, EyeOff, 
  Map, Globe, Mountain, Sun, Moon, Check, ShieldAlert, 
  Building2, Wind, MapPin, Radio, Compass, X 
} from 'lucide-react';

// Optional custom Map API key from Vite environment (NEVER hardcoded, optional fallback hierarchy)
const MAP_API_KEY = typeof import.meta !== 'undefined' && import.meta.env?.VITE_MAP_API_KEY 
  ? String(import.meta.env.VITE_MAP_API_KEY).trim() 
  : '';

export const BASE_MAP_STORAGE_KEY = 'agnidrishti.mapBaseLayer';

export const BASE_MAP_PROVIDERS = {
  dark: {
    id: 'dark',
    name: 'Dark / Tactical',
    tagline: 'Muted charcoal geographic map',
    // Reference-style: medium-charcoal land (#3f3f41) + dark-charcoal water (#222327), subtle borders & roads
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    referenceUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, METI, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community',
    maxZoom: 19,
    maxNativeZoom: 16
  },
  satellite: {
    id: 'satellite',
    name: 'Satellite',
    tagline: 'High-resolution imagery',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 19
  },
  streets: {
    id: 'streets',
    name: 'Streets',
    tagline: 'Roads and place names',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012',
    maxZoom: 19
  },
  topographic: {
    id: 'topographic',
    name: 'Topographic',
    tagline: 'Terrain context',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, METI, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community',
    maxZoom: 19
  },
  light: {
    id: 'light',
    name: 'Light',
    tagline: 'Soft light geographic map',
    // Soft neutral light-gray land (#efefef) + muted slate-blue water (#d0cfd4), NOT blinding white
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    referenceUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, METI, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community',
    maxZoom: 19,
    maxNativeZoom: 16
  }
};

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
 * Creates a professional GIS-style downwind dispersion corridor / wedge.
 * 
 * Geometry Requirements:
 * - Point 0: Originates EXACTLY at the thermal incident coordinate.
 * - Direction: Follows the existing calculated downwind bearing.
 * - Width profile: Starts narrow at incident, expands progressively through near and middle field,
 *   reaching maximum width at the far downwind boundary, with an aerodynamic rounded downwind cap.
 * - Gradient approximation: Core plume (high-concentration near field), Medium plume, Outer envelope.
 * 
 * @param {number} latitude - Incident latitude
 * @param {number} longitude - Incident longitude
 * @param {number} downwindBearing - Direction TOWARD which dispersion travels (0-360°)
 * @param {number} hazardRadiusKm - Estimated hazard / dispersion extent (km)
 * @param {number} [dispersionWidthKm] - Optional width at hazard boundary
 * @param {Object} [windInfo] - Optional existing wind telemetry { speedKmh, speedMs, directionDeg }
 * @param {boolean} [isDirectional=true] - Whether wind is directional vs calm/missing
 * @returns {Object} Calculated GIS geometry layers, positions, and bounds
 */
export function createDownwindDispersionPolygon(
  latitude,
  longitude,
  downwindBearing,
  hazardRadiusKm,
  dispersionWidthKm,
  windInfo = {},
  isDirectional = true
) {
  const originLat = Number(latitude);
  const originLon = Number(longitude);
  const normBearing = ((Number(downwindBearing) % 360) + 360) % 360;
  const dist = Math.max(0.8, Math.min(35.0, Number(hazardRadiusKm) || 3.0));

  // If wind is calm or missing, create an omnidirectional local screening buffer
  if (!isDirectional) {
    const radialCoords = [];
    const numPoints = 32;
    const r = Math.min(dist, 0.8);
    for (let i = 0; i < numPoints; i++) {
      const b = (i * 360) / numPoints;
      radialCoords.push(calculateGeodesicDestination(originLat, originLon, b, r));
    }
    radialCoords.push(radialCoords[0]);

    return {
      originLat,
      originLon,
      outerPolygon: radialCoords,
      mediumPolygon: null,
      corePolygon: null,
      centerline: null,
      leafletPositions: radialCoords,
      corePositions: null,
      downwindBearing: null,
      lengthKm: r,
      isDirectional: false,
      windIndicatorPosition: null,
      labelPosition: calculateGeodesicDestination(originLat, originLon, 0, r * 1.15),
      bounds: [
        [originLat - (r / 111.32), originLon - (r / (111.32 * Math.cos(originLat * Math.PI / 180)))],
        [originLat + (r / 111.32), originLon + (r / (111.32 * Math.cos(originLat * Math.PI / 180)))]
      ]
    };
  }

  const leftCrossBearing = (normBearing - 90.0 + 360.0) % 360.0;
  const rightCrossBearing = (normBearing + 90.0) % 360.0;

  // Maximum half-width at the far downwind boundary
  // Standard atmospheric hazard corridor half-aperture ~16° => halfWidthMax ~ dist * tan(16°) ~ 0.287 * dist
  const halfWidthMax = dispersionWidthKm && dispersionWidthKm > 0
    ? dispersionWidthKm / 2.0
    : Math.max(0.35, Math.min(8.0, dist * 0.287));

  // Helper generator for expanding wedge with curved downwind cap
  function buildWedge(reachDist, halfW) {
    const pts = [[originLat, originLon]]; // Point 0: incident origin
    const steps = 12;

    // 1. Left flank from incident to far downwind edge (narrow -> moderate -> widest)
    for (let i = 1; i <= steps; i++) {
      const f = i / steps;
      const d = reachDist * f;
      // Parabolic / square-root diffusion profile: starts narrow, expands progressively
      const w = halfW * (0.22 * f + 0.78 * Math.sqrt(f));
      const center = calculateGeodesicDestination(originLat, originLon, normBearing, d);
      pts.push(calculateGeodesicDestination(center[0], center[1], leftCrossBearing, w));
    }

    // 2. Downwind Cap (aerodynamic rounded front spanning from left flank to right flank)
    const capAngleSpread = Math.min(22.0, Math.atan2(halfW, reachDist) * (180 / Math.PI));
    const capSteps = 7;
    for (let j = 1; j < capSteps; j++) {
      const alpha = -capAngleSpread + (2 * capAngleSpread * (j / capSteps));
      const capBearing = (normBearing + alpha + 360) % 360;
      // Slightly convex forward cap
      const convexFactor = 1.0 + 0.025 * Math.cos((alpha / capAngleSpread) * (Math.PI / 2));
      pts.push(calculateGeodesicDestination(originLat, originLon, capBearing, reachDist * convexFactor));
    }

    // 3. Right flank from far downwind edge back to incident
    for (let i = steps; i >= 1; i--) {
      const f = i / steps;
      const d = reachDist * f;
      const w = halfW * (0.22 * f + 0.78 * Math.sqrt(f));
      const center = calculateGeodesicDestination(originLat, originLon, normBearing, d);
      pts.push(calculateGeodesicDestination(center[0], center[1], rightCrossBearing, w));
    }

    // Close loop back to incident
    pts.push([originLat, originLon]);
    return pts;
  }

  // 1. Outer Area Corridor (full hazard extent)
  const outerPolygon = buildWedge(dist, halfWidthMax);

  // 2. Medium Plume (secondary exposure, moderate width & extent ~65%)
  const mediumDist = dist * 0.65;
  const mediumHalfW = halfWidthMax * 0.65;
  const mediumPolygon = buildWedge(mediumDist, mediumHalfW);

  // 3. Core Plume (primary high-concentration near-source core ~35%)
  const coreDist = dist * 0.35;
  const coreHalfW = halfWidthMax * 0.38;
  const corePolygon = buildWedge(coreDist, coreHalfW);

  // 4. Centerline: subtle brighter downwind line
  const centerline = [
    [originLat, originLon],
    calculateGeodesicDestination(originLat, originLon, normBearing, dist * 0.28),
    calculateGeodesicDestination(originLat, originLon, normBearing, dist * 0.58),
    calculateGeodesicDestination(originLat, originLon, normBearing, dist * 0.85)
  ];

  // 5. Downwind Arrow Indicator near incident
  const arrowDist = Math.min(0.25, dist * 0.12);
  const windIndicatorPosition = calculateGeodesicDestination(originLat, originLon, normBearing, arrowDist);

  // 6. Label Position (along mid-field flank of the plume)
  const labelDist = dist * 0.52;
  const labelCenter = calculateGeodesicDestination(originLat, originLon, normBearing, labelDist);
  const labelHalfW = halfWidthMax * (0.22 * 0.52 + 0.78 * Math.sqrt(0.52));
  const labelPosition = calculateGeodesicDestination(labelCenter[0], labelCenter[1], leftCrossBearing, labelHalfW * 0.85);

  // 7. Bounding Box for smooth map camera fitting
  let minLat = originLat, maxLat = originLat, minLon = originLon, maxLon = originLon;
  outerPolygon.forEach(([pLat, pLon]) => {
    if (pLat < minLat) minLat = pLat;
    if (pLat > maxLat) maxLat = pLat;
    if (pLon < minLon) minLon = pLon;
    if (pLon > maxLon) maxLon = pLon;
  });

  return {
    originLat,
    originLon,
    outerPolygon,
    mediumPolygon,
    corePolygon,
    centerline,
    leafletPositions: outerPolygon,
    corePositions: corePolygon,
    downwindBearing: normBearing,
    lengthKm: dist,
    halfWidthMaxKm: halfWidthMax,
    isDirectional: true,
    windIndicatorPosition,
    labelPosition,
    bounds: [[minLat, minLon], [maxLat, maxLon]]
  };
}

/**
 * Backward compatibility wrapper for createDirectionalPlume
 */
export function createDirectionalPlume(latitude, longitude, downwindBearing, lengthKm) {
  return createDownwindDispersionPolygon(latitude, longitude, downwindBearing, lengthKm);
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

/**
 * Automatically fits map bounds when downwind dispersion is estimated,
 * ensuring the full corridor and incident are visible without excessive zoom-out.
 */
function PlumeBoundsFitter({ directionalPlume }) {
  const map = useMap();
  const prevPlumeKeyRef = useRef(null);

  useEffect(() => {
    if (directionalPlume?.bounds) {
      const key = `${directionalPlume.originLat}-${directionalPlume.originLon}-${directionalPlume.lengthKm}-${directionalPlume.downwindBearing}`;
      if (key !== prevPlumeKeyRef.current) {
        prevPlumeKeyRef.current = key;
        map.fitBounds(directionalPlume.bounds, {
          padding: [50, 50],
          maxZoom: 13,
          animate: true,
          duration: 0.8
        });
      }
    } else {
      prevPlumeKeyRef.current = null;
    }
  }, [directionalPlume, map]);

  return null;
}

/**
 * Zero-flicker Base Map Layer Manager.
 * Retains the previous base map underneath during tile fetching to avoid blank white
 * flashes, and smoothly unmounts once the newly chosen style tiles begin loading.
 * Supports dedicated reference overlay tiles (labels, roads, borders) in muted tones.
 */
function BaseMapLayersManager({ currentProvider, setIsTileLoading }) {
  const [activeId, setActiveId] = useState(currentProvider.id);
  const [prevProvider, setPrevProvider] = useState(null);

  useEffect(() => {
    if (currentProvider.id !== activeId) {
      setPrevProvider(BASE_MAP_PROVIDERS[activeId] || null);
      setActiveId(currentProvider.id);
      setIsTileLoading(true);
    }
  }, [currentProvider.id, activeId, setIsTileLoading]);

  const handleCurrentLoad = () => {
    setIsTileLoading(false);
    setPrevProvider(null);
  };

  return (
    <>
      {/* Retained layer underneath to prevent white/blank flicker */}
      {prevProvider && (
        <>
          <TileLayer
            key={`prev-${prevProvider.id}`}
            url={prevProvider.url}
            attribution={prevProvider.attribution}
            subdomains={prevProvider.subdomains || 'abc'}
            maxZoom={prevProvider.maxZoom || 19}
            maxNativeZoom={prevProvider.maxNativeZoom || 19}
            pane="tile-base-pane"
            zIndex={1}
            opacity={0.85}
          />
          {prevProvider.referenceUrl && (
            <TileLayer
              key={`prev-ref-${prevProvider.id}`}
              url={prevProvider.referenceUrl}
              pane="tile-reference-pane"
              maxZoom={prevProvider.maxZoom || 19}
              maxNativeZoom={prevProvider.maxNativeZoom || 19}
              zIndex={1}
              opacity={0.85}
            />
          )}
        </>
      )}

      {/* Primary selected base map layer (land + water tone) */}
      <TileLayer
        key={`curr-${currentProvider.id}`}
        url={currentProvider.url}
        attribution={currentProvider.attribution}
        subdomains={currentProvider.subdomains || 'abc'}
        maxZoom={currentProvider.maxZoom || 19}
        maxNativeZoom={currentProvider.maxNativeZoom || 19}
        pane="tile-base-pane"
        zIndex={2}
        eventHandlers={{
          loading: () => setIsTileLoading(true),
          load: handleCurrentLoad,
          tileerror: () => setIsTileLoading(false)
        }}
      />

      {/* Dedicated Geographic Reference layer (city/place labels, country names, roads, boundaries) */}
      {currentProvider.referenceUrl && (
        <TileLayer
          key={`curr-ref-${currentProvider.id}`}
          url={currentProvider.referenceUrl}
          pane="tile-reference-pane"
          maxZoom={currentProvider.maxZoom || 19}
          maxNativeZoom={currentProvider.maxNativeZoom || 19}
          zIndex={2}
        />
      )}
    </>
  );
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
  activePlume = null,
  baseMap: propBaseMap,
  onSelectBaseMap,
  hideFloatingSelector = false,
  showThermalEvents: propShowThermalEvents,
  showFacilities: propShowFacilities,
  showPlume: propShowPlume,
  showExposure: propShowExposure,
  showOsmContext: propShowOsmContext,
  showOpticalContext: propShowOpticalContext,
  showModisContext: propShowModisContext
}) {
  // Base Map Selection with localStorage persistence
  const [internalBaseMap, setInternalBaseMap] = useState(() => {
    try {
      const saved = localStorage.getItem(BASE_MAP_STORAGE_KEY);
      if (saved && BASE_MAP_PROVIDERS[saved]) {
        return saved;
      }
    } catch (e) {
      console.warn('Failed to read map base layer from localStorage', e);
    }
    return 'dark';
  });

  const baseMap = (propBaseMap && BASE_MAP_PROVIDERS[propBaseMap]) ? propBaseMap : internalBaseMap;

  const [isTileLoading, setIsTileLoading] = useState(false);

  // Layer visibility toggles (fallback to internal state if not controlled)
  const [layersOpen, setLayersOpen] = useState(false);
  const [internalThermal, setInternalThermal] = useState(true);
  const [internalFacilities, setInternalFacilities] = useState(true);
  const [internalPlume, setInternalPlume] = useState(true);
  const [internalExposure, setInternalExposure] = useState(true);
  const [internalOsm, setInternalOsm] = useState(true);
  const [internalOptical, setInternalOptical] = useState(false);
  const [internalModis, setInternalModis] = useState(false);

  const showThermalEvents = propShowThermalEvents !== undefined ? propShowThermalEvents : internalThermal;
  const showFacilities = propShowFacilities !== undefined ? propShowFacilities : internalFacilities;
  const showPlume = propShowPlume !== undefined ? propShowPlume : internalPlume;
  const showExposure = propShowExposure !== undefined ? propShowExposure : internalExposure;
  const showOsmContext = propShowOsmContext !== undefined ? propShowOsmContext : internalOsm;
  const showOpticalContext = propShowOpticalContext !== undefined ? propShowOpticalContext : internalOptical;
  const showModisContext = propShowModisContext !== undefined ? propShowModisContext : internalModis;

  // Smooth dismiss when clicking outside layer switcher
  const layerControlRef = useRef(null);
  useEffect(() => {
    function handleClickOutside(event) {
      if (layerControlRef.current && !layerControlRef.current.contains(event.target)) {
        setLayersOpen(false);
      }
    }
    if (layersOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [layersOpen]);

  const handleSelectBaseMap = (key) => {
    if (onSelectBaseMap) {
      onSelectBaseMap(key);
      return;
    }
    if (!BASE_MAP_PROVIDERS[key]) return;
    setInternalBaseMap(key);
    try {
      localStorage.setItem(BASE_MAP_STORAGE_KEY, key);
    } catch (e) {
      console.warn('Failed to save map base layer to localStorage', e);
    }
  };


  // Derive intersecting receptors ONLY when an event is selected AND activePlume is active
  const activeExposure = activePlume?.properties?.community_exposure;
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

  // Derive directional dispersion plume geometry ONLY when activePlume is active
  const directionalPlume = useMemo(() => {
    if (!selectedFire || !activePlume) return null;

    const lat = Number(selectedFire.latitude);
    const lon = Number(selectedFire.longitude);
    if (isNaN(lat) || isNaN(lon)) return null;

    const isDirectional = activePlume.properties?.is_directional !== false;

    // 1. Determine DOWNWIND bearing (direction plume travels TO)
    let downwindBearing = null;
    if (activePlume?.properties?.downwind_azimuth_deg != null) {
      downwindBearing = Number(activePlume.properties.downwind_azimuth_deg);
    } else if (selectedFire.wind_direction_deg != null) {
      // wind_direction_deg is the meteorological direction wind blows FROM -> plume travels TO (wind + 180) % 360
      downwindBearing = (Number(selectedFire.wind_direction_deg) + 180.0) % 360.0;
    } else {
      downwindBearing = isDirectional ? 65.0 : null;
    }

    // 2. Determine plume hazard length / radius (km)
    let lengthKm = 3.5;
    if (activePlume?.properties?.hazard_length_km != null) {
      lengthKm = Number(activePlume.properties.hazard_length_km);
    } else if (selectedFire.hazard_radius_km != null) {
      lengthKm = Number(selectedFire.hazard_radius_km);
    } else {
      const frp = Number(selectedFire.frp) || 25.0;
      const windSpeed = Number(selectedFire.wind_speed_kmh) || 15.0;
      lengthKm = Math.max(1.5, Math.min(28.0, (frp / 25.0) * (0.8 + (windSpeed / 30.0))));
    }

    // 3. Extract existing wind telemetry without fabricating
    const rawSpeedKmh = activePlume?.properties?.wind_speed_kmh != null
      ? activePlume.properties.wind_speed_kmh
      : selectedFire.wind_speed_kmh;
    const windSpeedKmh = rawSpeedKmh != null ? Number(rawSpeedKmh) : null;
    const windSpeedMs = activePlume?.properties?.wind_speed_ms != null
      ? activePlume.properties.wind_speed_ms
      : (windSpeedKmh != null ? Number((windSpeedKmh / 3.6).toFixed(1)) : null);

    const rawDirDeg = activePlume?.properties?.wind_direction_deg != null
      ? activePlume.properties.wind_direction_deg
      : selectedFire.wind_direction_deg;
    const windDirectionDeg = rawDirDeg != null ? Math.round(Number(rawDirDeg)) : null;

    // 4. Generate professional GIS downwind hazard corridor
    const plumeData = createDownwindDispersionPolygon(
      lat,
      lon,
      downwindBearing != null ? downwindBearing : 65.0,
      lengthKm,
      null,
      { speedKmh: windSpeedKmh, speedMs: windSpeedMs, directionDeg: windDirectionDeg },
      isDirectional
    );

    const windSpeedText = windSpeedKmh != null ? `${Math.round(windSpeedKmh)} km/h` : 'Unavailable';
    const windDirText = windDirectionDeg != null ? `${windDirectionDeg}°` : '—';

    return {
      ...plumeData,
      windSpeedKmh,
      windSpeedMs,
      windDirectionDeg,
      windSpeedText,
      windDirText
    };
  }, [selectedFire, activePlume]);


  const currentProvider = BASE_MAP_PROVIDERS[baseMap] || BASE_MAP_PROVIDERS.dark;

  return (
    <div className="w-full h-full relative">
      {/* Non-blocking tile loading indicator */}
      {isTileLoading && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[960] bg-[#090d14]/90 border border-cyan-500/40 text-cyan-300 text-[10px] font-mono px-3 py-1 rounded-full shadow-xl backdrop-blur-md flex items-center gap-2 pointer-events-none animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
          <span>LOADING MAP TILES...</span>
        </div>
      )}

      <MapContainer
        center={[21.5, 78.5]}
        zoom={5}
        className="w-full h-full z-0 bg-[#22242a]"
        zoomControl={false}
        attributionControl={true}
        preferCanvas={true}
      >
        {/* Strict Leaflet Pane Hierarchy (Section 10) */}
        <Pane name="tile-base-pane" style={{ zIndex: 200 }} />
        <Pane name="tile-reference-pane" style={{ zIndex: 210 }} />
        <Pane name="facilities-pane" style={{ zIndex: 410 }} />
        <Pane name="dispersion-pane" style={{ zIndex: 420 }} />
        <Pane name="exposure-pane" style={{ zIndex: 500 }} />
        <Pane name="thermal-events-pane" style={{ zIndex: 600 }} />
        <Pane name="selected-event-pane" style={{ zIndex: 650 }} />

        {/* Dynamic User-Selected Map Base Layer with Zero-Flicker Transition */}
        <BaseMapLayersManager
          currentProvider={currentProvider}
          setIsTileLoading={setIsTileLoading}
        />

        <MapCameraController selectedFire={selectedFire} />
        <PlumeBoundsFitter directionalPlume={directionalPlume} />

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
              pane="facilities-pane"
              positions={coords}
              pathOptions={{
                color: isSelectedFacility ? 'rgba(255, 255, 255, 0.85)' : 'rgba(148, 163, 184, 0.45)',
                weight: isSelectedFacility ? 1.5 : 1.0,
                dashArray: '4, 4',
                fillColor: isSelectedFacility ? 'rgba(255, 255, 255, 0.08)' : 'rgba(148, 163, 184, 0.03)',
                fillOpacity: isSelectedFacility ? 0.08 : 0.02
              }}
            >
              {showOsmContext && (
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
              )}
            </Polygon>
          );
        })}

        {/* Layer 2: Directional Downwind Atmospheric Dispersion Plume */}
        {showPlume && directionalPlume && (
          <>
            {/* 1. Outer Area (Translucent lower-opacity red/orange) */}
            <Polygon
              pane="dispersion-pane"
              positions={directionalPlume.outerPolygon || directionalPlume.leafletPositions}
              pathOptions={{
                color: activePlume?.properties?.stroke_color || (selectedFire?.is_emergency ? '#ef4444' : '#f97316'),
                weight: 1.2,
                dashArray: '4, 4',
                fillColor: activePlume?.properties?.fill_color || (selectedFire?.is_emergency ? '#ef4444' : '#ea580c'),
                fillOpacity: 0.12
              }}
            >
              <Popup>
                <div className="p-1.5 font-sans text-xs min-w-[230px]">
                  <div className="font-semibold text-cyan-300 flex items-center justify-between border-b border-white/10 pb-1">
                    <span>{activePlume?.properties?.status_message || activePlume?.properties?.hazard_tier || 'ESTIMATED DISPERSION'}</span>
                    <span className="text-[9px] font-mono px-1 rounded bg-white/10 text-slate-300">
                      {directionalPlume.isDirectional ? 'DIRECTIONAL CORRIDOR' : 'CALM / RADIAL'}
                    </span>
                  </div>
                  <div className="space-y-1 mt-1.5 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Wind Speed:</span>
                      <span className="text-white font-semibold">
                        {directionalPlume.windSpeedMs != null
                          ? `${directionalPlume.windSpeedMs} m/s (${directionalPlume.windSpeedText})`
                          : (directionalPlume.windSpeedText || 'Unavailable')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Direction:</span>
                      <span className="text-white font-semibold">
                        {directionalPlume.windDirectionDeg != null
                          ? `${directionalPlume.windDirectionDeg}° (from)`
                          : 'Unavailable'}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-white/[0.06]">
                      <span className="text-slate-400">Estimated Dispersion:</span>
                      <span className="text-amber-300 font-semibold">
                        {directionalPlume.lengthKm.toFixed(1)} km {directionalPlume.isDirectional ? 'downwind' : 'radius'}
                      </span>
                    </div>
                    {directionalPlume.isDirectional && directionalPlume.downwindBearing != null && (
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Downwind Azimuth:</span>
                        <span className="text-sky-300">{Math.round(directionalPlume.downwindBearing)}° (towards)</span>
                      </div>
                    )}
                  </div>
                  {activePlume?.properties?.uncertainty_description && (
                    <div className="mt-1.5 pt-1 border-t border-white/[0.06] text-[9.5px] text-slate-400 italic leading-snug">
                      {activePlume.properties.uncertainty_description}
                    </div>
                  )}
                  {activePlume?.properties?.community_exposure && (
                    <div className="mt-1.5 pt-1.5 border-t border-white/[0.1] text-[10.5px]">
                      <span className="text-rose-300 font-semibold">Potential Exposure: </span>
                      <span className="text-slate-200">
                        {activePlume.properties.community_exposure.affected_settlements_count} settlements, {activePlume.properties.community_exposure.affected_schools_count} schools
                      </span>
                    </div>
                  )}
                </div>
              </Popup>
            </Polygon>

            {/* 2. Medium Plume (Translucent intermediate density) */}
            {directionalPlume.mediumPolygon && (
              <Polygon
                pane="dispersion-pane"
                positions={directionalPlume.mediumPolygon}
                pathOptions={{
                  color: activePlume?.properties?.stroke_color || (selectedFire?.is_emergency ? '#ef4444' : '#f97316'),
                  weight: 0.8,
                  opacity: 0.45,
                  fillColor: activePlume?.properties?.fill_color || (selectedFire?.is_emergency ? '#ef4444' : '#ea580c'),
                  fillOpacity: 0.20
                }}
              />
            )}

            {/* 3. Core Plume (Stronger translucent red/orange near incident) */}
            {directionalPlume.corePolygon && (
              <Polygon
                pane="dispersion-pane"
                positions={directionalPlume.corePolygon}
                pathOptions={{
                  color: selectedFire?.is_emergency ? '#ef4444' : '#dc2626',
                  weight: 1.0,
                  opacity: 0.75,
                  fillColor: selectedFire?.is_emergency ? '#ef4444' : '#dc2626',
                  fillOpacity: 0.35
                }}
              />
            )}

            {/* 4. Centerline: Subtle brighter line */}
            {directionalPlume.centerline && (
              <Polyline
                pane="dispersion-pane"
                positions={directionalPlume.centerline}
                pathOptions={{
                  color: '#fdba74',
                  weight: 1.5,
                  dashArray: '5, 5',
                  opacity: 0.75
                }}
              />
            )}

            {/* 5. Wind Arrow & Directional Indicator near incident */}
            {directionalPlume.isDirectional && directionalPlume.windIndicatorPosition && (
              <Marker
                pane="dispersion-pane"
                position={directionalPlume.windIndicatorPosition}
                interactive={false}
                icon={L.divIcon({
                  className: 'gis-wind-indicator-marker',
                  html: `
                    <div style="display: inline-flex; align-items: center; gap: 5px; background: rgba(10, 17, 27, 0.90); border: 1px solid rgba(56, 189, 248, 0.45); padding: 2px 7px; border-radius: 4px; box-shadow: 0 2px 10px rgba(0,0,0,0.6); pointer-events: none; white-space: nowrap; transform: translate(-50%, -130%); font-family: ui-monospace, monospace; font-size: 9.5px; color: #f1f5f9;">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(${directionalPlume.downwindBearing}deg); transform-origin: center; display: inline-block;">
                        <line x1="12" y1="19" x2="12" y2="5"></line>
                        <polyline points="5 12 12 5 19 12"></polyline>
                      </svg>
                      <span style="color: #38bdf8; font-weight: 700;">WIND</span>
                      <span>${directionalPlume.windSpeedText}</span>
                      <span style="color: #64748b;">•</span>
                      <span>${directionalPlume.windDirText}</span>
                    </div>
                  `,
                  iconSize: [120, 24],
                  iconAnchor: [60, 12]
                })}
              />
            )}

            {/* 6. Map Label: ESTIMATED DOWNWIND DISPERSION */}
            {directionalPlume.labelPosition && (
              <Marker
                pane="dispersion-pane"
                position={directionalPlume.labelPosition}
                interactive={false}
                icon={L.divIcon({
                  className: 'gis-dispersion-badge-marker',
                  html: `
                    <div style="display: inline-block; background: rgba(10, 17, 27, 0.92); border: 1px solid rgba(249, 115, 22, 0.45); border-radius: 4px; padding: 2.5px 7px; box-shadow: 0 2px 10px rgba(0,0,0,0.6); pointer-events: none; white-space: nowrap; font-family: ui-monospace, monospace; transform: translate(-50%, -50%);">
                      <div style="color: #fb923c; font-size: 8.5px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;">
                        ESTIMATED DOWNWIND DISPERSION
                      </div>
                      <div style="color: #cbd5e1; font-size: 9.5px; margin-top: 1px;">
                        Radius: <span style="color: #fde047; font-weight: 600;">${directionalPlume.lengthKm.toFixed(1)} km</span>
                        ${directionalPlume.isDirectional && directionalPlume.downwindBearing != null ? ` • Downwind: <span style="color: #7dd3fc; font-weight: 600;">${Math.round(directionalPlume.downwindBearing)}°</span>` : ''}
                      </div>
                    </div>
                  `,
                  iconSize: [170, 32],
                  iconAnchor: [85, 16]
                })}
              />
            )}
          </>
        )}

        {/* Layer 3: Sensitive Locations within Estimated Exposure Corridor (Rendered ONLY when an event is selected) */}
        {showExposure && selectedFire && corridorReceptors.map((rec) => {
          const type = rec.type;
          const lat = Number(rec.latitude);
          const lon = Number(rec.longitude);
          if (isNaN(lat) || isNaN(lon)) return null;

          return (
            <Marker
              key={rec.id || `${lat}-${lon}`}
              pane="exposure-pane"
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

        {/* Layer 3.5: Optional Supporting Satellite Evidence Layers (Rendered ONLY when real data is available) */}
        {showOpticalContext && selectedFire && (() => {
          const lat = Number(selectedFire.latitude);
          const lon = Number(selectedFire.longitude);
          if (isNaN(lat) || isNaN(lon)) return null;

          const supporting = selectedFire?.satellite_evidence?.supporting || [];
          const opticalScene = supporting.find(s => 
            (s.source === 'Landsat' || s.source === 'Sentinel-2') && s.available
          );

          if (!opticalScene) return null;

          // 1.8km x 1.8km context bounding box centered on incident coordinate
          const deltaLat = 0.008;
          const deltaLon = 0.008 / Math.cos((lat * Math.PI) / 180);
          const bounds = [
            [lat - deltaLat, lon - deltaLon],
            [lat - deltaLat, lon + deltaLon],
            [lat + deltaLat, lon + deltaLon],
            [lat + deltaLat, lon - deltaLon],
            [lat - deltaLat, lon - deltaLon]
          ];

          return (
            <React.Fragment key={`sat-optical-${selectedFire.fire_id}`}>
              <Polygon
                positions={bounds}
                pathOptions={{
                  color: '#10b981',
                  weight: 1.2,
                  dashArray: '5, 5',
                  opacity: 0.8,
                  fillColor: '#10b981',
                  fillOpacity: 0.05
                }}
              />
              <Marker
                position={[lat + deltaLat, lon - deltaLon]}
                interactive={false}
                icon={L.divIcon({
                  className: 'gis-optical-context-tag',
                  html: `
                    <div style="background: rgba(6, 78, 59, 0.92); border: 1px solid rgba(52, 211, 153, 0.5); padding: 1.5px 6px; border-radius: 3px; font-family: ui-monospace, monospace; font-size: 8.5px; color: #a7f3d0; white-space: nowrap; transform: translate(0, -100%); pointer-events: none; box-shadow: 0 2px 8px rgba(0,0,0,0.5);">
                      ${opticalScene.platform || 'S2 / Landsat'} (${opticalScene.resolution || '10-30m'}) • Optical Context
                    </div>
                  `,
                  iconSize: [160, 18],
                  iconAnchor: [0, 0]
                })}
              />
            </React.Fragment>
          );
        })()}

        {showModisContext && selectedFire && (() => {
          const lat = Number(selectedFire.latitude);
          const lon = Number(selectedFire.longitude);
          if (isNaN(lat) || isNaN(lon)) return null;

          const supporting = selectedFire?.satellite_evidence?.supporting || [];
          const modisObs = supporting.find(s => 
            s.source === 'MODIS' && s.available
          );

          if (!modisObs) return null;

          // 1.0km x 1.0km thermal pixel footprint centered on coordinate
          const deltaLat = 0.0045;
          const deltaLon = 0.0045 / Math.cos((lat * Math.PI) / 180);
          const bounds = [
            [lat - deltaLat, lon - deltaLon],
            [lat - deltaLat, lon + deltaLon],
            [lat + deltaLat, lon + deltaLon],
            [lat + deltaLat, lon - deltaLon],
            [lat - deltaLat, lon - deltaLon]
          ];

          return (
            <React.Fragment key={`sat-modis-${selectedFire.fire_id}`}>
              <Polygon
                positions={bounds}
                pathOptions={{
                  color: '#f59e0b',
                  weight: 1.2,
                  dashArray: '4, 4',
                  opacity: 0.8,
                  fillColor: '#f59e0b',
                  fillOpacity: 0.07
                }}
              />
              <Marker
                position={[lat - deltaLat, lon - deltaLon]}
                interactive={false}
                icon={L.divIcon({
                  className: 'gis-modis-context-tag',
                  html: `
                    <div style="background: rgba(120, 53, 15, 0.92); border: 1px solid rgba(251, 191, 36, 0.5); padding: 1.5px 6px; border-radius: 3px; font-family: ui-monospace, monospace; font-size: 8.5px; color: #fde68a; white-space: nowrap; transform: translate(0, 4px); pointer-events: none; box-shadow: 0 2px 8px rgba(0,0,0,0.5);">
                      MODIS 1km Thermal Context Pixel
                    </div>
                  `,
                  iconSize: [160, 18],
                  iconAnchor: [0, 0]
                })}
              />
            </React.Fragment>
          );
        })()}

        {/* Layer 4: Thermal Hotspot Markers */}
        {showThermalEvents && fires.map((fire, idx) => {
          const isSelected = selectedFire?.fire_id === fire.fire_id;
          const color = getClassificationColor(fire);

          return (
            <Marker
              key={`${fire.fire_id || fire.event_id || 'fire'}-${fire.latitude}-${fire.longitude}-${idx}`}
              pane={isSelected ? "selected-event-pane" : "thermal-events-pane"}
              zIndexOffset={isSelected ? 1000 : 0}
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
      {!hideFloatingSelector && (
        <div 
          ref={layerControlRef}
          className={`absolute top-3 ${selectedFire ? 'right-3 md:right-[410px]' : 'right-3'} z-[950] font-sans select-none transition-all duration-300`}
        >
          {/* Mobile Compact Floating Button (When collapsed on mobile screens) */}
          {!layersOpen && (
            <button
              onClick={() => setLayersOpen(true)}
              className="sm:hidden w-10 h-10 rounded-xl glass-panel shadow-2xl flex items-center justify-center border border-white/[0.15] bg-[#090d14]/95 text-slate-100 hover:text-white cursor-pointer active:scale-95 transition-all"
              title="Open Map Layers"
            >
              <span className="text-base leading-none">🗺</span>
            </button>
          )}

          <div className={`glass-panel rounded-xl shadow-2xl overflow-hidden border border-white/[0.12] bg-[#090d14]/95 backdrop-blur-md text-slate-100 w-[260px] sm:w-[280px] max-w-[calc(100vw-24px)] ${!layersOpen ? 'hidden sm:block' : 'block'}`}>
            <button
              onClick={() => setLayersOpen(!layersOpen)}
              className="w-full px-3 py-2 flex items-center justify-between text-xs font-semibold text-slate-200 hover:text-white cursor-pointer transition-colors bg-white/[0.03] hover:bg-white/[0.06]"
              title="Toggle Map Layers"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm leading-none">🗺</span>
                <span className="font-mono tracking-wider text-[11px] uppercase font-bold text-slate-200">Map Layers</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/50 px-1.5 py-0.5 rounded">
                  {currentProvider.name.split(' ')[0]}
                </span>
                {layersOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
              </div>
            </button>

            {layersOpen && (
              <div className="p-3 border-t border-white/[0.08] space-y-3.5 text-[11px] max-h-[calc(100vh-140px)] overflow-y-auto">
                {/* BASE MAP SECTION */}
                <div>
                  <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span className="text-cyan-400 font-bold">Base Map</span>
                    <span className="text-[9px] text-slate-500 font-mono">1 active</span>
                  </div>
                  <div className="space-y-1">
                    {Object.values(BASE_MAP_PROVIDERS).map((p) => {
                      const isSelected = baseMap === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSelectBaseMap(p.id)}
                          className={`w-full text-left p-2 rounded-lg transition-all flex items-start gap-2.5 cursor-pointer border ${
                            isSelected
                              ? 'bg-cyan-950/50 border-cyan-500/60 text-white shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                              : 'bg-white/[0.02] border-white/[0.05] text-slate-300 hover:bg-white/[0.06] hover:text-white'
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border transition-all ${
                              isSelected ? 'border-cyan-400 bg-cyan-500' : 'border-slate-600 bg-transparent'
                            }`}>
                              {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-slate-950"></span>}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className={`font-medium ${isSelected ? 'text-cyan-300 font-semibold' : 'text-slate-200'}`}>
                                {p.name}
                              </span>
                              {isSelected && (
                                <span className="text-[8.5px] font-mono text-cyan-300 px-1 py-0.2 rounded bg-cyan-900/60 border border-cyan-700/60 shrink-0">
                                  ACTIVE
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 leading-tight mt-0.5 truncate">
                              {p.tagline}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ANALYSIS OVERLAYS SECTION */}
                <div className="pt-2.5 border-t border-white/[0.08]">
                  <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span className="text-orange-400 font-bold">Analysis Overlays</span>
                    <span className="text-[9px] text-slate-500 font-mono">Independent</span>
                  </div>
                  <div className="space-y-1.5">
                    <label className="flex items-center justify-between p-1.5 rounded hover:bg-white/[0.04] cursor-pointer text-slate-300 hover:text-white transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.8)]"></span>
                        <span className="font-medium">Thermal Events</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={showThermalEvents}
                        onChange={(e) => setShowThermalEvents(e.target.checked)}
                        className="rounded accent-orange-500 cursor-pointer w-3.5 h-3.5"
                      />
                    </label>

                    <label className="flex items-center justify-between p-1.5 rounded hover:bg-white/[0.04] cursor-pointer text-slate-300 hover:text-white transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-sm bg-sky-500 border border-sky-400/60"></span>
                        <span className="font-medium">Industrial Facilities</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={showFacilities}
                        onChange={(e) => setShowFacilities(e.target.checked)}
                        className="rounded accent-sky-500 cursor-pointer w-3.5 h-3.5"
                      />
                    </label>

                    <label className="flex items-center justify-between p-1.5 rounded hover:bg-white/[0.04] cursor-pointer text-slate-300 hover:text-white transition-colors">
                      <div className="flex items-center gap-2">
                        <Wind className="w-3.5 h-3.5 text-red-400" />
                        <span className="font-medium">Estimated Dispersion</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={showPlume}
                        onChange={(e) => setShowPlume(e.target.checked)}
                        className="rounded accent-red-500 cursor-pointer w-3.5 h-3.5"
                      />
                    </label>

                    <label className="flex items-center justify-between p-1.5 rounded hover:bg-white/[0.04] cursor-pointer text-slate-300 hover:text-white transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]"></span>
                        <span className="font-medium">Community Exposure</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={showExposure}
                        onChange={(e) => setShowExposure(e.target.checked)}
                        className="rounded accent-cyan-400 cursor-pointer w-3.5 h-3.5"
                      />
                    </label>

                    <label className="flex items-center justify-between p-1.5 rounded hover:bg-white/[0.04] cursor-pointer text-slate-300 hover:text-white transition-colors">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-amber-400" />
                        <span className="font-medium">OSM Context</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={showOsmContext}
                        onChange={(e) => setShowOsmContext(e.target.checked)}
                        className="rounded accent-amber-400 cursor-pointer w-3.5 h-3.5"
                      />
                    </label>
                  </div>
                </div>

                {/* SATELLITE EVIDENCE SECTION */}
                <div className="pt-2.5 border-t border-white/[0.08]">
                  <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span className="text-cyan-400 font-bold">Satellite Evidence</span>
                    <span className="text-[9px] text-slate-500 font-mono">Multi-Sensor</span>
                  </div>
                  <div className="space-y-1.5">
                    <label className="flex items-center justify-between p-1.5 rounded hover:bg-white/[0.04] cursor-pointer text-slate-300 hover:text-white transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.8)]"></span>
                        <span className="font-medium">VIIRS Detection (Primary)</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={showThermalEvents}
                        onChange={(e) => setShowThermalEvents(e.target.checked)}
                        className="rounded accent-orange-500 cursor-pointer w-3.5 h-3.5"
                      />
                    </label>

                    <label className="flex items-center justify-between p-1.5 rounded hover:bg-white/[0.04] cursor-pointer text-slate-300 hover:text-white transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 border border-emerald-300/60"></span>
                        <span className="font-medium">Landsat / Sentinel-2 Context</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={showOpticalContext}
                        onChange={(e) => setInternalOptical(e.target.checked)}
                        className="rounded accent-emerald-500 cursor-pointer w-3.5 h-3.5"
                      />
                    </label>

                    <label className="flex items-center justify-between p-1.5 rounded hover:bg-white/[0.04] cursor-pointer text-slate-300 hover:text-white transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-300/60"></span>
                        <span className="font-medium">MODIS Thermal Context</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={showModisContext}
                        onChange={(e) => setInternalModis(e.target.checked)}
                        className="rounded accent-amber-500 cursor-pointer w-3.5 h-3.5"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
