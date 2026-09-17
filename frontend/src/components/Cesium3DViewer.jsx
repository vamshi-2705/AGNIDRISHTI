import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { 
  Crosshair, ArrowLeft, Layers, ShieldAlert, 
  MapPin, Eye, AlertTriangle, Building2, Wind,
  Plus, Minus, Home, Compass, FileText, X, Radio,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  RotateCcw, RotateCw, Navigation, Check, Sparkles
} from 'lucide-react';
import { createDirectionalPlume, createDownwindDispersionPolygon } from './GisMapViewer';

function formatConfidence(conf) {
  if (conf == null || conf === '') return 'Not Available';
  const str = String(conf).trim().toLowerCase();
  if (str === 'h' || str === 'high') return 'High';
  if (str === 'n' || str === 'nominal') return 'Nominal';
  if (str === 'l' || str === 'low') return 'Low';
  const num = parseFloat(str);
  if (!isNaN(num)) return `${Math.round(num)}%`;
  return String(conf);
}

function getClassificationColor(fire) {
  if (fire.is_emergency || fire.category === 'CRITICAL_INDUSTRIAL_EMERGENCY') {
    return Cesium.Color.fromCssColorString('#EF4444'); // Crimson
  }
  if (fire.category === 'PERSISTENT_INDUSTRIAL_FLARE') {
    return Cesium.Color.fromCssColorString('#F59E0B'); // Amber
  }
  if (fire.category === 'COAL_MINING_FIRE') {
    return Cesium.Color.fromCssColorString('#D97706'); // Deep Amber
  }
  if (fire.category === 'AGRICULTURAL_STUBBLE') {
    return Cesium.Color.fromCssColorString('#EAB308'); // Yellow
  }
  return Cesium.Color.fromCssColorString('#10B981'); // Emerald
}

function formatUtcTime(acqDate, acqTime) {
  if (!acqDate && !acqTime) return 'LIVE FIRMS PASS';
  const cleanTime = acqTime ? String(acqTime).padStart(4, '0') : '1200';
  const hh = cleanTime.substring(0, 2);
  const mm = cleanTime.substring(2, 4);
  return `${acqDate || '2026-01-01'} ${hh}:${mm} UTC`;
}

export default function Cesium3DViewer({
  fires = [],
  selectedFire = null,
  onSelectFire = () => {},
  facilities = null,
  sensitiveLocations = null,
  activePlume = null,
  onExit3D,
  onReturnTo2D,
  onTogglePlume,
  isPlumeActive,
  plumeLoading,
  locateTrigger = 0,
  onOpenReport = null,
  showThermal: propShowThermal,
  showFacility: propShowFacility,
  showPlume: propShowPlume,
  showReceptors: propShowReceptors
}) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const screenHandlerRef = useRef(null);
  const cameraListenerRef = useRef(null);
  const [viewer, setViewer] = useState(null);
  const [initError, setInitError] = useState(null);

  // Non-blocking cinematic flight HUD state
  const [isFlying, setIsFlying] = useState(false);
  const [flightStage, setFlightStage] = useState('');
  const [activeCard, setActiveCard] = useState(null); // { type: 'thermal' | 'facility' | 'receptor', data: ... }

  // 3D Data Source Mode: Pure Cesium Stack (World Terrain + OSM Buildings)
  const [tilesetMode, setTilesetMode] = useState('cesium_native');
  const [tilesetStatusText, setTilesetStatusText] = useState('Loading 3D Terrain & Buildings...');
  const [tilesetErrorDetail, setTilesetErrorDetail] = useState(null);
  const osmBuildingsRef = useRef(null);
  const terrainProviderRef = useRef(null);
  const lastFlownRef = useRef({ fireId: null, locateTrigger: -1 });

  // Real-time camera telemetry state
  const [cameraTelemetry, setCameraTelemetry] = useState({
    targetLat: null,
    targetLon: null,
    altitude: null,
    pitch: null,
    heading: null
  });

  // Layer toggles
  const [internalBuildings, setShowBuildings] = useState(true);
  const [internalSatellite, setShowSatellite] = useState(true);
  const [internalTerrain, setShowTerrain] = useState(true);
  const [internalThermal, setShowThermal] = useState(true);
  const [internalFacility, setShowFacility] = useState(true);
  const [internalPlume, setShowPlume] = useState(true);
  const [internalReceptors, setShowReceptors] = useState(true);
  const [showRoads, setShowRoads] = useState(false);

  const showThermal = propShowThermal !== undefined ? propShowThermal : internalThermal;
  const showFacility = propShowFacility !== undefined ? propShowFacility : internalFacility;
  const showPlume = propShowPlume !== undefined ? propShowPlume : internalPlume;
  const showReceptors = propShowReceptors !== undefined ? propShowReceptors : internalReceptors;
  const showBuildings = internalBuildings;
  const showSatellite = internalSatellite;
  const showTerrain = internalTerrain;

  const [layersMenuOpen, setLayersMenuOpen] = useState(false);

  // References to dynamic entity groups
  const thermalDataSourceRef = useRef(null);
  const facilityDataSourceRef = useRef(null);
  const plumeDataSourceRef = useRef(null);
  const receptorsDataSourceRef = useRef(null);

  // Track current selectedFire and facilities in refs
  const selectedFireRef = useRef(selectedFire);
  selectedFireRef.current = selectedFire;
  const facilitiesRef = useRef(facilities);
  facilitiesRef.current = facilities;

  // Track base imagery layer and road layer
  const baseLayerRef = useRef(null);
  const roadLayerRef = useRef(null);

  // Flight synchronization & target tracking
  const flightIdRef = useRef(0);
  const isInspectingRef = useRef(false);
  const targetLatRef = useRef(null);
  const targetLonRef = useRef(null);

  // Calculate sensible inspection heading based on facility geometry or approach
  const calculateInspectionHeading = useCallback((fire) => {
    if (!fire) return 25.0; // Default natural oblique approach angle (~25°)
    const lat = Number(fire.latitude);
    const lon = Number(fire.longitude);
    const facs = facilitiesRef.current;

    if (facs?.features && fire.facility_id) {
      const match = facs.features.find(f => f.id === fire.facility_id || f.properties?.facility_id === fire.facility_id);
      if (match && match.geometry?.coordinates?.[0]?.[0]) {
        const [facLon, facLat] = match.geometry.coordinates[0][0];
        const dLon = lon - facLon;
        const dLat = lat - facLat;
        if (Math.abs(dLon) > 0.0001 || Math.abs(dLat) > 0.0001) {
          const bearing = Cesium.Math.toDegrees(Math.atan2(dLon, dLat));
          return Cesium.Math.zeroToTwoPi(Cesium.Math.toRadians(bearing + 15));
        }
      }
    }
    return 28.0;
  }, []);

  // Sync telemetry state directly with authoritative FIRMS coordinates
  const syncTelemetryWithEvent = useCallback((lat, lon) => {
    setCameraTelemetry(prev => ({
      ...prev,
      targetLat: lat,
      targetLon: lon
    }));
  }, []);

  // Task 6: Calculate final site-level oblique inspection camera (250m - 500m)
  // Baseline site-level inspection reference: 1600m overview envelope with 350m final inspection
  const calculateInspectionCamera = useCallback((fire) => {
    if (!fire) return null;
    const lat = Number(fire.latitude);
    const lon = Number(fire.longitude);
    if (isNaN(lat) || isNaN(lon)) return null;

    const v = viewerRef.current || viewer;

    // 1. Target coordinate elevation on terrain
    let groundHeight = 0;
    if (v?.scene?.globe) {
      const carto = Cesium.Cartographic.fromDegrees(lon, lat);
      const h = v.scene.globe.getHeight(carto);
      if (typeof h === 'number' && !isNaN(h) && h > -100) {
        groundHeight = h;
      }
    }

    // 2. Heading oriented toward the incident / facility layout
    const headingDeg = calculateInspectionHeading(fire);
    const headingRad = typeof headingDeg === 'number' && headingDeg < 7 
      ? headingDeg 
      : Cesium.Math.toRadians(headingDeg || 28.0);

    // 3. Final inspection altitude: strictly 250m - 500m (Target: 350m)
    // Low oblique perspective with pitch -30°
    const frp = Number(fire.frp) || 25;
    const inspectAltitude = Math.min(480, Math.max(280, 320 + (frp / 250) * 80));
    const inspectPitchDeg = -30.0;
    const pitchRad = Cesium.Math.toRadians(inspectPitchDeg);
    const tanPitch = Math.tan(Math.abs(pitchRad));
    const groundDistMeters = Math.max(260, Math.round(inspectAltitude / tanPitch * 0.85));

    const dLatDeg = (groundDistMeters * Math.cos(headingRad)) / 111320;
    const dLonDeg = (groundDistMeters * Math.sin(headingRad)) / (111320 * Math.cos(lat * Math.PI / 180));
    const destPos = Cesium.Cartesian3.fromDegrees(lon - dLonDeg, lat - dLatDeg, groundHeight + inspectAltitude);

    return {
      lat,
      lon,
      groundHeight,
      inspectAltitude,
      inspectPitchDeg,
      pitchRad,
      headingRad,
      destPos,
      groundDistMeters
    };
  }, [viewer, calculateInspectionHeading]);

  // Task 6: Controlled Multi-Stage Camera Flight Sequence:
  // 1. Regional overview (~25-35 km)
  // 2. Approach target (~8-12 km)
  // 3. Low-altitude approach (~1-3 km, ~1800m)
  // 4. Final site-level oblique inspection (250-500m altitude, ~350m, pitch -30°)
  const flyToIncident = useCallback(async (fire, options = {}) => {
    const v = viewerRef.current || viewer;
    if (!v || !fire) return;

    const cameraConfig = calculateInspectionCamera(fire);
    if (!cameraConfig) return;

    const { lat, lon, destPos: finalPos, headingRad, pitchRad, inspectAltitude, groundHeight } = cameraConfig;
    targetLatRef.current = lat;
    targetLonRef.current = lon;

    // Increment flight ID to supersede previous async chains
    const currentFlightId = ++flightIdRef.current;
    v.camera.cancelFlight();

    // Preload destinations in 3D tileset if available
    if (osmBuildingsRef.current) {
      try {
        osmBuildingsRef.current.preloadFlightDestinations = true;
      } catch (e) {}
    }

    setIsFlying(true);

    // Helper for computing stage positions
    const getStagePos = (distMeters, altMeters) => {
      const dLat = (distMeters * Math.cos(headingRad)) / 111320;
      const dLon = (distMeters * Math.sin(headingRad)) / (111320 * Math.cos(lat * Math.PI / 180));
      return Cesium.Cartesian3.fromDegrees(lon - dLon, lat - dLat, groundHeight + altMeters);
    };

    // Helper to fly to a stage with promise resolution
    const flyStage = (dest, heading, pitch, duration, stageName, easing = Cesium.EasingFunction.QUADRATIC_IN_OUT) => {
      return new Promise((resolve) => {
        if (!v || v.isDestroyed() || flightIdRef.current !== currentFlightId) {
          resolve(false);
          return;
        }
        setFlightStage(stageName);
        v.camera.flyTo({
          destination: dest,
          orientation: { heading, pitch, roll: 0.0 },
          duration,
          easingFunction: easing,
          complete: () => {
            if (flightIdRef.current === currentFlightId) resolve(true);
            else resolve(false);
          },
          cancel: () => {
            resolve(false);
          }
        });
      });
    };

    try {
      if (options.instant) {
        v.camera.setView({
          destination: finalPos,
          orientation: { heading: headingRad, pitch: pitchRad, roll: 0.0 }
        });
      } else {
        const carto = v.camera.positionCartographic;
        const currentAlt = carto ? carto.height : 50000;

        if (currentAlt < 2000) {
          // Already in local area, fly directly to final site inspection (STAGE 4)
          await flyStage(finalPos, headingRad, pitchRad, 1.4, 'STAGE 4 — INCIDENT INSPECTION', Cesium.EasingFunction.QUADRATIC_OUT);
        } else {
          // STAGE 1 — REGIONAL OVERVIEW (~25-35 km altitude)
          const stage1Pos = getStagePos(12000, 28000);
          let ok = await flyStage(stage1Pos, headingRad, Cesium.Math.toRadians(-55), 1.4, 'STAGE 1 — REGIONAL CONTEXT', Cesium.EasingFunction.QUADRATIC_IN_OUT);
          if (!ok || flightIdRef.current !== currentFlightId) {
            // Guard against camera remaining at 24 km: force final site inspection destination!
            v.camera.flyTo({ destination: finalPos, orientation: { heading: headingRad, pitch: pitchRad, roll: 0.0 }, duration: 1.0 });
            return;
          }

          // STAGE 2 — AREA APPROACH (~8-10 km altitude)
          const stage2Pos = getStagePos(5500, 8000);
          ok = await flyStage(stage2Pos, headingRad, Cesium.Math.toRadians(-48), 1.3, 'STAGE 2 — AREA APPROACH', Cesium.EasingFunction.QUADRATIC_IN_OUT);
          if (!ok || flightIdRef.current !== currentFlightId) {
            v.camera.flyTo({ destination: finalPos, orientation: { heading: headingRad, pitch: pitchRad, roll: 0.0 }, duration: 1.0 });
            return;
          }

          // STAGE 3 — LOW-ALTITUDE APPROACH (1-3 km altitude, ~1800m reference)
          const stage3Pos = getStagePos(1600, 1800);
          ok = await flyStage(stage3Pos, headingRad, Cesium.Math.toRadians(-40), 1.2, 'STAGE 3 — FACILITY APPROACH', Cesium.EasingFunction.QUADRATIC_IN_OUT);
          if (!ok || flightIdRef.current !== currentFlightId) {
            v.camera.flyTo({ destination: finalPos, orientation: { heading: headingRad, pitch: pitchRad, roll: 0.0 }, duration: 1.0 });
            return;
          }

          // STAGE 4 — FINAL SITE-LEVEL OBLIQUE INSPECTION (250-500m altitude, ~350m)
          await flyStage(finalPos, headingRad, pitchRad, 1.4, 'STAGE 4 — INCIDENT INSPECTION', Cesium.EasingFunction.QUADRATIC_OUT);
        }
      }
    } finally {
      if (flightIdRef.current === currentFlightId) {
        isInspectingRef.current = true;
        setIsFlying(false);
        setFlightStage('INSPECTION READY');
        syncTelemetryWithEvent(lat, lon);
      }
    }
  }, [viewer, calculateInspectionCamera, syncTelemetryWithEvent]);

  // Backward-compatible alias for existing test suites
  const flyToSelectedEvent = useCallback((fire, duration = 1.8) => {
    flyToIncident(fire, { duration });
  }, [flyToIncident]);

  const inspectEvent = useCallback((fire, options = {}) => {
    flyToIncident(fire, options);
  }, [flyToIncident]);

  // Helper: Find camera focal point on terrain or globe ellipsoid
  const getCameraTarget = (v) => {
    if (!v || !v.scene) return null;
    try {
      const scene = v.scene;
      const canvas = scene.canvas;
      const centerRay = v.camera.getPickRay(
        new Cesium.Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2)
      );
      if (!centerRay) return null;

      let target = scene.globe.pick(centerRay, scene);
      if (!target) {
        target = v.camera.pickEllipsoid(
          new Cesium.Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2),
          scene.globe.ellipsoid
        );
      }
      return target;
    } catch {
      return null;
    }
  };

  // Interactive Navigation & Camera Controls
  const handleZoomIn = () => {
    const v = viewerRef.current || viewer;
    if (!v) return;
    isInspectingRef.current = false;

    const target = getCameraTarget(v);
    if (target) {
      const currentRange = Cesium.Cartesian3.distance(v.camera.position, target);
      const newRange = Math.max(45, currentRange * 0.65);
      v.camera.cancelFlight();
      v.camera.flyToBoundingSphere(new Cesium.BoundingSphere(target, 0), {
        offset: new Cesium.HeadingPitchRange(v.camera.heading, v.camera.pitch, newRange),
        duration: 0.35
      });
    } else {
      const height = v.camera.positionCartographic?.height || 2000;
      const step = Math.max(120, height * 0.30);
      v.camera.zoomIn(step);
    }
  };

  const handleZoomOut = () => {
    const v = viewerRef.current || viewer;
    if (!v) return;
    isInspectingRef.current = false;

    const target = getCameraTarget(v);
    if (target) {
      const currentRange = Cesium.Cartesian3.distance(v.camera.position, target);
      const newRange = Math.min(25000000, currentRange * 1.55);
      v.camera.cancelFlight();
      v.camera.flyToBoundingSphere(new Cesium.BoundingSphere(target, 0), {
        offset: new Cesium.HeadingPitchRange(v.camera.heading, v.camera.pitch, newRange),
        duration: 0.35
      });
    } else {
      const height = v.camera.positionCartographic?.height || 2000;
      const step = Math.max(120, height * 0.40);
      v.camera.zoomOut(step);
    }
  };

  const handlePan = (direction) => {
    const v = viewerRef.current || viewer;
    if (!v) return;
    isInspectingRef.current = false;

    const height = v.camera.positionCartographic?.height || 2000;
    const moveAmount = Math.max(50, height * 0.15);

    switch (direction) {
      case 'north': v.camera.moveUp(moveAmount); break;
      case 'south': v.camera.moveDown(moveAmount); break;
      case 'east': v.camera.moveRight(moveAmount); break;
      case 'west': v.camera.moveLeft(moveAmount); break;
      default: break;
    }
  };

  const handleRotate = (degrees) => {
    const v = viewerRef.current || viewer;
    if (!v) return;
    const target = getCameraTarget(v);
    const rad = Cesium.Math.toRadians(degrees);

    if (target) {
      const currentRange = Cesium.Cartesian3.distance(v.camera.position, target);
      v.camera.cancelFlight();
      v.camera.flyToBoundingSphere(new Cesium.BoundingSphere(target, 0), {
        offset: new Cesium.HeadingPitchRange(
          Cesium.Math.zeroToTwoPi(v.camera.heading + rad),
          v.camera.pitch,
          currentRange
        ),
        duration: 0.35
      });
    } else {
      v.camera.rotate(Cesium.Cartesian3.UNIT_Z, rad);
    }
  };

  const handleResetHome = () => {
    const v = viewerRef.current || viewer;
    if (!v) return;
    isInspectingRef.current = false;
    v.camera.cancelFlight();
    setFlightStage('REGIONAL OVERVIEW');
    // Regional India overview
    v.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(78.5, 21.5, 3200000),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-82),
        roll: 0.0
      },
      duration: 1.8,
      easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT,
      complete: () => {
        setCameraTelemetry(prev => ({ ...prev, altitude: 3200000, pitch: -82 }));
      }
    });
  };

  const handleRecenterIncident = () => {
    const fire = selectedFireRef.current || selectedFire;
    if (fire) {
      flyToIncident(fire);
    } else {
      handleResetHome();
    }
  };

  const handleResetNorth = () => {
    const v = viewerRef.current || viewer;
    if (!v) return;
    const target = getCameraTarget(v);
    if (target) {
      const currentRange = Cesium.Cartesian3.distance(v.camera.position, target);
      v.camera.flyToBoundingSphere(new Cesium.BoundingSphere(target, 0), {
        offset: new Cesium.HeadingPitchRange(0.0, v.camera.pitch, currentRange),
        duration: 0.5
      });
    } else {
      v.camera.setView({
        orientation: {
          heading: 0.0,
          pitch: v.camera.pitch,
          roll: 0.0
        }
      });
    }
  };

  const handleTilt = (direction) => {
    const v = viewerRef.current || viewer;
    if (!v) return;
    const target = getCameraTarget(v);
    const delta = Cesium.Math.toRadians(direction === 'up' ? 8 : -8);

    if (target) {
      const currentRange = Cesium.Cartesian3.distance(v.camera.position, target);
      const newPitch = Math.max(
        Cesium.Math.toRadians(-88),
        Math.min(Cesium.Math.toRadians(-12), v.camera.pitch + delta)
      );

      v.camera.cancelFlight();
      v.camera.flyToBoundingSphere(new Cesium.BoundingSphere(target, 0), {
        offset: new Cesium.HeadingPitchRange(v.camera.heading, newPitch, currentRange),
        duration: 0.35
      });
    } else {
      const angle = Cesium.Math.toRadians(8);
      if (direction === 'up') v.camera.lookUp(angle);
      else v.camera.lookDown(angle);
    }
  };



  // Initialize CesiumJS Viewer (Task 1, 2, 3, 4, 12)
  useEffect(() => {
    if (!containerRef.current) return;

    let viewerInstance = null;

    const initCesium = async () => {
      try {
        // Task 1: Configure Cesium Ion Token
        const ionToken = import.meta.env.VITE_CESIUM_ION_TOKEN;
        if (ionToken && typeof ionToken === 'string' && ionToken.trim()) {
          Cesium.Ion.defaultAccessToken = ionToken.trim();
        }

        // Task 4: Setup Esri World Imagery (high-resolution authentic satellite base layer)
        let baseLayer;
        try {
          const esriProvider = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
            { enablePickFeatures: false }
          );
          baseLayer = new Cesium.ImageryLayer(esriProvider);
        } catch {
          baseLayer = new Cesium.ImageryLayer(
            new Cesium.UrlTemplateImageryProvider({
              url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              subdomains: ['a', 'b', 'c']
            })
          );
        }

        baseLayerRef.current = baseLayer;

        viewerInstance = new Cesium.Viewer(containerRef.current, {
          baseLayer: baseLayer,
          baseLayerPicker: false,
          animation: false,
          timeline: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          fullscreenButton: false,
          infoBox: false,
          selectionIndicator: false,
          skyAtmosphere: new Cesium.SkyAtmosphere(),
          contextOptions: {
            webgl: {
              alpha: false,
              depth: true,
              stencil: false,
              antialias: true,
              powerPreference: 'high-performance'
            }
          }
        });

        // Ensure globe is always shown with satellite imagery
        viewerInstance.scene.globe.show = true;

        // Hide default Cesium credit overlay container to avoid obstructing map
        if (viewerInstance.creditDisplay?.container) {
          viewerInstance.creditDisplay.container.style.display = 'none';
        }

        // Camera controller settings
        const controller = viewerInstance.scene.screenSpaceCameraController;
        controller.enableRotate = true;
        controller.enableTranslate = true;
        controller.enableZoom = true;
        controller.enableTilt = true;
        controller.enableLook = true;
        controller.enableCollisionDetection = true; // Prevents camera sinking underground
        controller.minimumZoomDistance = 35.0;
        controller.maximumZoomDistance = 30000000.0;
        controller.inertiaSpin = 0.85;
        controller.inertiaTranslate = 0.85;
        controller.inertiaZoom = 0.80;

        viewerInstance.scene.globe.depthTestAgainstTerrain = false;
        viewerInstance.scene.globe.enableLighting = false;

        // Initialize DataSources for layered geospatial management
        const thermalDS = new Cesium.CustomDataSource('thermal_hotspots');
        const facilityDS = new Cesium.CustomDataSource('industrial_facilities');
        const plumeDS = new Cesium.CustomDataSource('estimated_plume');
        const receptorsDS = new Cesium.CustomDataSource('sensitive_receptors');

        viewerInstance.dataSources.add(thermalDS);
        viewerInstance.dataSources.add(facilityDS);
        viewerInstance.dataSources.add(plumeDS);
        viewerInstance.dataSources.add(receptorsDS);

        thermalDataSourceRef.current = thermalDS;
        facilityDataSourceRef.current = facilityDS;
        plumeDataSourceRef.current = plumeDS;
        receptorsDataSourceRef.current = receptorsDS;
        viewerRef.current = viewerInstance;
        window.__viewer = viewerInstance;
        window.__Cesium = Cesium;

        // Task 6: Initial camera view directly set to site-level inspection (250-500m)
        if (selectedFireRef.current) {
          const lat = Number(selectedFireRef.current.latitude);
          const lon = Number(selectedFireRef.current.longitude);
          if (!isNaN(lat) && !isNaN(lon)) {
            const camConfig = calculateInspectionCamera(selectedFireRef.current);
            if (camConfig) {
              viewerInstance.camera.setView({
                destination: camConfig.destPos,
                orientation: {
                  heading: camConfig.headingRad,
                  pitch: camConfig.pitchRad,
                  roll: 0.0
                }
              });
              isInspectingRef.current = true;
              targetLatRef.current = lat;
              targetLonRef.current = lon;
              syncTelemetryWithEvent(lat, lon);
            }
          }
          setActiveCard({ type: 'thermal', data: selectedFireRef.current });
        } else {
          viewerInstance.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(78.5, 21.5, 3200000),
            orientation: {
              heading: Cesium.Math.toRadians(0),
              pitch: Cesium.Math.toRadians(-82),
              roll: 0.0
            }
          });
        }

        // Camera telemetry listener
        const updateTelemetry = () => {
          if (!viewerInstance || viewerInstance.isDestroyed()) return;
          try {
            const camera = viewerInstance.camera;
            const carto = camera.positionCartographic;
            const alt = carto ? Math.round(carto.height) : null;
            const pitch = Math.round(Cesium.Math.toDegrees(camera.pitch));
            const heading = Math.round(Cesium.Math.toDegrees(camera.heading));

            let targetLat = null;
            let targetLon = null;

            if (isInspectingRef.current && targetLatRef.current != null && targetLonRef.current != null) {
              targetLat = targetLatRef.current;
              targetLon = targetLonRef.current;
            } else {
              const canvas = viewerInstance.canvas;
              const centerPoint = new Cesium.Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
              const ray = camera.getPickRay(centerPoint);
              if (ray) {
                const intersection = viewerInstance.scene.pickPosition(centerPoint) 
                  || viewerInstance.scene.globe.pick(ray, viewerInstance.scene);
                if (intersection) {
                  const targetCarto = Cesium.Cartographic.fromCartesian(intersection);
                  targetLat = Cesium.Math.toDegrees(targetCarto.latitude);
                  targetLon = Cesium.Math.toDegrees(targetCarto.longitude);
                }
              }
            }

            setCameraTelemetry({
              targetLat,
              targetLon,
              altitude: alt,
              pitch,
              heading
            });
          } catch (e) {}
        };

        const removeListener = viewerInstance.camera.changed.addEventListener(updateTelemetry);
        cameraListenerRef.current = removeListener;

        // ScreenSpaceEventHandler for interactive entity picking
        const handler = new Cesium.ScreenSpaceEventHandler(viewerInstance.scene.canvas);
        handler.setInputAction((click) => {
          const picked = viewerInstance.scene.pick(click.position);
          if (Cesium.defined(picked) && picked.id) {
            const entity = picked.id;
            const agniType = entity._agniType || (entity.cylinder || entity.point || entity.label || entity.polyline ? 'thermal' : null);
            const agniData = entity._agniData || selectedFireRef.current;
            if (agniType) {
              if (agniType === 'thermal' && agniData && onSelectFire) {
                onSelectFire(agniData);
              }
              setActiveCard({ type: agniType, data: agniData });
              return;
            }
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        // Reset inspection lock on user manual mouse drag
        handler.setInputAction(() => { isInspectingRef.current = false; }, Cesium.ScreenSpaceEventType.LEFT_DOWN);
        handler.setInputAction(() => { isInspectingRef.current = false; }, Cesium.ScreenSpaceEventType.RIGHT_DOWN);
        handler.setInputAction(() => { isInspectingRef.current = false; }, Cesium.ScreenSpaceEventType.MIDDLE_DOWN);

        screenHandlerRef.current = handler;
        setViewer(viewerInstance);

        // Task 2, 3 & 14: Asynchronously stream Cesium World Terrain & OSM Buildings
        (async () => {
          let terrainLoaded = false;
          let buildingsLoaded = false;

          // 1. Task 2: Cesium World Terrain
          if (viewerInstance && !viewerInstance.isDestroyed()) {
            try {
              const terrain = await Cesium.createWorldTerrainAsync({
                requestWaterMask: true,
                requestVertexNormals: true
              });
              if (viewerInstance && !viewerInstance.isDestroyed()) {
                viewerInstance.terrainProvider = terrain;
                terrainProviderRef.current = terrain;
                viewerInstance.scene.globe.depthTestAgainstTerrain = true;
                terrainLoaded = true;
                console.log('[AGNIDRISHTI 3D] Cesium World Terrain successfully loaded.');
              }
            } catch (terrainErr) {
              console.warn('[AGNIDRISHTI 3D] Cesium World Terrain load notice, fallback to Ellipsoid:', terrainErr);
              if (viewerInstance && !viewerInstance.isDestroyed()) {
                terrainProviderRef.current = new Cesium.EllipsoidTerrainProvider();
                viewerInstance.terrainProvider = terrainProviderRef.current;
                viewerInstance.scene.globe.depthTestAgainstTerrain = false;
              }
            }
          }

          // 2. Task 3: Cesium OSM Buildings
          if (viewerInstance && !viewerInstance.isDestroyed()) {
            try {
              const osmBuildings = await Cesium.createOsmBuildingsAsync({
                defaultColor: Cesium.Color.fromCssColorString('#94a3b8').withAlpha(0.85)
              });
              if (viewerInstance && !viewerInstance.isDestroyed()) {
                viewerInstance.scene.primitives.add(osmBuildings);
                osmBuildingsRef.current = osmBuildings;
                buildingsLoaded = true;
                console.log('[AGNIDRISHTI 3D] Cesium OSM Buildings successfully loaded.');
              }
            } catch (osmErr) {
              console.warn('[AGNIDRISHTI 3D] Cesium OSM Buildings load notice:', osmErr);
            }
          }

          // Task 14: Truthful Status reporting
          if (terrainLoaded && buildingsLoaded) {
            setTilesetStatusText('WORLD TERRAIN + OSM BUILDINGS');
            setTilesetMode('cesium_native');
          } else if (terrainLoaded) {
            setTilesetStatusText('CESIUM WORLD TERRAIN');
            setTilesetMode('cesium_native');
          } else if (buildingsLoaded) {
            setTilesetStatusText('OSM BUILDINGS (3D TERRAIN UNAVAILABLE)');
            setTilesetMode('cesium_native');
          } else {
            // Explicit Task 14 requirement: show "3D Terrain unavailable" if terrain fails
            setTilesetStatusText('3D Terrain unavailable');
            setTilesetMode('imagery_only');
          }
        })();

        // Optional OpenStreetMap road overlay
        if (viewerInstance && !viewerInstance.isDestroyed()) {
          try {
            const roadProvider = new Cesium.UrlTemplateImageryProvider({
              url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              subdomains: ['a', 'b', 'c']
            });
            const roadLayer = new Cesium.ImageryLayer(roadProvider, { alpha: 0.65, show: false });
            viewerInstance.imageryLayers.add(roadLayer);
            roadLayerRef.current = roadLayer;
          } catch (e) {}
        }
      } catch (err) {
        console.error('[AGNIDRISHTI 3D] Cesium initialization error:', err);
        setInitError(err.message || 'WebGL initialization failure');
      }
    };

    initCesium();

    // Task 12: Clean up single viewer lifecycle strictly on unmount
    return () => {
      if (screenHandlerRef.current && !screenHandlerRef.current.isDestroyed()) {
        try { screenHandlerRef.current.destroy(); } catch (e) {}
      }
      screenHandlerRef.current = null;

      if (cameraListenerRef.current) {
        try { cameraListenerRef.current(); } catch (e) {}
      }
      cameraListenerRef.current = null;

      if (viewerInstance && !viewerInstance.isDestroyed()) {
        try {
          viewerInstance.destroy();
        } catch (e) {
          console.warn('[AGNIDRISHTI 3D] Error destroying viewer:', e);
        }
      }
      viewerRef.current = null;
      setViewer(null);
    };
  }, []);

  // Update 3D Buildings visibility
  useEffect(() => {
    if (osmBuildingsRef.current) {
      osmBuildingsRef.current.show = showBuildings;
    }
  }, [showBuildings]);

  // Update Terrain Provider visibility
  useEffect(() => {
    const v = viewerRef.current || viewer;
    if (!v) return;
    if (showTerrain && terrainProviderRef.current) {
      v.terrainProvider = terrainProviderRef.current;
      v.scene.globe.depthTestAgainstTerrain = true;
    } else {
      v.terrainProvider = new Cesium.EllipsoidTerrainProvider();
      v.scene.globe.depthTestAgainstTerrain = false;
    }
  }, [showTerrain, viewer]);

  // Update Satellite Layer Visibility
  useEffect(() => {
    if (baseLayerRef.current) {
      baseLayerRef.current.show = showSatellite;
    }
  }, [showSatellite]);

  // Update Road/OSM overlay visibility
  useEffect(() => {
    if (roadLayerRef.current) {
      roadLayerRef.current.show = showRoads;
    }
  }, [showRoads]);

  // Keyboard Navigation Controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

      switch (e.key) {
        case '+':
        case '=':
          e.preventDefault();
          handleZoomIn();
          break;
        case '-':
        case '_':
          e.preventDefault();
          handleZoomOut();
          break;
        case 'Home':
        case 'h':
        case 'H':
          e.preventDefault();
          handleResetHome();
          break;
        case 'l':
        case 'L':
          e.preventDefault();
          handleRecenterIncident();
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          handlePan('north');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          handlePan('south');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          handlePan('west');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          handlePan('east');
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewer, selectedFire]);

  // Trigger camera flight on selectedFire change or locateTrigger
  useEffect(() => {
    if (!viewer || !selectedFire) return;

    const fireKey = selectedFire.fire_id || selectedFire.event_id || `${selectedFire.latitude}_${selectedFire.longitude}`;
    if (
      lastFlownRef.current.fireId === fireKey &&
      lastFlownRef.current.locateTrigger === locateTrigger
    ) {
      return;
    }
    lastFlownRef.current = { fireId: fireKey, locateTrigger };

    flyToIncident(selectedFire);
    setActiveCard({ type: 'thermal', data: selectedFire });
  }, [viewer, selectedFire, locateTrigger, flyToIncident]);

  // Task 5 & 7: Render Exact NASA FIRMS Thermal Incident Marker
  useEffect(() => {
    const ds = thermalDataSourceRef.current;
    if (!ds) return;
    ds.entities.removeAll();

    if (!showThermal) return;

    const currentSelectedId = selectedFire?.fire_id || selectedFire?.event_id;

    // Render subtle background markers for other active events
    (fires || []).forEach((fire) => {
      const fId = fire.fire_id || fire.event_id;
      if (currentSelectedId && fId === currentSelectedId) return;

      const fLat = Number(fire.latitude);
      const fLon = Number(fire.longitude);
      if (isNaN(fLat) || isNaN(fLon)) return;

      const isCritical = Boolean(fire.is_emergency || fire.threat_level === 'CRITICAL' || fire.category === 'CRITICAL_INDUSTRIAL_EMERGENCY');
      const isFlare = fire.category === 'PERSISTENT_INDUSTRIAL_FLARE';
      const color = getClassificationColor(fire);

      const subtleMarker = ds.entities.add({
        position: Cesium.Cartesian3.fromDegrees(fLon, fLat),
        point: {
          pixelSize: isCritical ? 9 : (isFlare ? 7 : 6),
          color: color,
          outlineColor: Cesium.Color.WHITE.withAlpha(isCritical ? 0.95 : 0.7),
          outlineWidth: isCritical ? 2.0 : 1.2,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        }
      });
      subtleMarker._agniType = 'thermal';
      subtleMarker._agniData = fire;
    });

    if (!selectedFire) return;

    // Task 5: Exact FIRMS Observation Coordinate
    const lat = Number(selectedFire.latitude);
    const lon = Number(selectedFire.longitude);
    if (isNaN(lat) || isNaN(lon)) return;

    const frp = Math.max(5, Number(selectedFire.frp) || 20);
    const isCritical = Boolean(selectedFire.is_emergency || selectedFire.threat_level === 'CRITICAL' || selectedFire.category === 'CRITICAL_INDUSTRIAL_EMERGENCY');
    const isFlare = selectedFire.category === 'PERSISTENT_INDUSTRIAL_FLARE';

    // Task 7: Severity-scaled visual intensity, not a giant distracting circle
    const beaconHeight = Math.min(100, Math.max(60, 60 + (frp / 250) * 30));
    const groundRadius = Math.min(18, Math.max(10, 10 + (frp / 200) * 6));
    const glowPower = isCritical ? 0.35 : (isFlare ? 0.28 : 0.22);
    const color = getClassificationColor(selectedFire);
    const colorHex = isCritical ? '#EF4444' : (isFlare ? '#F59E0B' : '#EF4444');

    const v = viewerRef.current || viewer;
    let groundHeight = 0;
    if (v?.scene?.globe) {
      const carto = Cesium.Cartographic.fromDegrees(lon, lat);
      groundHeight = v.scene.globe.getHeight(carto) || 0;
      if (groundHeight < 0) groundHeight = 0;
    }

    const posGround = Cesium.Cartesian3.fromDegrees(lon, lat, groundHeight);
    const posBeaconTop = Cesium.Cartesian3.fromDegrees(lon, lat, groundHeight + beaconHeight);
    const posCore = Cesium.Cartesian3.fromDegrees(lon, lat, groundHeight + 2.0);

    // 1. Vertical Incident Beacon (Rising from FIRMS observation coordinate to sky)
    const locatorBeam = ds.entities.add({
      polyline: {
        positions: [posGround, posBeaconTop],
        width: isCritical ? 4.0 : 3.0,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: glowPower,
          color: color.withAlpha(0.95)
        })
      }
    });
    locatorBeam._agniType = 'thermal';
    locatorBeam._agniData = selectedFire;

    // 2. Top Beacon Node
    const topBeacon = ds.entities.add({
      position: posBeaconTop,
      point: {
        pixelSize: isCritical ? 8 : 6,
        color: Cesium.Color.WHITE,
        outlineColor: color,
        outlineWidth: 2.0,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      }
    });
    topBeacon._agniType = 'thermal';
    topBeacon._agniData = selectedFire;

    // 3. Ground Target Ring (Subtle ring centered on FIRMS coordinate)
    const groundRing = ds.entities.add({
      position: posGround,
      ellipse: {
        semiMinorAxis: groundRadius,
        semiMajorAxis: groundRadius,
        material: color.withAlpha(0.18),
        outline: true,
        outlineColor: Cesium.Color.WHITE.withAlpha(0.85),
        outlineWidth: 1.8,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
      }
    });
    groundRing._agniType = 'thermal';
    groundRing._agniData = selectedFire;

    // 4. Thermal Core Hotspot Point
    const thermalCore = ds.entities.add({
      position: posCore,
      point: {
        pixelSize: isCritical ? 10 : 8,
        color: Cesium.Color.fromCssColorString(colorHex),
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2.0,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      }
    });
    thermalCore._agniType = 'thermal';
    thermalCore._agniData = selectedFire;

    // 5. Scientific Incident Information Badge
    const eventId = selectedFire.event_id || selectedFire.fire_id || 'AGNI-OBSERVATION';
    const frpVal = Number(selectedFire.frp || 0).toFixed(1);
    const satVal = selectedFire.satellites_display || selectedFire.satellite || 'VIIRS NOAA-21';
    const cleanTime = selectedFire.acq_time ? String(selectedFire.acq_time).padStart(4, '0') : '1200';
    const timeVal = `${cleanTime.substring(0, 2)}:${cleanTime.substring(2, 4)} UTC`;
    const latStr = `${lat >= 0 ? lat.toFixed(5) + '° N' : Math.abs(lat).toFixed(5) + '° S'}`;
    const lonStr = `${lon >= 0 ? lon.toFixed(5) + '° E' : Math.abs(lon).toFixed(5) + '° W'}`;

    // Task 5 Requirement: Label as "FIRMS Observation Coordinate" (not physical ignition point)
    const labelText = `EXACT FIRMS OBSERVATION\nFIRMS Observation Coordinate (INCIDENT TARGET)\nEVENT: ${eventId}  |  FIRE RADIATIVE POWER: ${frpVal} MW\nOBSERVED: ${timeVal}  |  SENSOR: ${satVal}\n${latStr}, ${lonStr}\nSatellite infrared thermal detection point`;

    const eventLabel = ds.entities.add({
      position: posGround,
      label: {
        text: labelText,
        font: 'bold 10.5px "JetBrains Mono", monospace',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -45),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new Cesium.NearFarScalar(250, 1.0, 35000, 0.72),
        backgroundColor: Cesium.Color.fromCssColorString('#0b101b').withAlpha(0.92),
        showBackground: true,
        backgroundPadding: new Cesium.Cartesian2(8, 5)
      }
    });
    eventLabel._agniType = 'thermal';
    eventLabel._agniData = selectedFire;
  }, [viewer, selectedFire, showThermal]);

  // Task 8: Facility Footprint Overlay (Only from real matched facility geometry)
  useEffect(() => {
    const ds = facilityDataSourceRef.current;
    if (!ds) return;
    ds.entities.removeAll();

    if (!showFacility || !facilities?.features || !selectedFire) return;

    const matched = facilities.features.find((fac) => {
      const props = fac.properties;
      return (
        selectedFire.facility_id === fac.id ||
        selectedFire.facility_id === props.facility_id ||
        (selectedFire.facility_name && props.name && selectedFire.facility_name.toLowerCase() === props.name.toLowerCase())
      );
    });

    if (matched && matched.geometry?.coordinates?.[0]) {
      const flatCoords = [];
      matched.geometry.coordinates[0].forEach(([lon, lat]) => {
        flatCoords.push(lon, lat);
      });

      const facEntity = ds.entities.add({
        name: matched.properties?.name || 'Industrial Facility',
        polygon: {
          hierarchy: Cesium.Cartesian3.fromDegreesArray(flatCoords),
          material: Cesium.Color.fromCssColorString('#06B6D4').withAlpha(0.12),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString('#06B6D4').withAlpha(0.85),
          outlineWidth: 2.0,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
        }
      });
      facEntity._agniType = 'facility';
      facEntity._agniData = matched.properties;

      const firstCoord = matched.geometry.coordinates[0][0];
      const facLabel = ds.entities.add({
        position: Cesium.Cartesian3.fromDegrees(firstCoord[0], firstCoord[1], 10),
        label: {
          text: `FACILITY FOOTPRINT: ${matched.properties?.name || 'INDUSTRIAL FACILITY'}`,
          font: 'bold 10px "JetBrains Mono", monospace',
          fillColor: Cesium.Color.fromCssColorString('#67E8F9'),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2.5,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        }
      });
      facLabel._agniType = 'facility';
      facLabel._agniData = matched.properties;
    }
  }, [viewer, facilities, selectedFire, showFacility]);

  // Task 9 & 10: 3D Directional Estimated Dispersion & Wind (Exact backend result)
  useEffect(() => {
    const ds = plumeDataSourceRef.current;
    if (!ds) return;
    ds.entities.removeAll();

    if (!showPlume || !selectedFire || !activePlume) return;

    const lat = Number(selectedFire.latitude);
    const lon = Number(selectedFire.longitude);
    if (isNaN(lat) || isNaN(lon)) return;

    const isDirectional = activePlume.properties?.is_directional !== false;
    const downwindDeg = activePlume.properties?.downwind_azimuth_deg != null
      ? Math.round(activePlume.properties.downwind_azimuth_deg)
      : Math.round((Number(selectedFire.wind_direction_deg || 0) + 180) % 360);
    const lengthKm = Number(activePlume.properties?.hazard_length_km || selectedFire.hazard_radius_km || 3.5);

    // Derive geometry either from backend ring or shared createDownwindDispersionPolygon
    let flatOuterCoords = [];
    let flatCoreCoords = [];
    let centerlinePositions = [];
    let labelPos = null;

    const ring = activePlume.geometry?.coordinates?.[0];
    if (ring && ring.length >= 3) {
      ring.forEach(([pLon, pLat]) => {
        flatOuterCoords.push(pLon, pLat);
      });
      if (activePlume.properties?.inner_corridor?.length >= 3) {
        activePlume.properties.inner_corridor.forEach(([pLon, pLat]) => {
          flatCoreCoords.push(pLon, pLat);
        });
      }
      if (activePlume.properties?.centerline) {
        centerlinePositions = activePlume.properties.centerline.map(([cLat, cLon]) => Cesium.Cartesian3.fromDegrees(cLon, cLat, 8));
      }
    } else {
      const generated = createDownwindDispersionPolygon(lat, lon, downwindDeg, lengthKm, null, {}, isDirectional);
      (generated.outerPolygon || []).forEach(([pLat, pLon]) => {
        flatOuterCoords.push(pLon, pLat);
      });
      if (generated.corePolygon) {
        generated.corePolygon.forEach(([pLat, pLon]) => {
          flatCoreCoords.push(pLon, pLat);
        });
      }
      if (generated.centerline) {
        centerlinePositions = generated.centerline.map(([cLat, cLon]) => Cesium.Cartesian3.fromDegrees(cLon, cLat, 8));
      }
      if (generated.labelPosition) {
        labelPos = generated.labelPosition;
      }
    }

    if (flatOuterCoords.length < 6) return;

    const statusMsg = activePlume.properties?.status_message || (isDirectional ? 'Estimated Dispersion Corridor' : 'Low wind — directional estimate uncertain');
    const fillColor = isDirectional ? '#EA580C' : '#F59E0B';
    const strokeColor = isDirectional ? '#F97316' : '#D97706';

    // 1. Outer Dispersion Corridor Polygon (draped on terrain)
    ds.entities.add({
      name: isDirectional ? 'Estimated Downwind Dispersion Corridor' : 'Estimated Dispersion Area (Calm Wind)',
      polygon: {
        hierarchy: Cesium.Cartesian3.fromDegreesArray(flatOuterCoords),
        material: Cesium.Color.fromCssColorString(fillColor).withAlpha(0.14),
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString(strokeColor).withAlpha(0.65),
        outlineWidth: 1.5,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
      }
    });

    // 2. Inner Core High-Concentration Corridor (draped on terrain)
    if (flatCoreCoords.length >= 6) {
      ds.entities.add({
        name: 'Estimated Near-Source Core Dispersion',
        polygon: {
          hierarchy: Cesium.Cartesian3.fromDegreesArray(flatCoreCoords),
          material: Cesium.Color.fromCssColorString('#DC2626').withAlpha(0.28),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString('#EF4444').withAlpha(0.80),
          outlineWidth: 1.5,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
        }
      });
    }

    if (!isDirectional) {
      // For calm / missing wind, render non-directional status label
      ds.entities.add({
        position: Cesium.Cartesian3.fromDegrees(lon, lat, 20),
        label: {
          text: statusMsg,
          font: 'bold 9.5px "JetBrains Mono", monospace',
          fillColor: Cesium.Color.fromCssColorString('#FCD34D'),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2.5,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, -65),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        }
      });
    } else {
      // 3. Downwind directional centerline polyline
      if (centerlinePositions.length >= 2) {
        ds.entities.add({
          name: 'Dispersion Centerline',
          polyline: {
            positions: centerlinePositions,
            width: 2.5,
            material: new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.25,
              color: Cesium.Color.fromCssColorString('#FDBA74').withAlpha(0.85)
            })
          }
        });
      }

      // 4. Directional wind indicator originating from the incident
      const rawSpeed = activePlume.properties?.wind_speed_kmh != null ? activePlume.properties.wind_speed_kmh : selectedFire.wind_speed_kmh;
      const windSpeed = Number(rawSpeed) || 12.0;
      const arrowLenMeters = Math.min(320, Math.max(100, windSpeed * 14));
      const blowRad = Cesium.Math.toRadians(downwindDeg);
      const endLat = lat + (arrowLenMeters * Math.cos(blowRad)) / 111320;
      const endLon = lon + (arrowLenMeters * Math.sin(blowRad)) / (111320 * Math.cos(lat * Math.PI / 180));

      ds.entities.add({
        name: 'Surface Wind Vector Indicator',
        polyline: {
          positions: [
            Cesium.Cartesian3.fromDegrees(lon, lat, 12),
            Cesium.Cartesian3.fromDegrees(endLon, endLat, 12)
          ],
          width: 3.0,
          material: new Cesium.PolylineArrowMaterialProperty(
            Cesium.Color.fromCssColorString('#38BDF8').withAlpha(0.90)
          )
        }
      });

      // 5. Subtle Map Label
      const tagLat = labelPos ? labelPos[0] : (lat + (lengthKm * 0.52 * 1000 * Math.cos(blowRad)) / 111320);
      const tagLon = labelPos ? labelPos[1] : (lon + (lengthKm * 0.52 * 1000 * Math.sin(blowRad)) / (111320 * Math.cos(lat * Math.PI / 180)));

      ds.entities.add({
        position: Cesium.Cartesian3.fromDegrees(tagLon, tagLat, 15),
        label: {
          text: `ESTIMATED DOWNWIND DISPERSION (${lengthKm.toFixed(1)} km • ${Math.round(downwindDeg)}°)`,
          font: 'bold 9px "JetBrains Mono", monospace',
          fillColor: Cesium.Color.fromCssColorString('#FDBA74'),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2.5,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, -10),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        }
      });
    }
  }, [viewer, activePlume, selectedFire, showPlume]);


  // Sensitive Receptors in Corridor
  useEffect(() => {
    const ds = receptorsDataSourceRef.current;
    if (!ds) return;
    ds.entities.removeAll();

    if (!showReceptors || !selectedFire || !activePlume) return;

    const exposure = activePlume?.properties?.community_exposure;
    if (!exposure) return;

    const corridorReceptors = [
      ...(exposure.intersecting_settlements || []).map(s => ({ ...s, type: 'settlement' })),
      ...(exposure.intersecting_schools || []).map(s => ({ ...s, type: 'school' })),
      ...(exposure.intersecting_hospitals || []).map(h => ({ ...h, type: 'hospital' }))
    ];

    corridorReceptors.forEach((rec) => {
      const lat = Number(rec.latitude);
      const lon = Number(rec.longitude);
      if (isNaN(lat) || isNaN(lon)) return;

      const type = rec.type;
      let color = Cesium.Color.fromCssColorString('#38BDF8');
      if (type === 'school') color = Cesium.Color.fromCssColorString('#c084fc');
      if (type === 'hospital') color = Cesium.Color.fromCssColorString('#F43F5E');

      const receptorEntity = ds.entities.add({
        position: Cesium.Cartesian3.fromDegrees(lon, lat, 15),
        point: {
          pixelSize: 8,
          color: color,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 1.5,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        },
        label: {
          text: `[CORRIDOR] ${rec.name}`,
          font: 'bold 9.5px monospace',
          fillColor: Cesium.Color.fromCssColorString('#FCA5A5'),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -6),
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        }
      });

      receptorEntity._agniType = 'receptor';
      receptorEntity._agniData = {
        name: rec.name,
        type: type.toUpperCase(),
        distance_km: rec.distance_km,
        isIntersecting: true
      };
    });
  }, [viewer, selectedFire, activePlume, showReceptors]);

  // Error Fallback UI
  if (initError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#080b10] text-slate-200 p-6">
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
        <h2 className="text-xl font-bold font-mono tracking-wider mb-2">3D VIEW UNAVAILABLE</h2>
        <p className="text-sm text-slate-400 max-w-md text-center mb-6 font-sans">
          Cesium 3D geospatial engine could not initialize WebGL on this device.
          ({initError})
        </p>
        <button
          onClick={onReturnTo2D || onExit3D}
          className="px-4 py-2 bg-white/[0.08] hover:bg-white/[0.15] text-white rounded-lg border border-white/20 transition-all font-mono text-xs cursor-pointer flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>RETURN TO 2D</span>
        </button>
      </div>
    );
  }

  const windSpeedDisplay = selectedFire?.wind_speed_kmh != null 
    ? `${Math.round(selectedFire.wind_speed_kmh)} km/h` 
    : (activePlume?.properties?.wind_speed_kmh != null ? `${Math.round(activePlume.properties.wind_speed_kmh)} km/h` : 'CALM');
  const windDirDisplay = selectedFire?.wind_direction_deg != null 
    ? `${Math.round(selectedFire.wind_direction_deg)}°` 
    : (activePlume?.properties?.wind_direction_deg != null ? `${Math.round(activePlume.properties.wind_direction_deg)}°` : '—');

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#080b10] select-none">
      {/* Cesium Canvas Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Non-Blocking Compact Flight HUD (Task 6) */}
      {isFlying && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none select-none">
          <div className="px-4 py-2 rounded-xl bg-[#0b101b]/85 border border-cyan-500/40 shadow-2xl backdrop-blur-md flex items-center gap-3">
            <div className="relative w-3.5 h-3.5 flex items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-cyan-400 animate-ping opacity-70" />
              <span className="relative w-2.5 h-2.5 rounded-full bg-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10.5px] font-mono font-bold tracking-wider text-cyan-300 uppercase">
                  3D INCIDENT INSPECTION
                </span>
                <span className="text-[9.5px] font-mono text-slate-300 font-semibold px-1.5 py-0.2 rounded bg-cyan-950/70 border border-cyan-500/30">
                  {flightStage}
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-300 mt-0.5">
                {selectedFire ? `${Number(selectedFire.latitude).toFixed(5)}° N   ${Number(selectedFire.longitude).toFixed(5)}° E` : ''}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task 11: GIS Navigation Toolbar */}
      <div 
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        className="absolute top-3 left-[285px] z-20 pointer-events-auto flex items-center bg-[#0b101b]/95 border border-white/20 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden p-1 space-x-1 text-slate-300 select-none"
      >
        {/* TARGET EVENT (Recenter on selected incident) */}
        <button
          type="button"
          id="btn-target-event"
          onClick={(e) => { e.stopPropagation(); handleRecenterIncident(); }}
          title={selectedFire ? "Target Event (Oblique 3D Focus)" : "Select an event first"}
          disabled={!selectedFire}
          className="px-2.5 py-1.5 flex items-center gap-1.5 rounded-lg text-xs font-mono font-semibold hover:text-cyan-300 hover:bg-white/10 active:bg-cyan-500/30 active:scale-95 transition-all cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
        >
          <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">TARGET EVENT</span>
        </button>

        <div className="w-[1px] h-4 bg-white/15" />

        {/* RESET VIEW */}
        <button
          type="button"
          id="btn-reset-view"
          onClick={(e) => { e.stopPropagation(); handleResetHome(); }}
          title="Reset View (Regional Overview)"
          className="px-2.5 py-1.5 flex items-center gap-1.5 rounded-lg text-xs font-mono font-semibold hover:text-cyan-300 hover:bg-white/10 active:bg-cyan-500/30 active:scale-95 transition-all cursor-pointer"
        >
          <Home className="w-3.5 h-3.5 text-slate-300" />
          <span className="hidden sm:inline">RESET VIEW</span>
        </button>

        <div className="w-[1px] h-4 bg-white/15" />

        {/* ZOOM IN */}
        <button
          type="button"
          id="btn-zoom-in"
          onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
          title="Zoom In (+)"
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:text-white hover:bg-white/15 active:bg-cyan-500/30 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

        {/* ZOOM OUT */}
        <button
          type="button"
          id="btn-zoom-out"
          onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
          title="Zoom Out (−)"
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:text-white hover:bg-white/15 active:bg-cyan-500/30 active:scale-95 transition-all cursor-pointer"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-white/15" />

        {/* ROTATE CCW */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleRotate(-20); }}
          title="Rotate Left"
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:text-white hover:bg-white/15 active:scale-95 transition-all cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* ROTATE CW */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleRotate(20); }}
          title="Rotate Right"
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:text-white hover:bg-white/15 active:scale-95 transition-all cursor-pointer"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-white/15" />

        {/* TILT */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleTilt('up'); }}
          title="Tilt Pitch Up"
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:text-white hover:bg-white/15 active:scale-95 transition-all cursor-pointer"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleTilt('down'); }}
          title="Tilt Pitch Down"
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:text-white hover:bg-white/15 active:scale-95 transition-all cursor-pointer"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-white/15" />

        {/* RETURN TO 2D */}
        <button
          type="button"
          id="btn-return-to-2d"
          onClick={(e) => {
            e.stopPropagation();
            if (onReturnTo2D) onReturnTo2D();
            else if (onExit3D) onExit3D();
          }}
          title="Return to 2D Map"
          className="px-2.5 py-1.5 flex items-center gap-1.5 rounded-lg text-xs font-mono font-semibold bg-white/[0.05] hover:bg-white/[0.12] text-amber-300 hover:text-amber-200 border border-amber-500/30 active:scale-95 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>RETURN TO 2D</span>
        </button>
      </div>

      {/* Task 5: Incident Card with FIRMS Observation Coordinate Label */}
      {activeCard && (
        <div className="absolute top-14 left-[285px] z-30 w-72 max-w-[calc(100vw-20rem)] rounded-xl bg-[#0b101b]/95 border border-white/20 shadow-2xl backdrop-blur-xl p-3 font-sans text-xs text-slate-200">
          <div className="flex items-start justify-between gap-1.5 pb-2 border-b border-white/10">
            {activeCard.type === 'thermal' && (
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="font-mono font-bold text-cyan-300 text-[10px] tracking-wider uppercase">
                    FIRMS OBSERVATION COORDINATE
                  </span>
                </div>
                <div className="font-mono font-bold text-white text-[12px] tracking-wider truncate">
                  {activeCard.data.event_id || activeCard.data.fire_id}
                </div>
                <div className="text-[10px] text-slate-300 truncate">
                  {activeCard.data.facility_name && activeCard.data.facility_name !== 'None'
                    ? activeCard.data.facility_name
                    : (activeCard.data.location?.district ? `${activeCard.data.location.district}, ${activeCard.data.location.state}` : 'Terrestrial Zone')}
                </div>
              </div>
            )}

            {activeCard.type === 'facility' && (
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Building2 className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-mono font-bold text-amber-300 text-[10px] tracking-wider">
                    INDUSTRIAL FACILITY
                  </span>
                </div>
                <div className="text-[11px] text-white font-semibold truncate">
                  {activeCard.data.name}
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate">
                  {activeCard.data.category || 'Refining & Heavy Industry'}
                </div>
              </div>
            )}

            {activeCard.type === 'receptor' && (
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <MapPin className="w-3.5 h-3.5 text-sky-400" />
                  <span className="font-mono font-bold text-sky-300 text-[10px] tracking-wider uppercase truncate">
                    EXPOSURE STATUS
                  </span>
                </div>
                <div className="text-[11px] text-white font-semibold truncate">
                  {activeCard.data.name}
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate">
                  {activeCard.data.type || 'SENSITIVE RECEPTOR'}
                </div>
              </div>
            )}

            <button
              id="btn-close-card"
              onClick={() => setActiveCard(null)}
              className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer shrink-0"
              title="Close panel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="py-2 space-y-1.5 font-mono text-[10.5px]">
            {activeCard.type === 'thermal' && (
              <>
                <div className="flex items-center justify-between text-slate-200 font-semibold px-0.5">
                  <span>{Number(activeCard.data.latitude).toFixed(5)}° N</span>
                  <span>{Number(activeCard.data.longitude).toFixed(5)}° E</span>
                </div>

                <div className="text-[9.5px] text-slate-400 italic px-0.5">
                  Satellite infrared detection coordinate (VIIRS 375m). Not claimed as exact physical ignition origin.
                </div>

                <div className="flex items-center justify-between px-0.5 pt-1">
                  <span className="text-[10.5px] font-bold text-red-400 truncate max-w-[150px]">
                    {activeCard.data.predicted_class || (activeCard.data.is_emergency ? 'INDUSTRIAL FIRE' : 'THERMAL ANOMALY')}
                  </span>
                  <span className="text-amber-400 font-bold">
                    FIRE RADIATIVE POWER: {Number(activeCard.data.frp || 0).toFixed(1)} MW
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-400 text-[9.5px] px-0.5">
                  <span>{activeCard.data.satellites_display || activeCard.data.satellite || 'VIIRS NOAA-21'}</span>
                  <span className="text-slate-300">{formatUtcTime(activeCard.data.acq_date, activeCard.data.acq_time)}</span>
                </div>

                <div className="pt-1 flex items-center gap-1.5">
                  <button
                    id="btn-card-locate"
                    onClick={() => flyToIncident(activeCard.data)}
                    className="flex-1 py-1 rounded bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-200 hover:text-cyan-100 font-semibold text-[10px] tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Crosshair className="w-3 h-3 text-cyan-400" />
                    <span>RECENTER</span>
                  </button>
                  {onOpenReport && (
                    <button
                      id="btn-card-open-incident"
                      onClick={() => onOpenReport(activeCard.data)}
                      className="flex-1 py-1 rounded bg-white/[0.08] hover:bg-white/[0.15] border border-white/20 text-white font-semibold text-[10px] tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <FileText className="w-3 h-3 text-cyan-400" />
                      <span>ASSESSMENT</span>
                    </button>
                  )}
                </div>
              </>
            )}

            {activeCard.type === 'facility' && (
              <>
                <div className="text-[10px] space-y-1 text-slate-300 bg-black/40 p-1.5 rounded border border-white/5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">CATEGORY:</span>
                    <span className="text-slate-200 truncate max-w-[140px]">{activeCard.data.category || 'Heavy Industry'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">DISTRICT:</span>
                    <span className="text-slate-200 truncate max-w-[140px]">{activeCard.data.district || 'District'}, {activeCard.data.state || 'India'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">BASELINE FRP:</span>
                    <span className="text-amber-300 font-semibold">{activeCard.data.baseline_frp_mw || 45.0} MW</span>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    onClick={() => flyToIncident(selectedFire)}
                    className="w-full py-1 rounded bg-amber-950/70 hover:bg-amber-900 border border-amber-500/50 text-amber-200 hover:text-amber-100 font-semibold text-[10px] tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Crosshair className="w-3 h-3" />
                    <span>FOCUS ON INCIDENT</span>
                  </button>
                </div>
              </>
            )}

            {activeCard.type === 'receptor' && (
              <>
                <div className="text-[10px] space-y-1 text-slate-300 bg-black/40 p-1.5 rounded border border-white/5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">EXPOSURE STATUS:</span>
                    <span className="font-semibold text-red-400">IN ESTIMATED PLUME</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">DISTANCE:</span>
                    <span className="text-slate-200 font-semibold">{activeCard.data.distance_km ? `${activeCard.data.distance_km} km` : 'Near Anomaly'}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Task 5, 6, 9 & 14: Camera Accuracy, Wind & Coordinate Telemetry Verification HUD */}
      <div className="absolute bottom-3 left-[285px] z-20 pointer-events-auto flex items-center gap-2.5 text-[9.5px] font-mono text-slate-300 bg-[#0b101b]/95 px-2.5 py-1 rounded-lg border border-white/15 backdrop-blur-md shadow-xl flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-slate-400">FIRMS COORDS:</span>
          <span className="text-white font-bold">
            {selectedFire ? `${Number(selectedFire.latitude).toFixed(5)}° N, ${Number(selectedFire.longitude).toFixed(5)}° E` : 'SELECT EVENT'}
          </span>
        </div>
        <div className="h-3 w-[1px] bg-white/15" />
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">ALTITUDE:</span>
          <span className="text-slate-200 font-semibold">
            {cameraTelemetry.altitude ? `${cameraTelemetry.altitude.toLocaleString()}m` : '350m'}
          </span>
        </div>
        <div className="h-3 w-[1px] bg-white/15" />
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">PITCH:</span>
          <span className="text-amber-300 font-semibold">{cameraTelemetry.pitch != null ? `${cameraTelemetry.pitch}°` : '-30°'}</span>
        </div>
        <div className="h-3 w-[1px] bg-white/15" />
        {/* Task 9: Live Wind Indicator in Telemetry */}
        <div className="flex items-center gap-1.5">
          <Wind className="w-3 h-3 text-sky-400" />
          <span className="text-slate-400">SURFACE WIND:</span>
          <span className="text-sky-300 font-semibold">
            {windSpeedDisplay} • {windDirDisplay}
          </span>
        </div>
        <div className="h-3 w-[1px] bg-white/15" />
        {/* Task 14: Truthful 3D Status (shows "3D Terrain unavailable" if Ion terrain is down) */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">3D DATA:</span>
          <span className={`font-bold ${
            tilesetStatusText.includes('unavailable') || tilesetStatusText.includes('UNAVAILABLE')
              ? 'text-amber-400'
              : 'text-emerald-400'
          }`}>
            {tilesetStatusText}
          </span>
        </div>
      </div>
    </div>
  );
}
