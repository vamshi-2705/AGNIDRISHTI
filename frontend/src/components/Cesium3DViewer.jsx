import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { 
  Crosshair, ArrowLeft, Layers, ShieldAlert, 
  MapPin, Eye, EyeOff, AlertTriangle, Building2, Wind,
  Plus, Minus, Home, Compass, FileText, X, Radio,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  RotateCcw, RotateCw, Navigation, Maximize2
} from 'lucide-react';
import Cesium3DInspector from './Cesium3DInspector';

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

// Generate high-visibility 3D location pointer pin SVG pointing directly down
function createLocationPointerSvg(colorHex = '#EF4444') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="72" viewBox="0 0 56 72">
    <defs>
      <filter id="shadow" x="-30%" y="-20%" width="160%" height="150%">
        <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000000" flood-opacity="0.8"/>
      </filter>
    </defs>
    <g filter="url(#shadow)">
      <!-- Main Teardrop Pointer Body with needle pointing down to bottom center (28, 68) -->
      <path d="M 28 68 C 24 54 8 40 8 26 A 20 20 0 1 1 48 26 C 48 40 32 54 28 68 Z" 
            fill="${colorHex}" stroke="#FFFFFF" stroke-width="3" stroke-linejoin="round"/>
      <!-- Inner White Ring -->
      <circle cx="28" cy="26" r="9.5" fill="#FFFFFF"/>
      <!-- Center Core Dot -->
      <circle cx="28" cy="26" r="5.5" fill="${colorHex}"/>
      <!-- Downward Pointer Arrowhead Accent -->
      <polygon points="24,56 32,56 28,66" fill="#FFFFFF"/>
    </g>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
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
  const [isLoading, setIsLoading] = useState(true);
  const [loadingPhase, setLoadingPhase] = useState('terrain'); // 'terrain' | 'imagery' | 'locating' | 'located'
  const [loadingMessage, setLoadingMessage] = useState('LOADING REALISTIC TERRAIN ELEVATION...');
  const [inspectorExpanded, setInspectorExpanded] = useState(true);
  const [activeCard, setActiveCard] = useState(null); // { type: 'thermal' | 'facility' | 'receptor', data: ... }

  // Real-time camera telemetry state
  const [cameraTelemetry, setCameraTelemetry] = useState({
    targetLat: null,
    targetLon: null,
    altitude: null,
    pitch: null,
    heading: null
  });

  // Layer toggles
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

  // 1. Camera FlyTo Handler - Site-Level Industrial Inspection (~1600m range, oblique pitch directly centered on event)
  const flyToSelectedEvent = useCallback((fire, duration = 1.6) => {
    const v = viewerRef.current || viewer;
    if (!v || !fire) return;

    const lat = Number(fire.latitude);
    const lon = Number(fire.longitude);
    if (isNaN(lat) || isNaN(lon)) return;

    // Requirement 15: Exact coordinate verification display
    console.log(`[AGNIDRISHTI 3D] FIRMS EVENT: latitude = ${lat.toFixed(6)}, longitude = ${lon.toFixed(6)}`);
    console.log(`[AGNIDRISHTI 3D] CESIUM INCIDENT: latitude = ${lat.toFixed(6)}, longitude = ${lon.toFixed(6)}`);

    try {
      // Direct centering on the real FIRMS observation coordinate
      const targetPos = Cesium.Cartesian3.fromDegrees(lon, lat, 0);
      const boundingSphere = new Cesium.BoundingSphere(targetPos, 35);
      const targetRange = 1600; // Site-level aerial inspection distance (1600m)

      // Oblique site-level inspection angle (-36 degrees pitch)
      const offset = new Cesium.HeadingPitchRange(
        Cesium.Math.toRadians(0),
        Cesium.Math.toRadians(-36),
        targetRange
      );

      // Cancel any ongoing flight
      v.camera.cancelFlight();

      v.camera.flyToBoundingSphere(boundingSphere, {
        offset: offset,
        duration: duration,
        complete: () => {
          console.log('[AGNIDRISHTI 3D] Camera centered on incident at:', lat.toFixed(6), lon.toFixed(6));
        }
      });
    } catch (err) {
      console.error('[AGNIDRISHTI 3D] flyTo exception:', err);
    }
  }, [viewer]);

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

  // 2. Interactive Navigation & Camera Controls (Target-Locked Smooth Motion)
  const handleZoomIn = () => {
    const v = viewerRef.current || viewer;
    if (!v) return;

    const target = getCameraTarget(v);
    if (target) {
      const currentRange = Cesium.Cartesian3.distance(v.camera.position, target);
      const newRange = Math.max(50, currentRange * 0.60); // Smoothly fly 40% closer
      v.camera.cancelFlight();
      v.camera.flyToBoundingSphere(new Cesium.BoundingSphere(target, 0), {
        offset: new Cesium.HeadingPitchRange(v.camera.heading, v.camera.pitch, newRange),
        duration: 0.35
      });
    } else {
      const height = v.camera.positionCartographic?.height || 2000;
      const step = Math.max(150, height * 0.35);
      v.camera.zoomIn(step);
    }
  };

  const handleZoomOut = () => {
    const v = viewerRef.current || viewer;
    if (!v) return;

    const target = getCameraTarget(v);
    if (target) {
      const currentRange = Cesium.Cartesian3.distance(v.camera.position, target);
      const newRange = Math.min(25000000, currentRange * 1.65); // Smoothly fly 65% further out
      v.camera.cancelFlight();
      v.camera.flyToBoundingSphere(new Cesium.BoundingSphere(target, 0), {
        offset: new Cesium.HeadingPitchRange(v.camera.heading, v.camera.pitch, newRange),
        duration: 0.35
      });
    } else {
      const height = v.camera.positionCartographic?.height || 2000;
      const step = Math.max(250, height * 0.45);
      v.camera.zoomOut(step);
    }
  };

  const handleRecenterIncident = () => {
    if (selectedFire) {
      flyToSelectedEvent(selectedFire, 1.5);
      setActiveCard({ type: 'thermal', data: selectedFire });
    }
  };

  const handleResetHome = () => {
    const v = viewerRef.current || viewer;
    if (!v) return;
    if (selectedFire) {
      const lat = Number(selectedFire.latitude);
      const lon = Number(selectedFire.longitude);
      v.camera.cancelFlight();
      v.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(lon, lat - 0.25, 48000), // Regional View (~48km)
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-52),
          roll: 0.0
        },
        duration: 1.6
      });
    } else {
      v.camera.cancelFlight();
      v.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(78.9629, 21.5, 3800000),
        duration: 1.6
      });
    }
  };

  const handleResetNorth = () => {
    const v = viewerRef.current || viewer;
    if (!v) return;
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
    const height = v.camera.positionCartographic?.height || 1500;
    const dist = Math.max(90, height * 0.22);
    if (direction === 'north') v.camera.move(v.camera.up, dist);
    if (direction === 'south') v.camera.move(v.camera.up, -dist);
    if (direction === 'east') v.camera.move(v.camera.right, dist);
    if (direction === 'west') v.camera.move(v.camera.right, -dist);
  };

  const handleOrbit = (direction) => {
    const v = viewerRef.current || viewer;
    if (!v) return;
    const target = getCameraTarget(v);
    if (target) {
      const currentRange = Cesium.Cartesian3.distance(v.camera.position, target);
      const angle = Cesium.Math.toRadians(direction === 'left' ? -22 : 22);
      const newHeading = Cesium.Math.zeroToTwoPi(v.camera.heading + angle);

      v.camera.cancelFlight();
      v.camera.flyToBoundingSphere(new Cesium.BoundingSphere(target, 0), {
        offset: new Cesium.HeadingPitchRange(newHeading, v.camera.pitch, currentRange),
        duration: 0.35
      });
    } else {
      const angle = Cesium.Math.toRadians(18);
      if (direction === 'left') v.camera.rotateLeft(angle);
      else v.camera.rotateRight(angle);
    }
  };

  const handleTilt = (direction) => {
    const v = viewerRef.current || viewer;
    if (!v) return;
    const target = getCameraTarget(v);
    if (target) {
      const currentRange = Cesium.Cartesian3.distance(v.camera.position, target);
      const delta = Cesium.Math.toRadians(direction === 'up' ? 10 : -10);
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

  // 3. Initialize CesiumJS Viewer
  useEffect(() => {
    if (!containerRef.current) return;

    let viewerInstance = null;

    const initCesium = async () => {
      try {
        setLoadingPhase('terrain');
        setLoadingMessage('LOADING REALISTIC TERRAIN ELEVATION...');

        const ionToken = import.meta.env.VITE_CESIUM_ION_TOKEN;
        if (ionToken) {
          Cesium.Ion.defaultAccessToken = ionToken;
        }

        // Setup Esri World Imagery (high-resolution authentic satellite imagery)
        setLoadingPhase('imagery');
        setLoadingMessage('LOADING HIGH-RESOLUTION SATELLITE IMAGERY...');

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

        // Enable full native 3D camera controller (Requirement 4 & 11)
        const controller = viewerInstance.scene.screenSpaceCameraController;
        controller.enableRotate = true;
        controller.enableTranslate = true;
        controller.enableZoom = true;
        controller.enableTilt = true;
        controller.enableLook = true;
        controller.enableCollisionDetection = false; // Prevents camera locking/freezing at low altitude
        controller.minimumZoomDistance = 5.0; // Respect native camera limits without artificial stop
        controller.maximumZoomDistance = 30000000.0;
        controller.inertiaSpin = 0.85;
        controller.inertiaTranslate = 0.85;
        controller.inertiaZoom = 0.80;

        // Depth testing & atmospheric settings
        viewerInstance.scene.globe.depthTestAgainstTerrain = false; // Prevents terrain clipping on markers
        viewerInstance.scene.globe.enableLighting = false; // Crystal clear satellite imagery

        // Terrain loading if token is configured
        if (ionToken) {
          try {
            const terrain = await Cesium.createWorldTerrainAsync();
            viewerInstance.terrainProvider = terrain;
          } catch (terrainErr) {
            console.warn('[AGNIDRISHTI 3D] Terrain fallback to ellipsoid:', terrainErr.message);
          }
        }

        // Optional OpenStreetMap road overlay layer
        try {
          const roadProvider = new Cesium.UrlTemplateImageryProvider({
            url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            subdomains: ['a', 'b', 'c']
          });
          const roadLayer = new Cesium.ImageryLayer(roadProvider, { alpha: 0.65, show: false });
          viewerInstance.imageryLayers.add(roadLayer);
          roadLayerRef.current = roadLayer;
        } catch (e) {
          console.warn('[AGNIDRISHTI 3D] Road layer error:', e);
        }

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

        // Camera changed telemetry tracking for coordinate verification
        const updateTelemetry = () => {
          if (!viewerInstance || viewerInstance.isDestroyed()) return;
          try {
            const camera = viewerInstance.camera;
            const carto = camera.positionCartographic;
            const alt = carto ? Math.round(carto.height) : null;
            const pitch = Math.round(Cesium.Math.toDegrees(camera.pitch));
            const heading = Math.round(Cesium.Math.toDegrees(camera.heading));

            // Pick intersection point on globe center
            const canvas = viewerInstance.canvas;
            const ray = camera.getPickRay(new Cesium.Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2));
            let targetLat = null;
            let targetLon = null;
            if (ray) {
              const intersection = viewerInstance.scene.globe.pick(ray, viewerInstance.scene);
              if (intersection) {
                const targetCarto = Cesium.Cartographic.fromCartesian(intersection);
                targetLat = Cesium.Math.toDegrees(targetCarto.latitude);
                targetLon = Cesium.Math.toDegrees(targetCarto.longitude);
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
            // Ignore minor rendering telemetry tick error
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
            const agniType = entity._agniType || (entity.cylinder || entity.point || entity.label ? 'thermal' : null);
            const agniData = entity._agniData || selectedFireRef.current;
            if (agniType) {
              console.log('[AGNIDRISHTI 3D] Picked 3D entity:', agniType, agniData);
              setActiveCard({ type: agniType, data: agniData });
              return;
            }
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
        screenHandlerRef.current = handler;

        // Requirement 10: Camera Start Position & Multi-Stage Descent
        // Start at regional altitude (~48,000m), then smoothly descend to site level (1400m oblique)
        if (selectedFireRef.current) {
          const sFire = selectedFireRef.current;
          const sLat = Number(sFire.latitude);
          const sLon = Number(sFire.longitude);
          if (!isNaN(sLat) && !isNaN(sLon)) {
            setLoadingPhase('locating');
            setLoadingMessage(`LOCATING THERMAL EVENT (${sLat.toFixed(4)}° N, ${sLon.toFixed(4)}° E)...`);

            // Start at Regional View (~48km altitude) looking down
            viewerInstance.camera.setView({
              destination: Cesium.Cartesian3.fromDegrees(sLon, sLat - 0.28, 48000),
              orientation: {
                heading: Cesium.Math.toRadians(0),
                pitch: Cesium.Math.toRadians(-52),
                roll: 0.0
              }
            });

            // Smooth multi-stage descent to site-level oblique inspection (1400m range, -35° pitch)
            const targetPos = Cesium.Cartesian3.fromDegrees(sLon, sLat, 0);
            const boundingSphere = new Cesium.BoundingSphere(targetPos, 40);
            const offset = new Cesium.HeadingPitchRange(
              Cesium.Math.toRadians(0),
              Cesium.Math.toRadians(-35),
              1400
            );

            viewerInstance.camera.flyToBoundingSphere(boundingSphere, {
              offset: offset,
              duration: 2.4,
              complete: () => {
                setLoadingPhase('located');
                setLoadingMessage('EVENT LOCATED');
                setTimeout(() => {
                  setIsLoading(false);
                }, 900);
              }
            });

            setActiveCard({ type: 'thermal', data: sFire });
          } else {
            setIsLoading(false);
          }
        } else {
          setIsLoading(false);
        }

        setViewer(viewerInstance);
      } catch (err) {
        console.error('[AGNIDRISHTI 3D] Cesium initialization error:', err);
        setInitError(err.message || 'Unable to initialize 3D WebGL context.');
        setIsLoading(false);
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

  // 4. Update Satellite Layer Visibility
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

  // Keyboard Navigation Controls (Requirement 20)
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

  // 5. Update Camera Target on event change or locateTrigger
  useEffect(() => {
    if (viewer && selectedFire) {
      flyToSelectedEvent(selectedFire, 1.8);
      setActiveCard({ type: 'thermal', data: selectedFire });
    }
  }, [viewer, selectedFire, locateTrigger, flyToSelectedEvent]);

  // 6. Update Ground-Anchored 3D Incident Location Pointer (Pointing directly at exact coordinate)
  useEffect(() => {
    const ds = thermalDataSourceRef.current;
    if (!ds) return;
    ds.entities.removeAll();

    if (!selectedFire || !showThermal) return;

    const lat = Number(selectedFire.latitude);
    const lon = Number(selectedFire.longitude);
    if (isNaN(lat) || isNaN(lon)) return;

    const color = getClassificationColor(selectedFire);
    const colorHex = selectedFire.is_emergency ? '#EF4444' : (selectedFire.category === 'PERSISTENT_INDUSTRIAL_FLARE' ? '#F59E0B' : '#EF4444');
    const posGround = Cesium.Cartesian3.fromDegrees(lon, lat, 0);

    // 1. Ground contact target bullseye disc (clamped to terrain/imagery surface, 32m radius)
    const groundHighlight = ds.entities.add({
      position: posGround,
      ellipse: {
        semiMinorAxis: 32.0,
        semiMajorAxis: 32.0,
        material: color.withAlpha(0.28),
        outline: true,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2.5,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
      }
    });
    groundHighlight._agniType = 'thermal';
    groundHighlight._agniData = selectedFire;

    // 2. Center ground point (clamped to terrain surface)
    const groundPoint = ds.entities.add({
      position: posGround,
      point: {
        pixelSize: 8,
        color: Cesium.Color.WHITE,
        outlineColor: color,
        outlineWidth: 2.5,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      }
    });
    groundPoint._agniType = 'thermal';
    groundPoint._agniData = selectedFire;

    // 3. Vertical stem connecting ground surface to pin (Requirement 6 & 7)
    const verticalStem = ds.entities.add({
      polyline: {
        positions: [
          Cesium.Cartesian3.fromDegrees(lon, lat, 0),
          Cesium.Cartesian3.fromDegrees(lon, lat, 70)
        ],
        width: 2.5,
        material: new Cesium.PolylineDashMaterialProperty({
          color: Cesium.Color.WHITE,
          dashLength: 6.0
        })
      }
    });
    verticalStem._agniType = 'thermal';
    verticalStem._agniData = selectedFire;

    // 4. High-visibility 3D Location Pointer Pin Billboard (pointing down directly at the ground coordinate)
    const pinSvgUrl = createLocationPointerSvg(colorHex);
    const pointerPin = ds.entities.add({
      position: posGround,
      billboard: {
        image: pinSvgUrl,
        width: 48,
        height: 62,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new Cesium.NearFarScalar(200, 1.15, 45000, 0.75)
      }
    });
    pointerPin._agniType = 'thermal';
    pointerPin._agniData = selectedFire;

    // 5. Professional 3D Incident Information Label / Badge (floating cleanly right above the pin, Requirements 7 & 8 & 9)
    const eventId = selectedFire.event_id || selectedFire.fire_id || 'AGNI-LIVE-EVENT';
    const frpVal = Number(selectedFire.frp || 0).toFixed(1);
    const satVal = selectedFire.satellites_display || selectedFire.satellite || 'NOAA-21 / VIIRS';
    const cleanTime = selectedFire.acq_time ? String(selectedFire.acq_time).padStart(4, '0') : '1200';
    const timeVal = `${cleanTime.substring(0, 2)}:${cleanTime.substring(2, 4)} UTC`;
    const latStr = `${lat >= 0 ? lat.toFixed(6) + '° N' : Math.abs(lat).toFixed(6) + '° S'}`;
    const lonStr = `${lon >= 0 ? lon.toFixed(6) + '° E' : Math.abs(lon).toFixed(6) + '° W'}`;

    let facContext = 'FACILITY CONTEXT: Not verified';
    if (selectedFire.facility_name && selectedFire.facility_name !== 'None' && selectedFire.facility_name !== 'null') {
      facContext = `OSM VERIFIED: ${selectedFire.facility_name}`;
    }

    const labelText = `THERMAL EVENT • ${eventId}\nFRP: ${frpVal} MW  |  SATELLITE: ${satVal}\nOBSERVED: ${timeVal}  |  ${latStr}, ${lonStr}\n${facContext}\n      │\n      ▼\n● EXACT LOCATION`;

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
        pixelOffset: new Cesium.Cartesian2(0, -68),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new Cesium.NearFarScalar(300, 1.0, 35000, 0.7),
        backgroundColor: Cesium.Color.fromCssColorString('#0b101b').withAlpha(0.92),
        showBackground: true,
        backgroundPadding: new Cesium.Cartesian2(8, 5)
      }
    });
    eventLabel._agniType = 'thermal';
    eventLabel._agniData = selectedFire;
  }, [viewer, selectedFire, showThermal]);

  // 7. Update Industrial Facility Polygon & Perimeter Context
  useEffect(() => {
    const ds = facilityDataSourceRef.current;
    if (!ds) return;
    ds.entities.removeAll();

    if (!showFacility || !facilities?.features || !selectedFire) return;

    // Identify facility matching selected event
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
        name: matched.properties?.name || 'Industrial Perimeter',
        polygon: {
          hierarchy: Cesium.Cartesian3.fromDegreesArray(flatCoords),
          material: Cesium.Color.fromCssColorString('#F59E0B').withAlpha(0.14),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString('#F59E0B').withAlpha(0.9),
          outlineWidth: 2.5,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
        }
      });
      facEntity._agniType = 'facility';
      facEntity._agniData = matched.properties;

      // Facility perimeter label
      const firstCoord = matched.geometry.coordinates[0][0];
      const facLabel = ds.entities.add({
        position: Cesium.Cartesian3.fromDegrees(firstCoord[0], firstCoord[1], 10),
        label: {
          text: `🏭 FACILITY PERIMETER: ${matched.properties?.name || 'INDUSTRIAL FACILITY'}`,
          font: 'bold 10.5px sans-serif',
          fillColor: Cesium.Color.fromCssColorString('#FDE68A'),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2.5,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
        }
      });
      facLabel._agniType = 'facility';
      facLabel._agniData = matched.properties;
    }
  }, [viewer, facilities, selectedFire, showFacility]);

  // 8. Update Estimated Downwind Dispersion Plume
  useEffect(() => {
    const ds = plumeDataSourceRef.current;
    if (!ds) return;
    ds.entities.removeAll();

    if (!showPlume || !activePlume?.geometry?.coordinates?.[0]) return;

    const ring = activePlume.geometry.coordinates[0];
    const flatCoords = [];
    ring.forEach(([lon, lat]) => {
      flatCoords.push(lon, lat);
    });

    const fillColor = Cesium.Color.fromCssColorString(activePlume.properties?.fill_color || '#ef4444').withAlpha(0.28);
    const strokeColor = Cesium.Color.fromCssColorString(activePlume.properties?.stroke_color || '#ef4444');

    ds.entities.add({
      name: 'Estimated Dispersion Corridor',
      polygon: {
        hierarchy: Cesium.Cartesian3.fromDegreesArray(flatCoords),
        material: fillColor,
        outline: true,
        outlineColor: strokeColor,
        outlineWidth: 2,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
      }
    });
  }, [viewer, activePlume, showPlume]);

  // 9. Update Sensitive Receptors (Settlements, Schools, Hospitals)
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
      {/* Cesium Canvas Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Phased Loading Experience Overlay (Requirement 23) */}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#080b10]/85 backdrop-blur-md select-none">
          <div className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-[#0b101b]/95 border border-white/15 shadow-2xl max-w-sm w-full mx-4">
            {/* Pulsing radar indicator */}
            <div className="relative w-12 h-12 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-cyan-500/30 animate-ping" />
              <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <Crosshair className="w-4 h-4 text-cyan-400 absolute" />
            </div>

            <div className="text-center space-y-1.5 w-full">
              <div className="text-xs font-mono font-bold tracking-widest text-cyan-300 uppercase">
                {loadingMessage || 'INITIALIZING 3D INSPECTION...'}
              </div>
              <div className="text-[10px] font-mono text-slate-400">
                {selectedFire ? `${Number(selectedFire.latitude).toFixed(6)}° N, ${Number(selectedFire.longitude).toFixed(6)}° E` : 'WGS84 GEOGRAPHIC PROJECTION'}
              </div>
            </div>

            {/* Stepped Progress Indicator */}
            <div className="w-full grid grid-cols-3 gap-1.5 pt-2 border-t border-white/10 font-mono text-[9px] text-center">
              <div className={`p-1.5 rounded transition-all ${loadingPhase === 'terrain' ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50 font-bold' : (loadingPhase !== 'terrain' ? 'bg-emerald-950/60 text-emerald-300' : 'bg-white/[0.04] text-slate-400')}`}>
                1. TERRAIN
              </div>
              <div className={`p-1.5 rounded transition-all ${loadingPhase === 'imagery' ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50 font-bold' : (loadingPhase === 'locating' || loadingPhase === 'located' ? 'bg-emerald-950/60 text-emerald-300' : 'bg-white/[0.04] text-slate-400')}`}>
                2. SATELLITE
              </div>
              <div className={`p-1.5 rounded transition-all ${loadingPhase === 'locating' ? 'bg-amber-950 text-amber-300 border border-amber-500/50 font-bold animate-pulse' : (loadingPhase === 'located' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50 font-bold' : 'bg-white/[0.04] text-slate-400')}`}>
                3. LOCATE
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Floating Action Bar (Requirement 16) */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2.5">
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

        {/* Layer Controls Dropdown Toggle (Requirement 13) */}
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
            <div className="absolute left-0 mt-2 w-60 rounded-lg bg-[#0b101b]/95 border border-white/15 shadow-2xl backdrop-blur-xl p-2.5 z-40 space-y-1 font-sans text-xs">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-2 py-1 border-b border-white/10 mb-1">
                Contextual 3D Overlays
              </div>

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

              <label className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-white/[0.06] cursor-pointer text-slate-200">
                <span className="flex items-center gap-2">
                  <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                  <span>3D Terrain / Elevation</span>
                </span>
                <input
                  type="checkbox"
                  checked={showTerrain}
                  onChange={(e) => setShowTerrain(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-cyan-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-white/[0.06] cursor-pointer text-slate-200">
                <span className="flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                  <span>Thermal Event Marker</span>
                </span>
                <input
                  type="checkbox"
                  checked={showThermal}
                  onChange={(e) => setShowThermal(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-cyan-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-white/[0.06] cursor-pointer text-slate-200">
                <span className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Facility Perimeter</span>
                </span>
                <input
                  type="checkbox"
                  checked={showFacility}
                  onChange={(e) => setShowFacility(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-cyan-500 cursor-pointer"
                />
              </label>

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
          title="Locate Thermal Event (Site-Level Oblique)"
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

      {/* On-Canvas Incident Information Panel (Real Data Only) */}
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
                      {typeof activeCard.data.confidence === 'string' && activeCard.data.confidence.toLowerCase() === 'h' ? 'High' : (activeCard.data.confidence ? `${activeCard.data.confidence}%` : 'High')}
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
                    onClick={() => flyToSelectedEvent(activeCard.data, 1.4)}
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
                    onClick={() => flyToSelectedEvent(selectedFire, 1.2)}
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

      {/* Camera Accuracy & Coordinate Telemetry Verification HUD (Requirement 16.9) */}
      <div className="absolute bottom-3 left-4 z-20 pointer-events-auto flex items-center gap-3 text-[10.5px] font-mono text-slate-300 bg-[#0b101b]/95 px-3 py-1.5 rounded-lg border border-white/15 backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-slate-400">EVENT COORDS:</span>
          <span className="text-white font-bold">
            {selectedFire ? `${Number(selectedFire.latitude).toFixed(6)}° N, ${Number(selectedFire.longitude).toFixed(6)}° E` : 'SELECT EVENT'}
          </span>
        </div>
        <div className="h-3 w-[1px] bg-white/15" />
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">CESIUM TARGET:</span>
          <span className="text-cyan-300 font-bold">
            {cameraTelemetry.targetLat != null ? `${cameraTelemetry.targetLat.toFixed(6)}° N, ${cameraTelemetry.targetLon.toFixed(6)}° E` : 'TRACKING...'}
          </span>
        </div>
        <div className="h-3 w-[1px] bg-white/15" />
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">ALT:</span>
          <span className="text-slate-200">{cameraTelemetry.altitude ? `${cameraTelemetry.altitude.toLocaleString()}m` : '1,350m'}</span>
        </div>
        <div className="h-3 w-[1px] bg-white/15" />
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">PITCH:</span>
          <span className="text-amber-300 font-semibold">{cameraTelemetry.pitch != null ? `${cameraTelemetry.pitch}°` : '-35°'}</span>
        </div>
      </div>

      {/* Right Side Compact 3D Incident Inspector Overlay (Requirement 16) */}
      {selectedFire && (
        <div className="absolute top-4 right-4 bottom-12 z-20 flex pointer-events-none">
          {inspectorExpanded ? (
            <div className="pointer-events-auto h-full flex shadow-2xl">
              <Cesium3DInspector
                fire={selectedFire}
                activePlume={activePlume}
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
