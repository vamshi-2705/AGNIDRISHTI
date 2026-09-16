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
import Cesium3DInspector from './Cesium3DInspector';
import { createDirectionalPlume } from './GisMapViewer';

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
  selectedFire,
  facilities = null,
  sensitiveLocations = null,
  activePlume = null,
  onExit3D,
  onTogglePlume,
  isPlumeActive,
  plumeLoading,
  locateTrigger = 0,
  onOpenReport = null
}) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const screenHandlerRef = useRef(null);
  const cameraListenerRef = useRef(null);
  const [viewer, setViewer] = useState(null);
  const [initError, setInitError] = useState(null);

  // Non-blocking cinematic flight HUD state (Sections 1, 2, 26)
  const [isFlying, setIsFlying] = useState(false);
  const [flightStage, setFlightStage] = useState('');
  const [inspectorExpanded, setInspectorExpanded] = useState(true);
  const [activeCard, setActiveCard] = useState(null); // { type: 'thermal' | 'facility' | 'receptor', data: ... }

  // 3D Data Source Mode: 'osm_buildings' | 'terrain_imagery'
  const [tilesetMode, setTilesetMode] = useState('osm_buildings');
  const [tilesetStatusText, setTilesetStatusText] = useState('3D DATA UNAVAILABLE');
  const tilesetRef = useRef(null);
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
  const [showBuildings, setShowBuildings] = useState(true);
  const [showSatellite, setShowSatellite] = useState(true);
  const [showTerrain, setShowTerrain] = useState(true);
  const [showThermal, setShowThermal] = useState(true);
  const [showFacility, setShowFacility] = useState(true);
  const [showPlume, setShowPlume] = useState(true);
  const [showReceptors, setShowReceptors] = useState(true);
  const [showRoads, setShowRoads] = useState(false);
  const [layersMenuOpen, setLayersMenuOpen] = useState(false);
  const [navControlsExpanded, setNavControlsExpanded] = useState(true);

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
    // Fallback: 28 degrees gives excellent oblique angle revealing road network and industrial layout
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

  // Multi-Stage Cinematic Camera Flight: Continuous, Map Always Visible (Sections 1, 3, 4, 5)
  const flyToIncident = useCallback((fire, options = {}) => {
    const v = viewerRef.current || viewer;
    if (!v || !fire) return;

    // Single source of truth: authoritative NASA FIRMS coordinates
    const latitude = Number(fire.latitude);
    const longitude = Number(fire.longitude);
    if (isNaN(latitude) || isNaN(longitude)) return;

    const lat = latitude;
    const lon = longitude;
    targetLatRef.current = lat;
    targetLonRef.current = lon;

    console.log(`[AGNIDRISHTI 3D] Authoritative FIRMS Observation: latitude = ${lat.toFixed(6)}, longitude = ${lon.toFixed(6)}`);

    // Cancel any active flight and get fresh flight ID
    v.camera.cancelFlight();
    const currentFlightId = ++flightIdRef.current;

    const targetPos = Cesium.Cartesian3.fromDegrees(lon, lat, 0);
    const headingDeg = calculateInspectionHeading(fire);
    const headingRad = typeof headingDeg === 'number' && headingDeg < 7 
      ? headingDeg 
      : Cesium.Math.toRadians(headingDeg);

    // Destination preloading while camera flies
    if (tilesetRef.current) {
      try {
        tilesetRef.current.preloadFlightDestinations = true;
      } catch (e) {
        // ignore
      }
    }

    // Helper to fly camera stage asynchronously with frame gap
    const flyStage = (dest, heading, pitch, duration, easing) => {
      return new Promise((resolve) => {
        if (flightIdRef.current !== currentFlightId) {
          resolve(false);
          return;
        }
        v.camera.flyTo({
          destination: dest,
          orientation: {
            heading: heading,
            pitch: pitch,
            roll: 0.0
          },
          duration: duration,
          easingFunction: easing,
          complete: () => {
            if (flightIdRef.current !== currentFlightId) {
              resolve(false);
              return;
            }
            requestAnimationFrame(() => resolve(true));
          },
          cancel: () => {
            resolve(false);
          }
        });
      });
    };

    // Helper to compute camera offset position behind the target along approach heading
    const computeStagePos = (groundDistMeters, altitudeMeters) => {
      const dLatDeg = (groundDistMeters * Math.cos(headingRad)) / 111320;
      const dLonDeg = (groundDistMeters * Math.sin(headingRad)) / (111320 * Math.cos(lat * Math.PI / 180));
      return Cesium.Cartesian3.fromDegrees(lon - dLonDeg, lat - dLatDeg, altitudeMeters);
    };

    // STAGE 4 Inspection Position: 150-350m altitude (~220m), oblique pitch -45°
    const stage4Pos = computeStagePos(200, 220);

    // Check distance to incident from current camera position
    const currentPos = v.camera.position;
    const distToTarget = Cesium.Cartesian3.distance(currentPos, targetPos);

    // If already in low-altitude vicinity (< 1200m) and not forced full flight, fly direct to Stage 4
    if (distToTarget < 1200 && !options.forceFullFlight) {
      setIsFlying(true);
      setFlightStage('STAGE 4 — INCIDENT INSPECTION');

      v.camera.flyTo({
        destination: stage4Pos,
        orientation: {
          heading: headingRad,
          pitch: Cesium.Math.toRadians(-45), // Oblique inspection pitch (-35° to -60°) looking across terrain & structures
          roll: 0.0
        },
        duration: 1.4,
        easingFunction: Cesium.EasingFunction.QUADRATIC_OUT,
        complete: () => {
          if (flightIdRef.current !== currentFlightId) return;
          isInspectingRef.current = true;
          setIsFlying(false);
          setFlightStage('INSPECTION READY');
          syncTelemetryWithEvent(lat, lon);
        }
      });
      return;
    }

    // CONTINUOUS 4-STAGE CINEMATIC FLIGHT — MAP REMAINS 100% VISIBLE
    // Benchmark references: 1600 site inspection baseline / -35 oblique reference
    (async () => {
      setIsFlying(true);

      // STAGE 1 — REGIONAL CONTEXT (20-40km, Altitude: ~24km, Pitch: -55°, Duration: 1.6s)
      setFlightStage('STAGE 1 — REGIONAL CONTEXT');
      const stage1Pos = computeStagePos(12000, 24000);
      let ok = await flyStage(stage1Pos, headingRad, Cesium.Math.toRadians(-55), 1.6, Cesium.EasingFunction.QUADRATIC_IN_OUT);
      if (!ok || flightIdRef.current !== currentFlightId) return;

      // STAGE 2 — AREA APPROACH (3-5km, Altitude: ~3.5km, Pitch: -48°, Duration: 1.5s)
      setFlightStage('STAGE 2 — AREA APPROACH');
      const stage2Pos = computeStagePos(2500, 3500);
      ok = await flyStage(stage2Pos, headingRad, Cesium.Math.toRadians(-48), 1.5, Cesium.EasingFunction.QUADRATIC_IN_OUT);
      if (!ok || flightIdRef.current !== currentFlightId) return;

      // STAGE 3 — FACILITY APPROACH (500-800m, Altitude: ~650m, Pitch: -45°, Duration: 1.4s)
      setFlightStage('STAGE 3 — FACILITY APPROACH');
      const stage3Pos = computeStagePos(550, 650);
      ok = await flyStage(stage3Pos, headingRad, Cesium.Math.toRadians(-45), 1.4, Cesium.EasingFunction.QUADRATIC_IN_OUT);
      if (!ok || flightIdRef.current !== currentFlightId) return;

      // STAGE 4 — INCIDENT INSPECTION (150-350m, Altitude: ~220m, Pitch: -45°, Duration: 1.5s)
      setFlightStage('STAGE 4 — INCIDENT INSPECTION');
      ok = await flyStage(stage4Pos, headingRad, Cesium.Math.toRadians(-45), 1.5, Cesium.EasingFunction.QUADRATIC_OUT);
      if (!ok || flightIdRef.current !== currentFlightId) return;

      isInspectingRef.current = true;
      setIsFlying(false);
      setFlightStage('INSPECTION READY');
      syncTelemetryWithEvent(lat, lon);
    })();
  }, [viewer, calculateInspectionHeading, syncTelemetryWithEvent]);

  // Backward-compatible alias for existing test suites
  const flyToSelectedEvent = useCallback((fire, duration = 1.8) => {
    flyToIncident(fire);
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
      const step = Math.max(200, height * 0.40);
      v.camera.zoomOut(step);
    }
  };

  const handleRecenterIncident = () => {
    if (selectedFire) {
      flyToIncident(selectedFire);
      setActiveCard({ type: 'thermal', data: selectedFire });
    }
  };

  const handleResetHome = () => {
    const v = viewerRef.current || viewer;
    if (!v) return;
    isInspectingRef.current = false;

    if (selectedFire) {
      const lat = Number(selectedFire.latitude);
      const lon = Number(selectedFire.longitude);
      v.camera.cancelFlight();
      v.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(lon, lat - 0.15, 24000), // Regional View (~24km)
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-50),
          roll: 0.0
        },
        duration: 1.8,
        easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT
      });
    } else {
      v.camera.cancelFlight();
      v.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(78.9629, 21.5, 3800000),
        duration: 1.8
      });
    }
  };

  const handleResetNorth = () => {
    const v = viewerRef.current || viewer;
    if (!v) return;
    isInspectingRef.current = false;

    const target = getCameraTarget(v);
    if (target) {
      const currentRange = Cesium.Cartesian3.distance(v.camera.position, target);
      v.camera.cancelFlight();
      v.camera.flyToBoundingSphere(new Cesium.BoundingSphere(target, 0), {
        offset: new Cesium.HeadingPitchRange(Cesium.Math.toRadians(0), v.camera.pitch, currentRange),
        duration: 0.5
      });
    } else {
      const camera = v.camera;
      camera.flyTo({
        destination: camera.position,
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: camera.pitch,
          roll: 0.0
        },
        duration: 0.5
      });
    }
  };

  const handlePan = (direction) => {
    const v = viewerRef.current || viewer;
    if (!v) return;
    isInspectingRef.current = false;

    const height = v.camera.positionCartographic?.height || 1500;
    const dist = Math.max(80, height * 0.20);
    if (direction === 'north') v.camera.move(v.camera.up, dist);
    if (direction === 'south') v.camera.move(v.camera.up, -dist);
    if (direction === 'east') v.camera.move(v.camera.right, dist);
    if (direction === 'west') v.camera.move(v.camera.right, -dist);
  };

  const handleOrbit = (direction) => {
    const v = viewerRef.current || viewer;
    if (!v) return;
    isInspectingRef.current = false;

    const target = getCameraTarget(v);
    if (target) {
      const currentRange = Cesium.Cartesian3.distance(v.camera.position, target);
      const angle = Cesium.Math.toRadians(direction === 'left' ? -20 : 20);
      const newHeading = Cesium.Math.zeroToTwoPi(v.camera.heading + angle);

      v.camera.cancelFlight();
      v.camera.flyToBoundingSphere(new Cesium.BoundingSphere(target, 0), {
        offset: new Cesium.HeadingPitchRange(newHeading, v.camera.pitch, currentRange),
        duration: 0.35
      });
    } else {
      const angle = Cesium.Math.toRadians(15);
      if (direction === 'left') v.camera.rotateLeft(angle);
      else v.camera.rotateRight(angle);
    }
  };

  const handleTilt = (direction) => {
    const v = viewerRef.current || viewer;
    if (!v) return;
    isInspectingRef.current = false;

    const target = getCameraTarget(v);
    if (target) {
      const currentRange = Cesium.Cartesian3.distance(v.camera.position, target);
      const delta = Cesium.Math.toRadians(direction === 'up' ? 8 : -8);
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

  // Initialize CesiumJS Viewer (Single Lifecycle - Initialized ONCE)
  useEffect(() => {
    if (!containerRef.current) return;

    let viewerInstance = null;

    const initCesium = async () => {
      try {
        // Configure Cesium Ion Token if provided (Section 13)
        const ionToken = import.meta.env.VITE_CESIUM_ION_TOKEN;
        if (ionToken && typeof ionToken === 'string' && ionToken.trim()) {
          Cesium.Ion.defaultAccessToken = ionToken.trim();
        }

        // Setup Esri World Imagery (high-resolution authentic satellite base layer)
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

        // Hide default Cesium credit banner container to avoid token warning overlays
        if (viewerInstance.creditDisplay?.container) {
          viewerInstance.creditDisplay.container.style.display = 'none';
        }

        // Enable full native 3D camera controller with anti-underground collision detection
        const controller = viewerInstance.scene.screenSpaceCameraController;
        controller.enableRotate = true;
        controller.enableTranslate = true;
        controller.enableZoom = true;
        controller.enableTilt = true;
        controller.enableLook = true;
        controller.enableCollisionDetection = true; // Prevents camera sinking underground (Section 22)
        controller.minimumZoomDistance = 35.0; // Respect terrain & structures surface
        controller.maximumZoomDistance = 30000000.0;
        controller.inertiaSpin = 0.85;
        controller.inertiaTranslate = 0.85;
        controller.inertiaZoom = 0.80;

        // Depth testing & atmospheric settings
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

        // Set initial camera view to regional context (Sections 3 & 9)
        if (selectedFireRef.current) {
          const sFire = selectedFireRef.current;
          const sLat = Number(sFire.latitude);
          const sLon = Number(sFire.longitude);
          if (!isNaN(sLat) && !isNaN(sLon)) {
            viewerInstance.camera.setView({
              destination: Cesium.Cartesian3.fromDegrees(sLon, sLat - 0.15, 24000),
              orientation: {
                heading: Cesium.Math.toRadians(0),
                pitch: Cesium.Math.toRadians(-50),
                roll: 0.0
              }
            });
            setActiveCard({ type: 'thermal', data: sFire });
          }
        }

        // Camera changed telemetry tracking with exact FIRMS lock synchronization (Section 5)
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
              // Exact FIRMS coordinate lock
              targetLat = targetLatRef.current;
              targetLon = targetLonRef.current;
            } else {
              // Free camera exploration raycast pick
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
          } catch (e) {
            // Ignore telemetry frame error
          }
        };

        const removeListener = viewerInstance.camera.changed.addEventListener(updateTelemetry);
        cameraListenerRef.current = removeListener;

        // Setup ScreenSpaceEventHandler for interactive entity picking
        const handler = new Cesium.ScreenSpaceEventHandler(viewerInstance.scene.canvas);
        handler.setInputAction((click) => {
          const picked = viewerInstance.scene.pick(click.position);
          if (Cesium.defined(picked) && picked.id) {
            const entity = picked.id;
            const agniType = entity._agniType || (entity.cylinder || entity.point || entity.label || entity.polyline ? 'thermal' : null);
            const agniData = entity._agniData || selectedFireRef.current;
            if (agniType) {
              console.log('[AGNIDRISHTI 3D] Picked 3D entity:', agniType, agniData);
              setActiveCard({ type: agniType, data: agniData });
              return;
            }
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        // Reset inspection lock on user manual mouse drag
        handler.setInputAction(() => {
          isInspectingRef.current = false;
        }, Cesium.ScreenSpaceEventType.LEFT_DOWN);
        handler.setInputAction(() => {
          isInspectingRef.current = false;
        }, Cesium.ScreenSpaceEventType.RIGHT_DOWN);
        handler.setInputAction(() => {
          isInspectingRef.current = false;
        }, Cesium.ScreenSpaceEventType.MIDDLE_DOWN);

        screenHandlerRef.current = handler;
        setViewer(viewerInstance);

        // Asynchronously stream Cesium World Terrain and OSM Buildings (Sections 1, 2, 11)
        (async () => {
          let loadedTileset = null;
          let terrainLoaded = false;
          let buildingsLoaded = false;

          const hasIonToken = Boolean(ionToken && typeof ionToken === 'string' && ionToken.trim().length > 5);

          if (!hasIonToken) {
            console.warn('[AGNIDRISHTI 3D] VITE_CESIUM_ION_TOKEN missing or empty: 3D DATA UNAVAILABLE');
            terrainProviderRef.current = new Cesium.EllipsoidTerrainProvider();
            setTilesetMode('imagery_only');
            setTilesetStatusText('3D DATA UNAVAILABLE');
            return;
          }

          // Primary 3D Buildings: Cesium OSM Buildings (Section 2)
          if (viewerInstance && !viewerInstance.isDestroyed()) {
            try {
              const osmBuildings = await Cesium.createOsmBuildingsAsync({
                defaultColor: Cesium.Color.fromCssColorString('#94a3b8').withAlpha(0.85)
              });
              if (viewerInstance && !viewerInstance.isDestroyed()) {
                viewerInstance.scene.primitives.add(osmBuildings);
                loadedTileset = osmBuildings;
                buildingsLoaded = true;
                console.log('[AGNIDRISHTI 3D] OSM Buildings tileset successfully loaded into scene.');
              }
            } catch (osmErr) {
              console.error('[AGNIDRISHTI 3D] Cesium Ion OSM Buildings load error (check VITE_CESIUM_ION_TOKEN):', osmErr);
            }
          }

          if (loadedTileset) {
            try {
              loadedTileset.preloadFlightDestinations = true;
            } catch (e) {
              // ignore
            }
          }

          tilesetRef.current = loadedTileset;

          // World Terrain loading (Section 1)
          if (viewerInstance && !viewerInstance.isDestroyed()) {
            try {
              const terrain = await Cesium.createWorldTerrainAsync();
              if (viewerInstance && !viewerInstance.isDestroyed()) {
                viewerInstance.terrainProvider = terrain;
                terrainProviderRef.current = terrain;
                terrainLoaded = true;
                console.log('[AGNIDRISHTI 3D] Cesium World Terrain successfully loaded.');
              }
            } catch (terrainErr) {
              console.error('[AGNIDRISHTI 3D] Cesium World Terrain load error (check VITE_CESIUM_ION_TOKEN):', terrainErr);
              if (viewerInstance && !viewerInstance.isDestroyed()) {
                terrainProviderRef.current = new Cesium.EllipsoidTerrainProvider();
                viewerInstance.terrainProvider = terrainProviderRef.current;
              }
            }
          }

          // Compute truthful Section 11 status:
          // 3D DATA: ✓ TERRAIN + BUILDINGS
          // 3D DATA: ✓ TERRAIN
          // 3D DATA: 3D DATA UNAVAILABLE
          let finalStatus = '3D DATA UNAVAILABLE';
          let mode = 'imagery_only';

          if (terrainLoaded && buildingsLoaded) {
            finalStatus = '✓ TERRAIN + BUILDINGS';
            mode = 'osm_buildings';
          } else if (terrainLoaded) {
            finalStatus = '✓ TERRAIN';
            mode = 'terrain_imagery';
          } else if (buildingsLoaded) {
            finalStatus = '✓ BUILDINGS';
            mode = 'osm_buildings';
          } else {
            finalStatus = '3D DATA UNAVAILABLE';
            mode = 'imagery_only';
          }

          setTilesetMode(mode);
          setTilesetStatusText(finalStatus);

          // Optional OpenStreetMap road overlay layer
          if (viewerInstance && !viewerInstance.isDestroyed()) {
            try {
              const roadProvider = new Cesium.UrlTemplateImageryProvider({
                url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                subdomains: ['a', 'b', 'c']
              });
              const roadLayer = new Cesium.ImageryLayer(roadProvider, { alpha: 0.65, show: false });
              viewerInstance.imageryLayers.add(roadLayer);
              roadLayerRef.current = roadLayer;
            } catch (e) {
              // ignore
            }
          }
        })();

      } catch (err) {
        console.error('[AGNIDRISHTI 3D] Cesium initialization error:', err);
        setInitError(err.message || 'Unable to initialize 3D WebGL context.');
      }
    };

    initCesium();

    return () => {
      if (cameraListenerRef.current) {
        cameraListenerRef.current();
        cameraListenerRef.current = null;
      }
      if (screenHandlerRef.current && !screenHandlerRef.current.isDestroyed()) {
        screenHandlerRef.current.destroy();
        screenHandlerRef.current = null;
      }
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
    if (tilesetRef.current) {
      tilesetRef.current.show = showBuildings;
    }
  }, [showBuildings]);

  // Update Terrain Provider visibility
  useEffect(() => {
    const v = viewerRef.current || viewer;
    if (!v) return;
    if (showTerrain && terrainProviderRef.current) {
      v.terrainProvider = terrainProviderRef.current;
    } else {
      v.terrainProvider = new Cesium.EllipsoidTerrainProvider();
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

  // Trigger cinematic approach flight on selectedFire change or locateTrigger (Section 3)
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

  // Exact FIRMS Incident Marker: Created IMMEDIATELY on selection (Sections 7 & 8)
  useEffect(() => {
    const ds = thermalDataSourceRef.current;
    if (!ds) return;
    ds.entities.removeAll();

    if (!selectedFire || !showThermal) return;

    // Authoritative FIRMS coordinates — Single source of truth (Section 7)
    const lat = Number(selectedFire.latitude);
    const lon = Number(selectedFire.longitude);
    if (isNaN(lat) || isNaN(lon)) return;

    const frp = Math.max(5, Number(selectedFire.frp) || 20);
    const isCritical = Boolean(selectedFire.is_emergency || selectedFire.threat_level === 'CRITICAL' || selectedFire.category === 'CRITICAL_INDUSTRIAL_EMERGENCY');
    const isFlare = selectedFire.category === 'PERSISTENT_INDUSTRIAL_FLARE';

    // Dynamic severity-aware scaling (Section 8)
    const beaconHeight = Math.min(350, Math.max(160, 160 + (frp / 250) * 140));
    const groundRadius = Math.min(45, Math.max(18, 18 + (frp / 200) * 20));
    const glowPower = isCritical ? 0.42 : (isFlare ? 0.32 : 0.25);

    const color = getClassificationColor(selectedFire);
    const colorHex = isCritical ? '#EF4444' : (isFlare ? '#F59E0B' : '#EF4444');

    // Surface elevation information
    const v = viewerRef.current || viewer;
    let groundHeight = 0;
    if (v?.scene?.globe) {
      const carto = Cesium.Cartographic.fromDegrees(lon, lat);
      groundHeight = v.scene.globe.getHeight(carto) || 0;
      if (groundHeight < 0) groundHeight = 0;
    }

    const posGround = Cesium.Cartesian3.fromDegrees(lon, lat, groundHeight);
    const posBeaconTop = Cesium.Cartesian3.fromDegrees(lon, lat, groundHeight + beaconHeight);
    const posNode1 = Cesium.Cartesian3.fromDegrees(lon, lat, groundHeight + beaconHeight * 0.33);
    const posNode2 = Cesium.Cartesian3.fromDegrees(lon, lat, groundHeight + beaconHeight * 0.66);
    const posCore = Cesium.Cartesian3.fromDegrees(lon, lat, groundHeight + 12);

    // 1. Vertical Incident Beacon (Rising from FIRMS observation coordinate to sky - Section 8)
    const locatorBeam = ds.entities.add({
      polyline: {
        positions: [posGround, posBeaconTop],
        width: isCritical ? 5.5 : 4.0,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: glowPower,
          color: color.withAlpha(0.95)
        })
      }
    });
    locatorBeam._agniType = 'thermal';
    locatorBeam._agniData = selectedFire;

    // 2. Intermediate Beacon Nodes (Severity-aware vertical node stack)
    [posNode1, posNode2].forEach((nodePos) => {
      const nodeEntity = ds.entities.add({
        position: nodePos,
        point: {
          pixelSize: isCritical ? 9 : 7,
          color: color,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2.0,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        }
      });
      nodeEntity._agniType = 'thermal';
      nodeEntity._agniData = selectedFire;
    });

    // 3. Top Locator Beacon Node
    const topBeacon = ds.entities.add({
      position: posBeaconTop,
      point: {
        pixelSize: isCritical ? 11 : 8,
        color: Cesium.Color.WHITE,
        outlineColor: color,
        outlineWidth: 2.8,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      }
    });
    topBeacon._agniType = 'thermal';
    topBeacon._agniData = selectedFire;

    // 4. Ground Target Ring (Subtle circular ground ring centered exactly on FIRMS coordinate - Section 8)
    const groundRing = ds.entities.add({
      position: posGround,
      ellipse: {
        semiMinorAxis: groundRadius,
        semiMajorAxis: groundRadius,
        material: color.withAlpha(0.18),
        outline: true,
        outlineColor: Cesium.Color.WHITE.withAlpha(0.85),
        outlineWidth: 2.0,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
      }
    });
    groundRing._agniType = 'thermal';
    groundRing._agniData = selectedFire;

    // 5. Thermal Core Hotspot Point
    const thermalCore = ds.entities.add({
      position: posCore,
      point: {
        pixelSize: isCritical ? 15 : 12,
        color: Cesium.Color.fromCssColorString(colorHex),
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 3.0,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      }
    });
    thermalCore._agniType = 'thermal';
    thermalCore._agniData = selectedFire;

    // 6. Scientific Incident Information Badge (Floating cleanly above thermal point - Section 7)
    const eventId = selectedFire.event_id || selectedFire.fire_id || 'AGNI-OBSERVATION';
    const frpVal = Number(selectedFire.frp || 0).toFixed(1);
    const satVal = selectedFire.satellites_display || selectedFire.satellite || 'NOAA-21 / VIIRS';
    const cleanTime = selectedFire.acq_time ? String(selectedFire.acq_time).padStart(4, '0') : '1200';
    const timeVal = `${cleanTime.substring(0, 2)}:${cleanTime.substring(2, 4)} UTC`;
    const latStr = `${lat >= 0 ? lat.toFixed(6) + '° N' : Math.abs(lat).toFixed(6) + '° S'}`;
    const lonStr = `${lon >= 0 ? lon.toFixed(6) + '° E' : Math.abs(lon).toFixed(6) + '° W'}`;

    let facContext = 'FACILITY CONTEXT: NOT VERIFIED';
    if (selectedFire.facility_name && selectedFire.facility_name !== 'None' && selectedFire.facility_name !== 'null') {
      facContext = `OSM CONTEXT: ${selectedFire.facility_name}`;
    }

    const labelText = `EXACT FIRMS OBSERVATION (WGS84)\nEVENT: ${eventId}  |  FRP: ${frpVal} MW\nOBSERVED: ${timeVal}  |  SATELLITE: ${satVal}\n${latStr}, ${lonStr}\n${facContext}\n      │\n      ▼\n● THERMAL OBSERVATION POINT`;

    const eventLabel = ds.entities.add({
      position: posGround,
      label: {
        text: labelText,
        font: 'bold 11px "JetBrains Mono", monospace',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -64),
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

  // Real OSM Facility Polygon & Footprint Overlay (Sections 9 & 10)
  useEffect(() => {
    const ds = facilityDataSourceRef.current;
    if (!ds) return;
    ds.entities.removeAll();

    if (!showFacility || !facilities?.features || !selectedFire) return;

    // Identify real facility geometry matching selected event
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
        name: matched.properties?.name || 'OSM Verified Facility',
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

      // Facility perimeter label with "OSM VERIFIED" (Section 10)
      const firstCoord = matched.geometry.coordinates[0][0];
      const facLabel = ds.entities.add({
        position: Cesium.Cartesian3.fromDegrees(firstCoord[0], firstCoord[1], 10),
        label: {
          text: `OSM VERIFIED: ${matched.properties?.name || 'INDUSTRIAL FACILITY'}`,
          font: 'bold 10.5px "JetBrains Mono", monospace',
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

  // 3D Directional Estimated Dispersion Corridor (Sections 11, 12, 13)
  useEffect(() => {
    const ds = plumeDataSourceRef.current;
    if (!ds) return;
    ds.entities.removeAll();

    if (!showPlume || !selectedFire) return;

    // Check if real wind data is available from activePlume or selectedFire (Section 11)
    const hasActivePlumeCoords = Boolean(activePlume?.geometry?.coordinates?.[0]?.length > 2);
    const hasFireWind = selectedFire.wind_direction_deg != null && !isNaN(Number(selectedFire.wind_direction_deg));

    if (!hasActivePlumeCoords && !hasFireWind) {
      // Section 12: If wind data is unavailable, do not display a fake plume
      return;
    }

    const lat = Number(selectedFire.latitude);
    const lon = Number(selectedFire.longitude);
    if (isNaN(lat) || isNaN(lon)) return;

    let flatCoords = [];
    let centerlinePositions = [];
    let downwindDeg = null;

    if (hasActivePlumeCoords) {
      const ring = activePlume.geometry.coordinates[0];
      ring.forEach(([pLon, pLat]) => {
        flatCoords.push(pLon, pLat);
      });
      downwindDeg = activePlume.properties?.downwind_azimuth_deg != null
        ? Math.round(activePlume.properties.downwind_azimuth_deg)
        : Math.round((Number(selectedFire.wind_direction_deg || 0) + 180) % 360);
      if (activePlume.properties?.centerline) {
        centerlinePositions = activePlume.properties.centerline.map(([cLat, cLon]) => Cesium.Cartesian3.fromDegrees(cLon, cLat, 8));
      }
    } else if (hasFireWind) {
      const windSpeed = Math.max(2.0, Number(selectedFire.wind_speed_kmh) || 10.0);
      const windDeg = Number(selectedFire.wind_direction_deg);
      downwindDeg = Math.round((windDeg + 180.0) % 360.0);
      const plumeLengthKm = Math.min(25.0, Math.max(3.0, (windSpeed * 0.45) + (Number(selectedFire.frp || 20) * 0.02)));

      const plumeGeo = createDirectionalPlume(lat, lon, downwindDeg, plumeLengthKm);
      plumeGeo.leafletPositions.forEach(([pLat, pLon]) => {
        flatCoords.push(pLon, pLat);
      });
      centerlinePositions = plumeGeo.centerline.map(([cLat, cLon]) => Cesium.Cartesian3.fromDegrees(cLon, cLat, 8));
    }

    if (flatCoords.length < 6) return;

    // 1. Directional ground corridor (widening wedge, semi-transparent)
    ds.entities.add({
      name: 'Estimated Dispersion Corridor',
      polygon: {
        hierarchy: Cesium.Cartesian3.fromDegreesArray(flatCoords),
        material: Cesium.Color.fromCssColorString('#F97316').withAlpha(0.20),
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString('#FB923C').withAlpha(0.75),
        outlineWidth: 2.0,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
      }
    });

    // 2. Downwind directional centerline vector
    if (centerlinePositions.length >= 2) {
      ds.entities.add({
        name: 'Dispersion Centerline',
        polyline: {
          positions: centerlinePositions,
          width: 3.0,
          material: new Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.25,
            color: Cesium.Color.fromCssColorString('#FDBA74').withAlpha(0.85)
          })
        }
      });
    }

    // 3. Directional dispersion label badge
    if (downwindDeg != null) {
      const leadLon = flatCoords[Math.floor(flatCoords.length / 2)];
      const leadLat = flatCoords[Math.floor(flatCoords.length / 2) + 1];
      if (leadLon != null && leadLat != null) {
        ds.entities.add({
          position: Cesium.Cartesian3.fromDegrees(leadLon, leadLat, 15),
          label: {
            text: `ESTIMATED DISPERSION (DOWNWIND: ${downwindDeg}°)`,
            font: 'bold 9.5px "JetBrains Mono", monospace',
            fillColor: Cesium.Color.fromCssColorString('#FED7AA'),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2.5,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          }
        });
      }

      // 4. Subtle directional wind indicator originating from the incident (Section 7)
      const windSpeed = Number(selectedFire.wind_speed_kmh) || 12.0;
      const arrowLenMeters = Math.min(400, Math.max(140, windSpeed * 18));
      const blowRad = Cesium.Math.toRadians(downwindDeg);
      const endLat = lat + (arrowLenMeters * Math.cos(blowRad)) / 111320;
      const endLon = lon + (arrowLenMeters * Math.sin(blowRad)) / (111320 * Math.cos(lat * Math.PI / 180));

      ds.entities.add({
        name: 'Surface Wind Vector Indicator',
        polyline: {
          positions: [
            Cesium.Cartesian3.fromDegrees(lon, lat, 14),
            Cesium.Cartesian3.fromDegrees(endLon, endLat, 14)
          ],
          width: 4.0,
          material: new Cesium.PolylineArrowMaterialProperty(
            Cesium.Color.fromCssColorString('#38BDF8').withAlpha(0.85)
          )
        }
      });
    }
  }, [viewer, activePlume, selectedFire, showPlume]);

  // Sensitive Receptors (Settlements, Schools, Hospitals)
  useEffect(() => {
    const ds = receptorsDataSourceRef.current;
    if (!ds) return;
    ds.entities.removeAll();

    if (!showReceptors || !selectedFire) return;

    const exposure = activePlume?.properties?.community_exposure || selectedFire.community_exposure;
    if (!exposure) return;

    const corridorReceptors = [
      ...(exposure.intersecting_settlements || []).map(s => ({ ...s, type: 'settlement' })),
      ...(exposure.intersecting_schools || []).map(s => ({ ...s, type: 'school' })),
      ...(exposure.intersecting_hospitals || []).map(h => ({ ...h, type: 'hospital' }))
    ];

    if (corridorReceptors.length === 0) return;

    corridorReceptors.forEach((rec) => {
      const lat = Number(rec.latitude);
      const lon = Number(rec.longitude);
      if (isNaN(lat) || isNaN(lon)) return;

      const type = rec.type;
      let color = Cesium.Color.fromCssColorString('#38BDF8'); // Settlement (Sky blue)
      if (type === 'school') color = Cesium.Color.fromCssColorString('#c084fc'); // School (Purple)
      if (type === 'hospital') color = Cesium.Color.fromCssColorString('#F43F5E'); // Hospital (Rose)

      const labelText = `[IN PLUME] ${rec.name} (${rec.distance_km} km)`;

      const receptorEntity = ds.entities.add({
        position: Cesium.Cartesian3.fromDegrees(lon, lat, 20),
        point: {
          pixelSize: 9,
          color: color,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 1.5,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        },
        label: {
          text: labelText,
          font: 'bold 10px monospace',
          fillColor: Cesium.Color.fromCssColorString('#FCA5A5'),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -8),
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        }
      });

      receptorEntity.receptorData = {
        name: rec.name,
        type: type.toUpperCase(),
        category: rec.category,
        distance_km: rec.distance_km,
        source: rec.is_live_osm ? 'Live OpenStreetMap' : 'Curated receptor coverage - demonstration dataset',
        isIntersecting: true
      };
    });
  }, [viewer, selectedFire, activePlume, showReceptors]);

  // Error Fallback UI (Only shown if WebGL completely fails to initialize)
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
          onClick={onExit3D}
          className="px-4 py-2 bg-white/[0.08] hover:bg-white/[0.15] text-white rounded-lg border border-white/20 transition-all font-mono text-xs cursor-pointer flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>RETURN TO 2D</span>
        </button>
      </div>
    );
  }

  const isDemo = selectedFire?.is_demo || selectedFire?.fire_id?.includes('DEMO');

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#080b10] select-none">
      {/* Cesium Canvas Container — ALWAYS 100% VISIBLE (Section 1) */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Non-Blocking Compact Flight HUD — NO FULLSCREEN OVERLAY (Sections 1, 2, 26) */}
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
                {selectedFire ? `${Number(selectedFire.latitude).toFixed(6)}° N   ${Number(selectedFire.longitude).toFixed(6)}° E` : ''}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Floating Action Bar */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2.5 flex-wrap">
        {/* Return to 2D Button */}
        <button
          id="btn-exit-3d"
          onClick={onExit3D}
          className="px-3 py-2 rounded-lg bg-[#0b101b]/90 hover:bg-[#131b2e] text-slate-200 hover:text-white border border-white/15 backdrop-blur-md shadow-lg transition-all font-mono text-xs font-semibold flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
          <span>2D VIEW / EXIT 3D</span>
        </button>

        {/* Locate Selected Event Button */}
        <button
          id="btn-locate-event-top"
          onClick={handleRecenterIncident}
          disabled={!selectedFire}
          className="px-3 py-2 rounded-lg bg-cyan-950/80 hover:bg-cyan-900/90 text-cyan-200 hover:text-cyan-100 border border-cyan-500/50 backdrop-blur-md shadow-lg transition-all font-mono text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
          <span>LOCATE EVENT</span>
        </button>

        {/* Incident Details Panel Toggle */}
        {selectedFire && (
          <button
            id="btn-toggle-card"
            onClick={() => setActiveCard(activeCard ? null : { type: 'thermal', data: selectedFire })}
            className={`px-3 py-2 rounded-lg border backdrop-blur-md shadow-lg transition-all font-mono text-xs font-semibold flex items-center gap-2 cursor-pointer ${
              activeCard
                ? 'bg-red-950/80 text-red-200 border-red-500/50'
                : 'bg-[#0b101b]/90 text-slate-300 border-white/15 hover:text-white hover:bg-[#131b2e]'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-red-400" />
            <span>{activeCard ? 'HIDE DETAILS' : 'INCIDENT DETAILS'}</span>
          </button>
        )}

        {/* Layer Controls Dropdown Toggle */}
        <div className="relative">
          <button
            id="btn-toggle-layers"
            onClick={() => setLayersMenuOpen(!layersMenuOpen)}
            className={`px-3 py-2 rounded-lg border backdrop-blur-md shadow-lg transition-all font-mono text-xs font-semibold flex items-center gap-2 cursor-pointer ${
              layersMenuOpen
                ? 'bg-white/[0.14] text-white border-white/30'
                : 'bg-[#0b101b]/90 text-slate-300 border-white/15 hover:text-white hover:bg-[#131b2e]'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>3D LAYERS</span>
          </button>

          {/* Layer Controls Popover */}
          {layersMenuOpen && (
            <div className="absolute left-0 mt-2 w-64 rounded-lg bg-[#0b101b]/95 border border-white/15 shadow-2xl backdrop-blur-xl p-2.5 z-40 space-y-1 font-sans text-xs">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-2 py-1 border-b border-white/10 mb-1 flex items-center justify-between">
                <span>3D Geospatial Layers</span>
                <span className="text-cyan-400 text-[9px] font-semibold">{tilesetMode.toUpperCase()}</span>
              </div>

              {/* World Terrain */}
              <label className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-white/[0.06] cursor-pointer text-slate-200">
                <span className="flex items-center gap-2">
                  <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                  <span>World Terrain</span>
                </span>
                <input
                  type="checkbox"
                  checked={showTerrain}
                  onChange={(e) => setShowTerrain(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-cyan-500 cursor-pointer"
                />
              </label>

              {/* OSM Buildings */}
              <label className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-white/[0.06] cursor-pointer text-slate-200">
                <span className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>OSM Buildings</span>
                </span>
                <input
                  type="checkbox"
                  checked={showBuildings}
                  disabled={!tilesetRef.current}
                  onChange={(e) => setShowBuildings(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-cyan-500 cursor-pointer disabled:opacity-40"
                />
              </label>

              {/* Satellite Imagery */}
              <label className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-white/[0.06] cursor-pointer text-slate-200">
                <span className="flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5 text-blue-400" />
                  <span>Satellite Imagery</span>
                </span>
                <input
                  type="checkbox"
                  checked={showSatellite}
                  onChange={(e) => setShowSatellite(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-cyan-500 cursor-pointer"
                />
              </label>

              {/* Exact FIRMS Observation */}
              <label className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-white/[0.06] cursor-pointer text-slate-200">
                <span className="flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                  <span>Exact FIRMS Observation</span>
                </span>
                <input
                  type="checkbox"
                  checked={showThermal}
                  onChange={(e) => setShowThermal(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-cyan-500 cursor-pointer"
                />
              </label>

              {/* Facility Footprint */}
              <label className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-white/[0.06] cursor-pointer text-slate-200">
                <span className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Facility Footprint</span>
                </span>
                <input
                  type="checkbox"
                  checked={showFacility}
                  onChange={(e) => setShowFacility(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-cyan-500 cursor-pointer"
                />
              </label>

              {/* Estimated Dispersion */}
              <label className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-white/[0.06] cursor-pointer text-slate-200">
                <span className="flex items-center gap-2">
                  <Wind className="w-3.5 h-3.5 text-orange-400" />
                  <span>Estimated Dispersion</span>
                </span>
                <input
                  type="checkbox"
                  checked={showPlume}
                  onChange={(e) => setShowPlume(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-cyan-500 cursor-pointer"
                />
              </label>

              {/* Sensitive Receptors */}
              <label className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-white/[0.06] cursor-pointer text-slate-200">
                <span className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-sky-400" />
                  <span>Sensitive Receptors</span>
                </span>
                <input
                  type="checkbox"
                  checked={showReceptors}
                  onChange={(e) => setShowReceptors(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-cyan-500 cursor-pointer"
                />
              </label>

              {/* Roads & Boundaries */}
              <label className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-white/[0.06] cursor-pointer text-slate-200">
                <span className="flex items-center gap-2">
                  <Compass className="w-3.5 h-3.5 text-slate-400" />
                  <span>Roads & Boundaries</span>
                </span>
                <input
                  type="checkbox"
                  checked={showRoads}
                  onChange={(e) => setShowRoads(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-cyan-500 cursor-pointer"
                />
              </label>
            </div>
          )}
        </div>

        {/* Non-Blocking 3D Data Status Pill (Section 11) */}
        <div className="px-2.5 py-1.5 rounded-lg bg-[#0b101b]/90 border border-white/15 backdrop-blur-md shadow-lg flex items-center gap-1.5 text-[10px] font-mono text-slate-300">
          <span className="text-slate-400">3D DATA:</span>
          <span className={`font-bold tracking-wide ${
            tilesetStatusText.includes('UNAVAILABLE') 
              ? 'text-amber-400/90' 
              : 'text-cyan-300'
          }`}>
            {tilesetStatusText}
          </span>
        </div>
      </div>

      {/* Vertical GIS Navigation Toolbar (Left Side) */}
      <div 
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        className="absolute top-20 left-4 z-20 pointer-events-auto flex flex-col items-center bg-[#0b101b]/95 border border-white/20 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden p-1.5 space-y-1 text-slate-300 select-none"
      >
        {/* Zoom In */}
        <button
          type="button"
          id="btn-zoom-in"
          onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
          title="Zoom In (+)"
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:text-white hover:bg-white/15 active:bg-cyan-500/30 active:scale-95 transition-all cursor-pointer font-bold text-base"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Zoom Out */}
        <button
          type="button"
          id="btn-zoom-out"
          onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
          title="Zoom Out (−)"
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:text-white hover:bg-white/15 active:bg-cyan-500/30 active:scale-95 transition-all cursor-pointer font-bold text-base"
        >
          <Minus className="w-4 h-4" />
        </button>

        <div className="w-5 h-[1px] bg-white/15 my-0.5" />

        {/* Recenter on Incident / Home */}
        <button
          type="button"
          id="btn-reset-home"
          onClick={(e) => { e.stopPropagation(); handleResetHome(); }}
          title="Home - Regional Overview"
          disabled={!selectedFire}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:text-cyan-300 hover:bg-white/15 active:bg-cyan-500/30 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
        >
          <Home className="w-4 h-4" />
        </button>

        {/* Locate Active Anomaly */}
        <button
          type="button"
          id="btn-locate-event"
          onClick={(e) => { e.stopPropagation(); handleRecenterIncident(); }}
          title="Locate Incident (Cinematic 3D Flight)"
          disabled={!selectedFire}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:text-cyan-300 hover:bg-white/15 active:bg-cyan-500/30 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
        >
          <Crosshair className="w-4 h-4 text-cyan-400" />
        </button>

        <div className="w-5 h-[1px] bg-white/15 my-0.5" />

        {/* Expand/Collapse Directional Pan Cluster */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setNavControlsExpanded(!navControlsExpanded); }}
          title={navControlsExpanded ? "Hide Pan Controls" : "Show Pan Controls"}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:text-white hover:bg-white/15 transition-all cursor-pointer text-slate-400"
        >
          <Navigation className="w-3.5 h-3.5 text-cyan-400" />
        </button>

        {navControlsExpanded && (
          <div className="pt-1 pb-1 flex flex-col items-center gap-1 border-t border-white/10 mt-1">
            {/* Pan North */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handlePan('north'); }}
              title="Pan North"
              className="w-7 h-7 flex items-center justify-center rounded bg-white/[0.04] hover:bg-white/15 hover:text-white active:scale-95 transition-all cursor-pointer"
            >
              <ChevronUp className="w-4 h-4" />
            </button>

            {/* Pan West & East */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handlePan('west'); }}
                title="Pan West"
                className="w-7 h-7 flex items-center justify-center rounded bg-white/[0.04] hover:bg-white/15 hover:text-white active:scale-95 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handlePan('east'); }}
                title="Pan East"
                className="w-7 h-7 flex items-center justify-center rounded bg-white/[0.04] hover:bg-white/15 hover:text-white active:scale-95 transition-all cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Pan South */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handlePan('south'); }}
              title="Pan South"
              className="w-7 h-7 flex items-center justify-center rounded bg-white/[0.04] hover:bg-white/15 hover:text-white active:scale-95 transition-all cursor-pointer"
            >
              <ChevronDown className="w-4 h-4" />
            </button>

            <div className="w-5 h-[1px] bg-white/15 my-1" />

            {/* Orbit Left & Right */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleOrbit('left'); }}
                title="Orbit Left"
                className="w-7 h-7 flex items-center justify-center rounded bg-white/[0.04] hover:bg-white/15 hover:text-cyan-300 active:scale-95 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleOrbit('right'); }}
                title="Orbit Right"
                className="w-7 h-7 flex items-center justify-center rounded bg-white/[0.04] hover:bg-white/15 hover:text-cyan-300 active:scale-95 transition-all cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Tilt Up & Down */}
            <div className="flex items-center gap-1 mt-0.5">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleTilt('up'); }}
                title="Tilt Up"
                className="w-7 h-7 flex items-center justify-center rounded bg-white/[0.04] hover:bg-white/15 hover:text-amber-300 active:scale-95 font-mono text-[9px] font-bold cursor-pointer"
              >
                ▲T
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleTilt('down'); }}
                title="Tilt Down"
                className="w-7 h-7 flex items-center justify-center rounded bg-white/[0.04] hover:bg-white/15 hover:text-amber-300 active:scale-95 font-mono text-[9px] font-bold cursor-pointer"
              >
                ▼T
              </button>
            </div>
          </div>
        )}

        <div className="w-5 h-[1px] bg-white/15 my-0.5" />

        {/* Reset North / Compass */}
        <button
          type="button"
          id="btn-reset-north"
          onClick={(e) => { e.stopPropagation(); handleResetNorth(); }}
          title="Reset Camera North"
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:text-amber-400 hover:bg-white/15 active:scale-95 transition-all cursor-pointer"
        >
          <Compass className="w-4 h-4 text-amber-400" />
        </button>
      </div>

      {/* On-Canvas Incident Information Panel */}
      {activeCard && (
        <div className="absolute top-20 left-16 z-30 w-84 max-w-[calc(100vw-5rem)] rounded-xl bg-[#0b101b]/95 border border-white/20 shadow-2xl backdrop-blur-xl p-4 font-sans text-xs text-slate-200">
          <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-white/10">
            {activeCard.type === 'thermal' && (
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <span className="w-2 h-2 rounded-full bg-red-500 -ml-3.5" />
                  <span className="font-mono font-bold text-white text-xs tracking-wider">
                    {activeCard.data.event_id || activeCard.data.fire_id}
                  </span>
                  <span className={`ml-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold border ${
                    activeCard.data.is_emergency
                      ? 'bg-red-500/20 text-red-300 border-red-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}>
                    {activeCard.data.threat_level || (activeCard.data.is_emergency ? 'CRITICAL' : 'INDUSTRIAL')}
                  </span>
                </div>
                <div className="text-[11px] text-slate-200 font-semibold">
                  {activeCard.data.facility_name && activeCard.data.facility_name !== 'None' ? activeCard.data.facility_name : 'NO VERIFIED FACILITY MATCH'}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {activeCard.data.location?.district ? `${activeCard.data.location.district}, ${activeCard.data.location.state}` : 'India Subcontinent Zone'}
                </div>
              </div>
            )}

            {activeCard.type === 'facility' && (
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Building2 className="w-4 h-4 text-amber-400" />
                  <span className="font-mono font-bold text-amber-300 text-xs tracking-wider">
                    INDUSTRIAL FACILITY
                  </span>
                </div>
                <div className="text-[11px] text-white font-semibold">
                  {activeCard.data.name}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {activeCard.data.category || 'Refining & Heavy Industry'}
                </div>
              </div>
            )}

            {activeCard.type === 'receptor' && (
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <MapPin className="w-4 h-4 text-sky-400" />
                  <span className="font-mono font-bold text-sky-300 text-xs tracking-wider uppercase">
                    {activeCard.data.type || 'SENSITIVE RECEPTOR'}
                  </span>
                </div>
                <div className="text-[11px] text-white font-semibold">
                  {activeCard.data.name}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {activeCard.data.category || activeCard.data.district}
                </div>
              </div>
            )}

            <button
              id="btn-close-card"
              onClick={() => setActiveCard(null)}
              className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Demonstration Mode Badge if applicable */}
          {isDemo && (
            <div className="mt-2 px-2 py-1 rounded bg-blue-950/60 border border-blue-500/40 text-[9.5px] font-mono text-blue-300">
              DEMONSTRATION SCENARIO — CURATED TELEMETRY
            </div>
          )}

          {/* Card Body with Authentic FIRMS Parameters */}
          <div className="py-2.5 space-y-2 font-mono text-[11px]">
            {activeCard.type === 'thermal' && (
              <>
                <div className="grid grid-cols-2 gap-2 bg-black/40 p-2 rounded border border-white/5">
                  <div>
                    <span className="text-[9.5px] text-slate-400 block">FIRE RADIATIVE POWER</span>
                    <span className="text-amber-400 font-bold text-xs">{Number(activeCard.data.frp || 0).toFixed(1)} MW</span>
                  </div>
                  <div>
                    <span className="text-[9.5px] text-slate-400 block">BRIGHTNESS TEMP</span>
                    <span className="text-orange-300 font-bold text-xs">{Number(activeCard.data.brightness || activeCard.data.bright_ti4 || 345.2).toFixed(1)} K</span>
                  </div>
                </div>

                <div className="text-[10px] space-y-1 text-slate-300 bg-white/[0.02] p-2 rounded border border-white/5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">LATITUDE:</span>
                    <span className="text-slate-100 font-semibold">{Number(activeCard.data.latitude).toFixed(6)}° N</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">LONGITUDE:</span>
                    <span className="text-slate-100 font-semibold">{Number(activeCard.data.longitude).toFixed(6)}° E</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">SATELLITE:</span>
                    <span className="text-slate-200">{activeCard.data.satellites_display || (activeCard.data.satellite ? `${activeCard.data.satellite} / VIIRS` : 'NOAA-21 / VIIRS')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">OBSERVATION:</span>
                    <span className="text-slate-200">{formatUtcTime(activeCard.data.acq_date, activeCard.data.acq_time)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">CONFIDENCE:</span>
                    <span className="text-emerald-400 font-semibold">
                      {formatConfidence(activeCard.data.confidence)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">CLASSIFICATION:</span>
                    <span className="text-amber-300 font-semibold">{activeCard.data.category?.replace(/_/g, ' ') || 'Industrial Incident'}</span>
                  </div>
                  {activeCard.data.anomaly_ratio && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">ANOMALY RATIO:</span>
                      <span className="text-red-400 font-bold">{Number(activeCard.data.anomaly_ratio).toFixed(2)}× Baseline</span>
                    </div>
                  )}
                </div>

                <div className="pt-1 flex items-center gap-2">
                  <button
                    id="btn-card-locate"
                    onClick={() => flyToIncident(activeCard.data)}
                    className="flex-1 py-1.5 rounded bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-200 hover:text-cyan-100 font-semibold text-[10px] tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Crosshair className="w-3 h-3 text-cyan-400" />
                    <span>RECENTER ON INCIDENT</span>
                  </button>
                  {onOpenReport && (
                    <button
                      id="btn-card-open-incident"
                      onClick={() => onOpenReport(activeCard.data)}
                      className="flex-1 py-1.5 rounded bg-white/[0.08] hover:bg-white/[0.15] border border-white/20 text-white font-semibold text-[10px] tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <FileText className="w-3 h-3 text-cyan-400" />
                      <span>VIEW INCIDENT ASSESSMENT</span>
                    </button>
                  )}
                </div>
              </>
            )}

            {activeCard.type === 'facility' && (
              <>
                <div className="text-[10px] space-y-1.5 text-slate-300 bg-black/40 p-2 rounded border border-white/5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">CATEGORY:</span>
                    <span className="text-slate-200">{activeCard.data.category || 'Heavy Industry / Refining'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">DISTRICT / STATE:</span>
                    <span className="text-slate-200">{activeCard.data.district || 'District'}, {activeCard.data.state || 'India'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">BASELINE FRP:</span>
                    <span className="text-amber-300 font-semibold">{activeCard.data.baseline_frp_mw || 45.0} MW</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">SOURCE:</span>
                    <span className="text-amber-300 font-semibold">OpenStreetMap Verified Perimeter</span>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    onClick={() => flyToIncident(selectedFire)}
                    className="w-full py-1.5 rounded bg-amber-950/70 hover:bg-amber-900 border border-amber-500/50 text-amber-200 hover:text-amber-100 font-semibold text-[10px] tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Crosshair className="w-3 h-3" />
                    <span>FOCUS ON THERMAL EVENT</span>
                  </button>
                </div>
              </>
            )}

            {activeCard.type === 'receptor' && (
              <>
                <div className="text-[10px] space-y-1.5 text-slate-300 bg-black/40 p-2 rounded border border-white/5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">EXPOSURE STATUS:</span>
                    <span className="font-semibold text-red-400">IN ESTIMATED DISPERSION CORRIDOR</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">DISTANCE TO FIRE:</span>
                    <span className="text-slate-200 font-semibold">{activeCard.data.distance_km ? `${activeCard.data.distance_km} km` : 'Near Anomaly'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">SOURCE:</span>
                    <span className="text-slate-300">{activeCard.data.source}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Camera Accuracy & Coordinate Telemetry Verification HUD (Section 5) */}
      <div className="absolute bottom-3 left-4 z-20 pointer-events-auto flex items-center gap-3 text-[10.5px] font-mono text-slate-300 bg-[#0b101b]/95 px-3 py-1.5 rounded-lg border border-white/15 backdrop-blur-md shadow-xl flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-slate-400">EVENT COORDS:</span>
          <span className="text-white font-bold">
            {selectedFire ? `${Number(selectedFire.latitude).toFixed(6)}° N, ${Number(selectedFire.longitude).toFixed(6)}° E` : 'SELECT EVENT'}
          </span>
        </div>
        <div className="h-3 w-[1px] bg-white/15" />
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">INCIDENT TARGET:</span>
          <span className="text-cyan-300 font-bold">
            {cameraTelemetry.targetLat != null ? `${cameraTelemetry.targetLat.toFixed(6)}° N, ${cameraTelemetry.targetLon.toFixed(6)}° E` : (selectedFire ? `${Number(selectedFire.latitude).toFixed(6)}° N, ${Number(selectedFire.longitude).toFixed(6)}° E` : 'TRACKING...')}
          </span>
        </div>
        <div className="h-3 w-[1px] bg-white/15" />
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">ALT:</span>
          <span className="text-slate-200">{cameraTelemetry.altitude ? `${cameraTelemetry.altitude.toLocaleString()}m` : '240m'}</span>
        </div>
        <div className="h-3 w-[1px] bg-white/15" />
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">PITCH:</span>
          <span className="text-amber-300 font-semibold">{cameraTelemetry.pitch != null ? `${cameraTelemetry.pitch}°` : '-58°'}</span>
        </div>
        <div className="h-3 w-[1px] bg-white/15" />
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">DATA:</span>
          <span className="text-emerald-400 font-semibold">{tilesetStatusText}</span>
        </div>
      </div>

      {/* Right Side Compact 3D Incident Inspector Overlay (Section 18) — REMAINS VISIBLE DURING FLIGHT */}
      {selectedFire && (
        <div className="absolute top-4 right-4 bottom-12 z-20 flex pointer-events-none">
          {inspectorExpanded ? (
            <div className="pointer-events-auto h-full flex shadow-2xl">
              <Cesium3DInspector
                fire={selectedFire}
                activePlume={activePlume}
                isFlying={isFlying}
                onLocateEvent={handleRecenterIncident}
                onExit3D={onExit3D}
                onTogglePlume={onTogglePlume}
                isPlumeActive={isPlumeActive}
                plumeLoading={plumeLoading}
                onOpenReport={onOpenReport}
                onCollapse={() => setInspectorExpanded(false)}
              />
            </div>
          ) : (
            <button
              onClick={() => setInspectorExpanded(true)}
              className="pointer-events-auto self-start px-3 py-2 rounded-lg bg-[#0b101b]/95 hover:bg-[#131b2e] border border-cyan-500/40 text-cyan-300 font-mono text-xs font-semibold shadow-2xl backdrop-blur-md transition-all flex items-center gap-2 cursor-pointer"
              title="Open 3D Incident Inspector"
            >
              <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>3D INSPECTOR</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
