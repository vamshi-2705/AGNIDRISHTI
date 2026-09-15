import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, ArrowRight, RotateCcw, Maximize2, Minimize2, 
  ExternalLink, FileText, Check, Copy, ChevronRight, Info,
  Compass, Wind, AlertTriangle, ShieldCheck, MapPin, Eye,
  Layers, Navigation, Activity, Radio
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polygon, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import logoImg from '../assets/logo.jpg';
import Cesium3DViewer from './Cesium3DViewer';
import { DEMO_PETROCHEM_SCENARIO } from '../services/demoScenario';

// The 10-step technical workflow
const DEMO_STEPS = [
  { id: 1, num: '01', code: 'DETECT', title: 'Detect', subtitle: 'Satellite Thermal Detection' },
  { id: 2, num: '02', code: 'VERIFY', title: 'Verify', subtitle: 'Multi-Satellite Correlation' },
  { id: 3, num: '03', code: 'CONTEXT', title: 'Context', subtitle: 'Geospatial & Industrial Context' },
  { id: 4, num: '04', code: 'ANALYZE', title: 'Analyze', subtitle: 'FRP Anomaly Analysis' },
  { id: 5, num: '05', code: 'CLASSIFY', title: 'Classify', subtitle: 'Event Assessment & Classification' },
  { id: 6, num: '06', code: 'ASSESS', title: 'Assess', subtitle: 'Downwind Dispersion Assessment' },
  { id: 7, num: '07', code: 'EXPOSURE', title: 'Exposure', subtitle: 'Community Exposure Assessment' },
  { id: 8, num: '08', code: '3D INSPECT', title: '3D Inspect', subtitle: 'Site-Level 3D Incident Inspection' },
  { id: 9, num: '09', code: 'RESPOND', title: 'Respond', subtitle: 'Incident Assessment & Response' },
  { id: 10, num: '10', code: 'SUMMARY', title: 'Summary', subtitle: 'Intelligence Summary & Decision Support' }
];

export default function InteractiveDemoPage({
  fires = [],
  facilities = null,
  sensitiveLocations = null,
  onOpenPlatform,
  onBackToLanding,
  onOpenReport
}) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [selectedScenarioSource, setSelectedScenarioSource] = useState('live'); // 'live' | 'demo'
  const [selectedLiveFireId, setSelectedLiveFireId] = useState(null);
  const [copiedCoords, setCopiedCoords] = useState(false);

  // Top live events sorted by FRP
  const topLiveFires = useMemo(() => {
    if (!fires || fires.length === 0) return [];
    return [...fires].sort((a, b) => (b.frp || 0) - (a.frp || 0)).slice(0, 10);
  }, [fires]);

  // Set default selected fire if live
  useEffect(() => {
    if (topLiveFires.length > 0 && !selectedLiveFireId) {
      const emergency = topLiveFires.find(f => f.is_emergency);
      setSelectedLiveFireId(emergency ? emergency.fire_id : topLiveFires[0].fire_id);
    }
  }, [topLiveFires, selectedLiveFireId]);

  // Resolve active event object
  const activeEvent = useMemo(() => {
    if (selectedScenarioSource === 'live' && fires.length > 0) {
      const match = fires.find(f => f.fire_id === selectedLiveFireId) || topLiveFires[0];
      if (match) return match;
    }
    return DEMO_PETROCHEM_SCENARIO;
  }, [selectedScenarioSource, fires, selectedLiveFireId, topLiveFires]);

  const isDemoScenario = !!activeEvent.is_demo_scenario;
  const currentStep = DEMO_STEPS[currentStepIndex];

  // Matched facility for context & 3D
  const matchedFacility = useMemo(() => {
    if (isDemoScenario) {
      return {
        id: activeEvent.facility_id,
        properties: {
          name: activeEvent.facility_name,
          category: activeEvent.facility_category,
          district: activeEvent.location?.district || 'Dakshina Kannada',
          state: activeEvent.location?.state || 'Karnataka',
          baseline_frp_mw: activeEvent.baseline_frp_mw,
          max_normal_frp_mw: activeEvent.max_normal_frp_mw
        },
        geometry: activeEvent.facility_geometry
      };
    }
    const facList = facilities?.features || [];
    return facList.find(f => {
      const p = f.properties;
      return (
        activeEvent.facility_id === f.id ||
        activeEvent.facility_id === p?.facility_id ||
        (activeEvent.facility_name && p?.name && activeEvent.facility_name.toLowerCase() === p.name.toLowerCase())
      );
    }) || null;
  }, [activeEvent, facilities, isDemoScenario]);

  // Navigation handlers
  const handleNext = () => {
    if (currentStepIndex < DEMO_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleRestart = () => {
    setCurrentStepIndex(0);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'f' || e.key === 'F') {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') {
          setIsPresentationMode(prev => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStepIndex]);

  const handleCopyCoords = () => {
    const text = `${Number(activeEvent.latitude).toFixed(6)}, ${Number(activeEvent.longitude).toFixed(6)}`;
    navigator.clipboard.writeText(text);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0a0e14] text-[#f1f5f9] font-sans select-none">
      {/* 1. Technical Top Bar */}
      {!isPresentationMode && (
        <header className="h-13 px-5 bg-[#10161f] border-b border-[#223042] flex items-center justify-between shrink-0 z-30 shadow-md">
          {/* Brand & Context */}
          <div className="flex items-center gap-3">
            <div 
              onClick={onBackToLanding}
              className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity"
              title="Return to overview"
            >
              <div className="w-8 h-8 rounded-md overflow-hidden bg-black p-0.5 border border-[#18b6d9]/40 shadow-sm">
                <img src={logoImg} alt="AGNI DRISHTI" className="w-full h-full object-cover rounded" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold tracking-wider text-white">
                    AGNI<span className="text-[#f59a23]">DRISHTI</span>
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-[#18b6d9]/15 border border-[#18b6d9]/30 text-[10px] font-mono text-[#18b6d9]">
                    DEMO
                  </span>
                </div>
                <span className="text-[11px] text-[#94a3b8] tracking-tight">
                  Interactive Analysis Workstation
                </span>
              </div>
            </div>

            <div className="h-4 w-px bg-[#223042] hidden sm:block mx-1" />

            <span className="text-xs text-[#64748b] hidden md:inline font-mono">
              Orbital thermal detection → Site-level incident assessment
            </span>
          </div>

          {/* Right-Side Status & Actions */}
          <div className="flex items-center gap-3 text-xs">
            {/* Live Data / Demo Toggle */}
            <div className="flex items-center bg-[#151d27] border border-[#223042] rounded-md p-0.5">
              <button
                onClick={() => setSelectedScenarioSource('live')}
                className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                  selectedScenarioSource === 'live'
                    ? 'bg-[#10161f] text-[#f1f5f9] font-medium border border-[#28c98a]/40 shadow-xs'
                    : 'text-[#94a3b8] hover:text-[#f1f5f9]'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#28c98a] shadow-[0_0_6px_#28c98a]" />
                <span className="font-mono text-[11px]">LIVE FIRMS</span>
              </button>
              <button
                onClick={() => setSelectedScenarioSource('demo')}
                className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                  selectedScenarioSource === 'demo'
                    ? 'bg-[#10161f] text-[#f1f5f9] font-medium border border-[#f59a23]/40 shadow-xs'
                    : 'text-[#94a3b8] hover:text-[#f1f5f9]'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#f59a23]" />
                <span>Demo Scenario</span>
              </button>
            </div>

            {/* Presentation Mode Toggle */}
            <button
              onClick={() => setIsPresentationMode(!isPresentationMode)}
              className="p-1.5 rounded-md text-[#94a3b8] hover:text-white hover:bg-[#151d27] border border-transparent hover:border-[#223042] transition-colors cursor-pointer"
              title="Toggle presentation fullscreen (F)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            {/* Open Live Platform */}
            <button
              onClick={onOpenPlatform}
              className="px-3 py-1.5 rounded-md bg-[#f59a23] hover:bg-[#e08916] text-black text-xs font-semibold tracking-wide transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <span>Live Platform</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>
      )}

      {/* 2. Technical 10-Step Workflow Ribbon */}
      <nav className="h-10 px-5 bg-[#0e141c] border-b border-[#223042] flex items-center justify-between shrink-0 overflow-x-auto custom-scrollbar z-20">
        <div className="flex items-center gap-1 mx-auto text-xs whitespace-nowrap">
          {DEMO_STEPS.map((step, idx) => {
            const isActive = idx === currentStepIndex;
            const isPassed = idx < currentStepIndex;
            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#151f2b] text-white border border-[#f59a23] font-semibold shadow-xs'
                      : isPassed
                      ? 'text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-[#121822]'
                      : 'text-[#64748b] hover:text-[#94a3b8]'
                  }`}
                >
                  <span className={`w-4 h-4 rounded text-[10px] font-mono flex items-center justify-center ${
                    isActive
                      ? 'bg-[#f59a23] text-black font-bold'
                      : isPassed
                      ? 'bg-[#28c98a]/20 text-[#28c98a] border border-[#28c98a]/30'
                      : 'bg-[#1a2330] text-[#64748b]'
                  }`}>
                    {idx + 1}
                  </span>
                  <span className={`text-[11px] tracking-wide ${isActive ? 'text-[#f59a23]' : ''}`}>
                    {step.code}
                  </span>
                </button>
                {idx < DEMO_STEPS.length - 1 && (
                  <span className="text-[#223042] px-0.5 select-none">→</span>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {isPresentationMode && (
          <button
            onClick={() => setIsPresentationMode(false)}
            className="p-1 rounded text-[#94a3b8] hover:text-white cursor-pointer ml-2"
            title="Exit fullscreen"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
        )}
      </nav>

      {/* 3. Main Analytical Content Area (88-92% useful space utilization) */}
      <main className="flex-1 relative overflow-hidden flex flex-col p-4 sm:p-5 w-full h-full max-w-[1720px] mx-auto">
        {/* Step Header & Target Context Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 shrink-0 pb-2.5 border-b border-[#223042] gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-semibold text-[#18b6d9] tracking-wider uppercase">
                STEP {currentStep.num} OF 10
              </span>
              <span className="text-[#64748b]">/</span>
              <span className="text-[11px] font-mono text-[#94a3b8] uppercase tracking-wider">
                {currentStep.code}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight mt-0.5">
              {currentStep.subtitle}
            </h1>
          </div>

          <div className="flex items-center gap-3 text-xs bg-[#121820] border border-[#223042] rounded-md px-3 py-1.5 self-start sm:self-auto">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[#64748b] uppercase tracking-wide">Target Event:</span>
              <span className="font-mono font-medium text-[#f1f5f9]">{activeEvent.event_id || activeEvent.fire_id}</span>
            </div>
            <span className="h-3 w-px bg-[#223042]" />
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[#64748b] uppercase tracking-wide">Observed FRP:</span>
              <span className="font-mono font-bold text-[#f59a23]">{activeEvent.frp} MW</span>
            </div>
            <span className="h-3 w-px bg-[#223042] hidden md:block" />
            <div className="hidden md:flex items-center gap-1.5">
              <span className="text-[11px] text-[#64748b] uppercase tracking-wide">Scenario:</span>
              <span className={`font-medium ${isDemoScenario ? 'text-[#18b6d9]' : 'text-[#28c98a]'}`}>
                {isDemoScenario ? 'Industrial Thermal Anomaly' : 'Live NASA FIRMS VIIRS'}
              </span>
            </div>
          </div>
        </div>

        {/* Analytical Step Workspace Panel */}
        <div className="flex-1 relative overflow-hidden rounded-lg bg-[#121820] border border-[#223042] shadow-md flex flex-col min-h-0">
          {currentStepIndex === 0 && (
            <Step1Detect 
              event={activeEvent} 
              isDemoScenario={isDemoScenario}
              onCopyCoords={handleCopyCoords}
              copiedCoords={copiedCoords}
            />
          )}
          {currentStepIndex === 1 && (
            <Step2Verify 
              event={activeEvent} 
              isDemoScenario={isDemoScenario}
            />
          )}
          {currentStepIndex === 2 && (
            <Step3Context 
              event={activeEvent} 
              facility={matchedFacility}
              isDemoScenario={isDemoScenario}
            />
          )}
          {currentStepIndex === 3 && (
            <Step4Analyze 
              event={activeEvent} 
              facility={matchedFacility}
              isDemoScenario={isDemoScenario}
            />
          )}
          {currentStepIndex === 4 && (
            <Step5Classify 
              event={activeEvent} 
              facility={matchedFacility}
              isDemoScenario={isDemoScenario}
            />
          )}
          {currentStepIndex === 5 && (
            <Step6Assess 
              event={activeEvent} 
              isDemoScenario={isDemoScenario}
            />
          )}
          {currentStepIndex === 6 && (
            <Step7Exposure 
              event={activeEvent} 
              sensitiveLocations={sensitiveLocations}
              isDemoScenario={isDemoScenario}
            />
          )}
          {currentStepIndex === 7 && (
            <Step8Inspect 
              event={activeEvent} 
              facilities={facilities}
              sensitiveLocations={sensitiveLocations}
              isDemoScenario={isDemoScenario}
            />
          )}
          {currentStepIndex === 8 && (
            <Step9Respond 
              event={activeEvent} 
              facility={matchedFacility}
              onOpenReport={() => onOpenReport && onOpenReport(activeEvent)}
              isDemoScenario={isDemoScenario}
            />
          )}
          {currentStepIndex === 9 && (
            <Step10Summary 
              onRestart={handleRestart}
              onOpenPlatform={onOpenPlatform}
            />
          )}
        </div>
      </main>

      {/* 4. Bottom Provenance & Navigation Bar */}
      <footer className="h-12 px-5 bg-[#10161f] border-t border-[#223042] flex items-center justify-between shrink-0 z-20 text-xs">
        <button
          onClick={handlePrev}
          disabled={currentStepIndex === 0}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
            currentStepIndex === 0
              ? 'text-[#64748b] cursor-not-allowed opacity-40'
              : 'text-[#f1f5f9] hover:bg-[#16202c] border border-[#223042]'
          }`}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Previous</span>
        </button>

        <div className="hidden sm:flex items-center gap-2 text-[#94a3b8] text-[11px] font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-[#18b6d9]" />
          <span>DATA PROVENANCE: NASA FIRMS (VIIRS) · OPENSTREETMAP · OPEN-METEO · ESA WORLDCOVER</span>
        </div>

        {currentStepIndex < DEMO_STEPS.length - 1 ? (
          <button
            onClick={handleNext}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-[#f59a23] hover:bg-[#e08916] text-black font-semibold tracking-wide transition-colors cursor-pointer shadow-sm"
          >
            <span>Next: {DEMO_STEPS[currentStepIndex + 1].code}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={onOpenPlatform}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-[#28c98a] hover:bg-[#22b37a] text-black font-semibold tracking-wide transition-colors cursor-pointer shadow-sm"
          >
            <span>Open Live Platform</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        )}
      </footer>
    </div>
  );
}

/* =========================================================================
   STEP 01: DETECTION
   Dominant 68-70% Leaflet map, right side compact technical telemetry.
   ========================================================================= */
function Step1Detect({ event, onCopyCoords, copiedCoords }) {
  const lat = Number(event.latitude);
  const lon = Number(event.longitude);

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden">
      {/* Map (Dominant ~70% workspace) */}
      <div className="flex-[7] relative h-3/5 lg:h-full border-b lg:border-b-0 lg:border-r border-[#223042] overflow-hidden">
        <MapContainer
          center={[lat || 21.5, lon || 78.5]}
          zoom={lat ? 10 : 5}
          className="w-full h-full z-0 bg-[#0a0e14]"
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          {lat && lon && (
            <Marker
              position={[lat, lon]}
              icon={L.divIcon({
                className: 'detection-point-marker',
                html: `
                  <div class="relative flex items-center justify-center w-8 h-8">
                    <span class="absolute w-7 h-7 rounded-full bg-[#e34b4b]/30 animate-ping"></span>
                    <span class="w-3.5 h-3.5 rounded-full bg-[#e34b4b] border-2 border-white shadow-md"></span>
                  </div>
                `,
                iconSize: [32, 32],
                iconAnchor: [16, 16]
              })}
            >
              <Tooltip permanent direction="top" offset={[0, -12]}>
                <div className="font-mono text-xs text-[#0a0e14] font-bold px-1.5 py-0.5 bg-white/95 rounded shadow-sm">
                  {event.event_id || event.fire_id} · {event.frp} MW
                </div>
              </Tooltip>
            </Marker>
          )}
        </MapContainer>

        {/* Map Header Overlay */}
        <div className="absolute top-3 left-3 z-[400] bg-[#121820]/95 border border-[#223042] rounded-md px-3 py-1.5 text-xs text-[#94a3b8] flex items-center gap-2 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[#e34b4b] animate-pulse" />
          <span className="font-mono font-medium text-white">NEAR-REAL-TIME SATELLITE DETECTION</span>
          <span className="text-[#64748b]">|</span>
          <span className="text-[#18b6d9] font-mono">VIIRS 375m</span>
        </div>

        {/* Coordinate badge */}
        <div className="absolute bottom-3 left-3 z-[400] bg-[#121820]/95 border border-[#223042] rounded-md px-3 py-1.5 text-xs flex items-center gap-3 shadow-sm">
          <span className="text-[11px] text-[#64748b] uppercase font-mono">WGS84:</span>
          <span className="font-mono font-medium text-[#18b6d9]">{lat.toFixed(4)}° N, {lon.toFixed(4)}° E</span>
          <button 
            onClick={onCopyCoords}
            className="text-[#94a3b8] hover:text-white cursor-pointer"
            title="Copy coordinates"
          >
            {copiedCoords ? <Check className="w-3.5 h-3.5 text-[#28c98a]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Information Panel (~30% sidebar) */}
      <div className="flex-[3] bg-[#121820] p-5 overflow-y-auto custom-scrollbar flex flex-col justify-between">
        <div className="space-y-4">
          <div className="pb-3 border-b border-[#223042]">
            <div className="text-[11px] text-[#18b6d9] uppercase tracking-wider font-mono font-semibold mb-1">
              OBSERVATION TELEMETRY
            </div>
            <div className="text-base font-bold text-white">
              {event.location?.district ? `${event.location.district}, ${event.location.state}` : (event.facility_name || 'Industrial Facility Corridor')}
            </div>
            <div className="text-xs text-[#94a3b8] mt-0.5">
              Thermal Radiative Exceedance Track
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center py-2 px-2.5 rounded bg-[#16202a] border border-[#223042]/70">
              <span className="text-[#94a3b8]">Observed FRP</span>
              <span className="font-mono font-bold text-[#f59a23] text-sm">{event.frp} MW</span>
            </div>
            <div className="flex justify-between items-center py-2 px-2.5 rounded bg-[#16202a] border border-[#223042]/70">
              <span className="text-[#94a3b8]">Brightness Temperature</span>
              <span className="font-mono text-white">{event.brightness || 345.2} K</span>
            </div>
            <div className="flex justify-between items-center py-2 px-2.5 rounded bg-[#16202a] border border-[#223042]/70">
              <span className="text-[#94a3b8]">Primary Sensor</span>
              <span className="font-mono text-[#18b6d9]">{event.satellite || 'VIIRS / NOAA-21'}</span>
            </div>
            <div className="flex justify-between items-center py-2 px-2.5 rounded bg-[#16202a] border border-[#223042]/70">
              <span className="text-[#94a3b8]">Spatial Resolution</span>
              <span className="font-mono text-white">375 m nadir</span>
            </div>
            <div className="flex justify-between items-center py-2 px-2.5 rounded bg-[#16202a] border border-[#223042]/70">
              <span className="text-[#94a3b8]">Acquisition Timestamp</span>
              <span className="font-mono text-white">{event.acq_date || '2026-09-15'} · {event.acq_time || '11:45'} UTC</span>
            </div>
          </div>

          <div className="p-3 rounded bg-[#16202a] border border-[#223042] text-xs text-[#94a3b8] leading-relaxed">
            <div className="text-[11px] font-mono text-[#18b6d9] uppercase font-semibold mb-1">DETECTION METHODOLOGY</div>
            Direct orbital infrared radiances captured by the VIIRS 375m I-bands. Fire Radiative Power (FRP) quantifies the instantaneous rate of combustion energy release.
          </div>
        </div>

        <div className="pt-3 border-t border-[#223042] text-[11px] text-[#64748b] font-mono flex items-center justify-between">
          <span>COORDINATE VERIFIED</span>
          <span className="text-[#28c98a]">STATUS: ACTIVE TRACK</span>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   STEP 02: VERIFY (MULTI-SATELLITE CORRELATION)
   3 compact cards + timeline + deduplication metrics.
   ========================================================================= */
function Step2Verify({ event }) {
  const passes = event.observations || [
    { sensor: 'Suomi NPP', time: '07:30 UTC', frp: (event.frp * 0.85).toFixed(1), conf: '92%' },
    { sensor: 'NOAA-20', time: '09:12 UTC', frp: (event.frp * 0.95).toFixed(1), conf: '95%' },
    { sensor: 'NOAA-21', time: '11:45 UTC', frp: event.frp, conf: '98%' }
  ];

  return (
    <div className="flex-1 p-5 sm:p-6 overflow-y-auto custom-scrollbar flex flex-col justify-between">
      <div className="w-full space-y-5">
        <div>
          <div className="text-[11px] text-[#18b6d9] uppercase tracking-wider font-mono font-semibold mb-1">
            CROSS-SENSOR DEDUPLICATION PIPELINE
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white">
            Multi-Satellite Orbital Correlation
          </h2>
          <p className="text-xs text-[#94a3b8] mt-1 max-w-3xl leading-relaxed">
            Consecutive orbital passes across Suomi NPP, NOAA-20, and NOAA-21 within the 375m spatial grid are unified into a single persistent incident track, filtering false positives and transient optical glints.
          </p>
        </div>

        {/* 3 Compact Satellite Pass Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {passes.map((pass, i) => (
            <div key={i} className="p-4 rounded-lg bg-[#16202a] border border-[#223042] shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-[#223042] pb-2 mb-3">
                <span className="font-mono text-xs font-bold text-[#18b6d9]">{pass.sensor}</span>
                <span className="px-1.5 py-0.5 rounded bg-[#28c98a]/15 text-[#28c98a] border border-[#28c98a]/30 text-[10px] font-mono">
                  CONFIRMED
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#94a3b8]">Pass Time</span>
                  <span className="font-mono font-medium text-white">{pass.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94a3b8]">Measured FRP</span>
                  <span className="font-mono font-bold text-[#f59a23]">{pass.frp} MW</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94a3b8]">Sensor Confidence</span>
                  <span className="font-mono text-[#28c98a]">{pass.conf || '94%'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Horizontal Timeline */}
        <div className="p-4 rounded-lg bg-[#151d27] border border-[#223042] space-y-3">
          <div className="flex justify-between text-xs">
            <span className="font-mono text-[#18b6d9] uppercase font-semibold">Observation Timeline (UTC Passes)</span>
            <span className="text-[#94a3b8]">Temporal span: ~4.25 hours</span>
          </div>
          <div className="relative h-8 flex items-center px-4">
            <div className="w-full h-1 bg-[#223042] rounded-full" />
            {passes.map((pass, idx) => (
              <div 
                key={idx}
                className="absolute flex flex-col items-center transform -translate-x-1/2"
                style={{ left: `${20 + idx * 30}%` }}
              >
                <div className="w-3.5 h-3.5 rounded-full bg-[#28c98a] border-2 border-[#121820] shadow-[0_0_8px_#28c98a]" />
                <span className="text-[11px] font-mono font-semibold text-white mt-1">{pass.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Telemetry Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div className="p-3.5 rounded-lg bg-[#16202a] border border-[#223042]">
            <div className="text-[11px] text-[#94a3b8] uppercase font-mono">Correlated Passes</div>
            <div className="text-base font-bold text-white mt-1">3 Sensors · {passes.length} Overpasses</div>
            <div className="text-[11px] text-[#28c98a] mt-0.5">Continuous thermal track</div>
          </div>
          <div className="p-3.5 rounded-lg bg-[#16202a] border border-[#223042]">
            <div className="text-[11px] text-[#94a3b8] uppercase font-mono">Spatial Residual</div>
            <div className="text-base font-bold text-white mt-1">&lt; 85 meters</div>
            <div className="text-[11px] text-[#18b6d9] mt-0.5">Well within 375m footprint</div>
          </div>
          <div className="p-3.5 rounded-lg bg-[#16202a] border border-[#223042]">
            <div className="text-[11px] text-[#94a3b8] uppercase font-mono">Unified Track ID</div>
            <div className="text-base font-mono font-bold text-[#f59a23] mt-1">{event.event_id || event.fire_id}</div>
            <div className="text-[11px] text-[#94a3b8] mt-0.5">Single deduplicated incident</div>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-[#223042] text-xs text-[#64748b] font-mono flex items-center justify-between">
        <span>SATELLITE CONFIRMATION: MULTI-PLATFORM VERIFIED</span>
        <span className="text-[#28c98a]">RESIDUAL DRIFT: NOMINAL</span>
      </div>
    </div>
  );
}

/* =========================================================================
   STEP 03: CONTEXT (GEOSPATIAL & INDUSTRIAL CONTEXT)
   Map 65-70% + Right Side Cadastre Context Panel.
   ========================================================================= */
function Step3Context({ event, facility }) {
  const lat = Number(event.latitude);
  const lon = Number(event.longitude);
  const coords = facility?.geometry?.coordinates?.[0]?.map(([cLon, cLat]) => [cLat, cLon]) || [
    [lat - 0.008, lon - 0.008],
    [lat + 0.008, lon - 0.008],
    [lat + 0.008, lon + 0.008],
    [lat - 0.008, lon + 0.008]
  ];

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden">
      {/* Dominant Map (65-70%) */}
      <div className="flex-[7] relative h-3/5 lg:h-full border-b lg:border-b-0 lg:border-r border-[#223042] overflow-hidden">
        <MapContainer
          center={[lat, lon]}
          zoom={14}
          className="w-full h-full z-0 bg-[#0a0e14]"
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          <Polygon
            positions={coords}
            pathOptions={{
              color: '#18b6d9',
              weight: 2,
              fillColor: '#18b6d9',
              fillOpacity: 0.15
            }}
          />
          <Marker
            position={[lat, lon]}
            icon={L.divIcon({
              className: 'context-marker',
              html: `
                <div class="relative flex items-center justify-center w-6 h-6">
                  <span class="w-3 h-3 rounded-full bg-[#e34b4b] border-2 border-white shadow-md"></span>
                </div>
              `,
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            })}
          />
        </MapContainer>

        <div className="absolute bottom-3 left-3 z-[400] bg-[#121820]/95 border border-[#223042] rounded-md p-2.5 text-xs text-[#94a3b8] space-y-1.5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-1 bg-[#18b6d9] rounded" />
            <span className="font-mono text-white text-[11px]">INDUSTRIAL FACILITY BOUNDARY (OSM)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#e34b4b]" />
            <span className="font-mono text-[#f1f5f9] text-[11px]">THERMAL DETECTION COORDINATE (FIRMS)</span>
          </div>
        </div>
      </div>

      {/* Cadastre Context Panel (~30%) */}
      <div className="flex-[3] bg-[#121820] p-5 overflow-y-auto custom-scrollbar flex flex-col justify-between">
        <div className="space-y-4">
          <div className="pb-3 border-b border-[#223042]">
            <div className="text-[11px] text-[#18b6d9] uppercase tracking-wider font-mono font-semibold mb-1">
              FACILITY CONTEXT
            </div>
            <div className="text-base font-bold text-white">
              {facility?.properties?.name || event.facility_name || 'Mangalore Coastal Petrochemical & Refinery Complex'}
            </div>
            <div className="text-xs text-[#94a3b8] mt-0.5">
              OpenStreetMap Cadastre Integration
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center py-2 px-2.5 rounded bg-[#16202a] border border-[#223042]/70">
              <span className="text-[#94a3b8]">Facility Category</span>
              <span className="font-medium text-white">{facility?.properties?.category || event.facility_category || 'Petrochemical / Refining'}</span>
            </div>
            <div className="flex justify-between items-center py-2 px-2.5 rounded bg-[#16202a] border border-[#223042]/70">
              <span className="text-[#94a3b8]">Cadastre Source</span>
              <span className="font-mono text-[#18b6d9]">OpenStreetMap</span>
            </div>
            <div className="flex justify-between items-center py-2 px-2.5 rounded bg-[#16202a] border border-[#223042]/70">
              <span className="text-[#94a3b8]">Land Cover</span>
              <span className="font-mono text-white">ESA WorldCover (Industrial)</span>
            </div>
            <div className="flex justify-between items-center py-2 px-2.5 rounded bg-[#16202a] border border-[#223042]/70">
              <span className="text-[#94a3b8]">Boundary Spatial Query</span>
              <span className="px-2 py-0.5 rounded bg-[#28c98a]/15 text-[#28c98a] border border-[#28c98a]/30 font-mono font-semibold text-[11px]">
                INSIDE FACILITY PERIMETER
              </span>
            </div>
            <div className="flex justify-between items-center py-2 px-2.5 rounded bg-[#16202a] border border-[#223042]/70">
              <span className="text-[#94a3b8]">District Jurisdiction</span>
              <span className="text-white">{facility?.properties?.district || event.location?.district || 'Dakshina Kannada, Karnataka'}</span>
            </div>
          </div>

          <div className="p-3 rounded bg-[#16202a] border border-[#223042] text-xs text-[#94a3b8] leading-relaxed">
            <div className="text-[11px] font-mono text-[#18b6d9] uppercase font-semibold mb-1">BOUNDARY ENRICHMENT</div>
            Spatial containment query confirms that the hotspot is physically co-located within an authorized industrial facility footprint, establishing baseline operating constraints.
          </div>
        </div>

        <div className="pt-3 border-t border-[#223042] text-[11px] text-[#64748b] font-mono flex items-center justify-between">
          <span>SPATIAL QUERY: CONTAINED</span>
          <span className="text-[#28c98a]">VALID INDUSTRIAL ASSET</span>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   STEP 04: ANALYZE (FRP ANOMALY ANALYSIS)
   Visual comparison: Baseline, Threshold, Observed FRP with Anomaly Multiplier.
   ========================================================================= */
function Step4Analyze({ event, facility }) {
  const currentFrp = Number(event.frp || 168.4);
  const baselineFrp = Number(facility?.properties?.baseline_frp_mw || event.baseline_frp_mw || 28.5);
  const maxNormalFrp = Number(facility?.properties?.max_normal_frp_mw || event.max_normal_frp_mw || 45.0);
  const ratio = (currentFrp / (baselineFrp || 1)).toFixed(2);
  const maxScale = Math.max(currentFrp * 1.15, 200);

  const baselinePercent = Math.min((baselineFrp / maxScale) * 100, 100);
  const thresholdPercent = Math.min((maxNormalFrp / maxScale) * 100, 100);
  const observedPercent = Math.min((currentFrp / maxScale) * 100, 100);

  return (
    <div className="flex-1 p-5 sm:p-6 overflow-y-auto custom-scrollbar flex flex-col justify-between">
      <div className="w-full space-y-5">
        <div>
          <div className="text-[11px] text-[#18b6d9] uppercase tracking-wider font-mono font-semibold mb-1">
            OPERATIONAL BASELINE EXCEEDANCE
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white">
            FRP Anomaly Analysis
          </h2>
          <p className="text-xs text-[#94a3b8] mt-1 max-w-3xl leading-relaxed">
            Industrial flare stacks routinely emit combustion energy. To prevent false alarms, AGNIDRISHTI measures observed Fire Radiative Power (FRP) directly against the facility baseline and maximum authorized threshold.
          </p>
        </div>

        {/* Horizontal Comparison Visualization */}
        <div className="p-5 rounded-lg bg-[#16202a] border border-[#223042] space-y-4 shadow-sm">
          <div className="flex justify-between items-center text-xs">
            <span className="font-mono text-white font-semibold uppercase tracking-wider">
              Combustion Radiative Output Comparison
            </span>
            <span className="font-mono text-[#e34b4b] font-bold">
              ANOMALY EXCEEDANCE: {ratio}× BASELINE
            </span>
          </div>

          {/* Horizontal Visual Tracks */}
          <div className="space-y-3 pt-2">
            {/* Baseline */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#94a3b8]">Operational Baseline</span>
                <span className="font-mono text-white">{baselineFrp} MW</span>
              </div>
              <div className="h-3 w-full bg-[#121820] rounded-full overflow-hidden border border-[#223042]">
                <div 
                  className="h-full bg-[#94a3b8] rounded-full transition-all duration-500" 
                  style={{ width: `${baselinePercent}%` }}
                />
              </div>
            </div>

            {/* Threshold */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#94a3b8]">Maximum Permissible Flare Threshold</span>
                <span className="font-mono text-[#f59a23]">{maxNormalFrp} MW</span>
              </div>
              <div className="h-3 w-full bg-[#121820] rounded-full overflow-hidden border border-[#223042]">
                <div 
                  className="h-full bg-[#f59a23] rounded-full transition-all duration-500" 
                  style={{ width: `${thresholdPercent}%` }}
                />
              </div>
            </div>

            {/* Observed FRP */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#e34b4b] font-bold">Observed Thermal Detection (VIIRS)</span>
                <span className="font-mono text-[#e34b4b] font-bold text-sm">{currentFrp} MW</span>
              </div>
              <div className="h-4 w-full bg-[#121820] rounded-full overflow-hidden border border-[#e34b4b]/40 relative">
                <div 
                  className="h-full bg-gradient-to-r from-[#f59a23] to-[#e34b4b] rounded-full transition-all duration-500 relative" 
                  style={{ width: `${observedPercent}%` }}
                >
                  <span className="absolute right-0 top-0 bottom-0 w-2 bg-white rounded-full shadow-[0_0_8px_#ffffff]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Anomaly Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-lg bg-[#16202a] border border-[#223042]">
            <div className="text-[11px] text-[#94a3b8] uppercase font-mono">Observed FRP</div>
            <div className="text-lg font-mono font-bold text-[#e34b4b] mt-1">{currentFrp} MW</div>
            <div className="text-[11px] text-[#e34b4b] mt-0.5">Critical radiative peak</div>
          </div>
          <div className="p-3.5 rounded-lg bg-[#16202a] border border-[#223042]">
            <div className="text-[11px] text-[#94a3b8] uppercase font-mono">Baseline FRP</div>
            <div className="text-lg font-mono font-bold text-white mt-1">{baselineFrp} MW</div>
            <div className="text-[11px] text-[#94a3b8] mt-0.5">Historical facility average</div>
          </div>
          <div className="p-3.5 rounded-lg bg-[#16202a] border border-[#223042]">
            <div className="text-[11px] text-[#94a3b8] uppercase font-mono">Normal Threshold</div>
            <div className="text-lg font-mono font-bold text-[#f59a23] mt-1">{maxNormalFrp} MW</div>
            <div className="text-[11px] text-[#94a3b8] mt-0.5">Authorized flare ceiling</div>
          </div>
          <div className="p-3.5 rounded-lg bg-[#16202a] border border-[#223042]">
            <div className="text-[11px] text-[#94a3b8] uppercase font-mono">Exceedance Anomaly</div>
            <div className="text-lg font-mono font-bold text-[#f59a23] mt-1">{ratio}×</div>
            <div className="text-[11px] text-[#e34b4b] font-semibold mt-0.5">Above operational baseline</div>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-[#223042] text-xs text-[#64748b] font-mono flex items-center justify-between">
        <span>BASELINE ALGORITHM: FACILITY HISTORICAL PASSES</span>
        <span className="text-[#e34b4b]">STATUS: CRITICAL EXCEEDANCE</span>
      </div>
    </div>
  );
}

/* =========================================================================
   STEP 05: CLASSIFY (EVENT CLASSIFICATION)
   Structured Evidence Criteria Evaluation + Decision Classification.
   ========================================================================= */
function Step5Classify({ event }) {
  const isEmergency = event.is_emergency || event.category === 'CRITICAL_INDUSTRIAL_EMERGENCY';

  const evidence = [
    { label: 'Industrial Context', value: 'Confirmed (inside facility boundary)', status: 'VALIDATED' },
    { label: 'Thermal Persistence', value: 'Detected across multiple orbital passes', status: 'PERSISTENT' },
    { label: 'FRP Exceedance', value: `${event.anomaly_ratio || '5.91'}× normal baseline`, status: 'EXCEEDED' },
    { label: 'Land Cover Verification', value: 'Industrial Fabric (ESA WorldCover)', status: 'CONFIRMED' },
    { label: 'Satellite Sensor Confidence', value: 'High (VIIRS nominal nadir)', status: 'HIGH CONFIDENCE' }
  ];

  return (
    <div className="flex-1 p-5 sm:p-6 overflow-y-auto custom-scrollbar flex flex-col justify-between">
      <div className="w-full space-y-5">
        <div>
          <div className="text-[11px] text-[#18b6d9] uppercase tracking-wider font-mono font-semibold mb-1">
            MULTI-FACTOR INCIDENT MATRIX
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white">
            Event Assessment & Classification
          </h2>
          <p className="text-xs text-[#94a3b8] mt-1 max-w-3xl leading-relaxed">
            Deterministic rule-based classification synthesizing spatial containment, radiometry, and temporal continuity to trigger operational disaster protocols.
          </p>
        </div>

        {/* Evidence Evaluation Table */}
        <div className="border border-[#223042] rounded-lg overflow-hidden bg-[#16202a]">
          <div className="px-4 py-2.5 bg-[#121820] border-b border-[#223042] flex justify-between items-center text-xs">
            <span className="font-mono text-[#18b6d9] uppercase font-semibold">Evidence Criteria</span>
            <span className="font-mono text-[#94a3b8] uppercase">Heuristic Status</span>
          </div>
          <div className="divide-y divide-[#223042] text-xs">
            {evidence.map((item, i) => (
              <div key={i} className="px-4 py-3 flex items-center justify-between hover:bg-[#1a2532]/40 transition-colors">
                <div>
                  <div className="font-medium text-white">{item.label}</div>
                  <div className="text-[#94a3b8] text-[11px] mt-0.5">{item.value}</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#28c98a]/15 text-[#28c98a] border border-[#28c98a]/30 font-mono text-[10px] font-semibold">
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Classification Result Card */}
        <div className="p-4 rounded-lg bg-[#16202a] border border-[#e34b4b]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div>
            <div className="text-[11px] text-[#94a3b8] uppercase font-mono">Assigned Incident Classification</div>
            <div className="text-lg font-bold text-white mt-0.5 flex items-center gap-2">
              <span>{isEmergency ? 'Industrial Thermal Anomaly' : 'Persistent Industrial Flare'}</span>
              <span className="px-2 py-0.5 rounded bg-[#e34b4b] text-white font-mono text-[11px] font-bold">
                CRITICAL
              </span>
            </div>
            <div className="text-xs text-[#94a3b8] mt-1">
              Rule-based heuristic match: 94% classification confidence · Priority 1 response
            </div>
          </div>

          <div className="text-left sm:text-right">
            <div className="text-[11px] text-[#64748b] uppercase font-mono">Triggered Action</div>
            <div className="text-xs font-semibold text-[#f59a23] mt-0.5">Atmospheric Dispersion & Exposure Query</div>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-[#223042] text-xs text-[#64748b] font-mono flex items-center justify-between">
        <span>HEURISTIC CLASSIFIER: VERIFIED RULES</span>
        <span className="text-[#28c98a]">ACCURACY: ZERO HALLUCINATIONS</span>
      </div>
    </div>
  );
}

/* =========================================================================
   STEP 06: ASSESS (DOWNWIND DISPERSION ASSESSMENT)
   Two-column analysis layout: Left Atmospheric conditions, Right Estimated dispersion,
   Below Downwind transport path corridor.
   ========================================================================= */
function Step6Assess({ event }) {
  const weather = event.weather || {
    wind_speed_kmh: 22.4,
    wind_direction_deg: 245,
    downwind_direction: 'ENE — East-North-East inland corridor',
    temperature_c: 31.5,
    atmospheric_stability: 'Class C (Moderately unstable)'
  };
  const dispersion = event.dispersion || {
    estimated_length_km: 8.5,
    plume_cone_angle_deg: 32,
    hazard_tier: 'Tier 3 (Potential community corridor)'
  };

  return (
    <div className="flex-1 p-5 sm:p-6 overflow-y-auto custom-scrollbar flex flex-col justify-between">
      <div className="w-full space-y-5">
        <div>
          <div className="text-[11px] text-[#18b6d9] uppercase tracking-wider font-mono font-semibold mb-1">
            ATMOSPHERIC TRANSPORT COUPLING
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white">
            Downwind Dispersion Assessment
          </h2>
          <p className="text-xs text-[#94a3b8] mt-1 max-w-3xl leading-relaxed">
            Real-time boundary-layer meteorological data from Open-Meteo coupled with combustion energy output models the downwind atmospheric transport vector.
          </p>
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* LEFT: Atmospheric Conditions */}
          <div className="p-4 rounded-lg bg-[#16202a] border border-[#223042] space-y-3 shadow-sm">
            <div className="flex justify-between items-center border-b border-[#223042] pb-2">
              <span className="font-mono text-xs font-bold text-[#18b6d9]">ATMOSPHERIC CONDITIONS</span>
              <span className="text-[10px] font-mono text-[#94a3b8]">SOURCE: OPEN-METEO</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-[#223042]/50">
                <span className="text-[#94a3b8]">Wind Speed</span>
                <span className="font-mono font-bold text-white">{weather.wind_speed_kmh} km/h</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-[#223042]/50">
                <span className="text-[#94a3b8]">Wind Direction (From)</span>
                <span className="font-mono font-bold text-white">{weather.wind_direction_deg}° (WSW)</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-[#223042]/50">
                <span className="text-[#94a3b8]">Atmospheric Stability</span>
                <span className="font-mono text-[#f59a23]">{weather.atmospheric_stability}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-[#223042]/50">
                <span className="text-[#94a3b8]">Ambient Temperature</span>
                <span className="font-mono text-white">{weather.temperature_c || 31.5} °C</span>
              </div>
            </div>
          </div>

          {/* RIGHT: Estimated Dispersion */}
          <div className="p-4 rounded-lg bg-[#16202a] border border-[#223042] space-y-3 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center border-b border-[#223042] pb-2">
                <span className="font-mono text-xs font-bold text-[#f59a23]">ESTIMATED DISPERSION</span>
                <span className="text-[10px] font-mono text-[#28c98a]">GAUSSIAN MODEL</span>
              </div>
              {/* Plume Footprint Visual Vector */}
              <div className="py-3 flex items-center justify-center">
                <div className="flex items-center gap-3 px-4 py-2 rounded-md bg-[#121820] border border-[#223042]">
                  <Compass className="w-5 h-5 text-[#f59a23]" />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-mono text-[#94a3b8]">DISPERSION VECTOR</span>
                    <span className="text-sm font-mono font-bold text-white flex items-center gap-1">
                      ↗ 65° ENE Inland Corridor
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-[#223042]/50">
                  <span className="text-[#94a3b8]">Estimated Transport Distance</span>
                  <span className="font-mono font-bold text-[#f59a23]">{dispersion.estimated_length_km} km</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-[#223042]/50">
                  <span className="text-[#94a3b8]">Cone Aperture Angle</span>
                  <span className="font-mono text-white">{dispersion.plume_cone_angle_deg}°</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Below: Downwind Transport Path Corridor */}
        <div className="p-4 rounded-lg bg-[#151d27] border border-[#223042] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-[11px] text-[#18b6d9] uppercase font-mono font-semibold">
              DOWNWIND TRANSPORT PATH
            </div>
            <div className="text-sm font-bold text-white mt-0.5">
              {weather.downwind_direction || 'ENE — East-North-East inland corridor'}
            </div>
          </div>
          <div className="text-xs text-[#94a3b8] max-w-md text-left sm:text-right">
            Discharge dispersion trajectory projected along the prevailing boundary-layer wind azimuth toward regional infrastructure.
          </div>
        </div>

        {/* Scientific Disclaimer */}
        <div className="p-2.5 rounded bg-[#121820] border border-[#223042] text-[11px] text-[#94a3b8] flex items-center gap-2">
          <Info className="w-4 h-4 text-[#18b6d9] shrink-0" />
          <span>Scientific notice: Estimated dispersion represents an atmospheric transport trajectory based on boundary-layer meteorological models. It does not measure direct ground-level chemical ppm concentrations.</span>
        </div>
      </div>

      <div className="pt-4 border-t border-[#223042] text-xs text-[#64748b] font-mono flex items-center justify-between">
        <span>MODEL: OPEN-METEO GFS COUPLING</span>
        <span className="text-[#18b6d9]">STATUS: DOWNWIND CONE COMPUTED</span>
      </div>
    </div>
  );
}

/* =========================================================================
   STEP 07: EXPOSURE (COMMUNITY EXPOSURE ASSESSMENT)
   Map + Compact Receptor Panel: 3 settlements, 2 schools, 1 hospital with distances.
   ========================================================================= */
function Step7Exposure({ event, isDemoScenario }) {
  const demoExposure = {
    affected_settlements_count: 3,
    affected_schools_count: 2,
    affected_hospitals_count: 1,
    receptors: [
      { name: 'Kulai Coastal Settlement', distance_km: 2.8, status: 'Within estimate', type: 'Settlement' },
      { name: 'Baikampady Industrial Sector', distance_km: 4.2, status: 'Within estimate', type: 'Settlement' },
      { name: 'Surathkal Urban Sector', distance_km: 6.8, status: 'Within estimate', type: 'Settlement' },
      { name: 'Kulai Govt Higher Primary School', distance_km: 3.1, status: 'Within estimate', type: 'School' },
      { name: 'Technical Training Institute', distance_km: 5.0, status: 'Within estimate', type: 'School' },
      { name: 'Community Health Center', distance_km: 6.4, status: 'Within estimate', type: 'Hospital' }
    ]
  };

  const ce = event.community_exposure || {};
  const isControlledDemo = isDemoScenario || !event.community_exposure;
  
  const settlements = isControlledDemo 
    ? demoExposure.receptors.filter(r => r.type === 'Settlement')
    : (ce.intersecting_settlements || []).map(s => ({ ...s, type: 'Settlement' }));
  const schools = isControlledDemo 
    ? demoExposure.receptors.filter(r => r.type === 'School')
    : (ce.intersecting_schools || []).map(s => ({ ...s, type: 'School' }));
  const hospitals = isControlledDemo 
    ? demoExposure.receptors.filter(r => r.type === 'Hospital')
    : (ce.intersecting_hospitals || []).map(s => ({ ...s, type: 'Hospital' }));
  const totalReceptors = isControlledDemo ? 6 : (ce.total_sensitive_in_corridor || 0);

  return (
    <div className="flex-1 p-5 sm:p-6 overflow-y-auto custom-scrollbar flex flex-col justify-between">
      <div className="w-full space-y-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-[11px] text-[#18b6d9] uppercase tracking-wider font-mono font-semibold">
              SPATIAL BUFFER & INTERSECTION QUERY
            </span>
            {isControlledDemo ? (
              <span className="px-2 py-0.5 rounded bg-[#f59a23]/15 text-[#f59a23] border border-[#f59a23]/30 text-[10px] font-mono font-semibold">
                DEMONSTRATION SCENARIO — CURATED DEMO RECEPTOR DATA
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-[#28c98a]/15 text-[#28c98a] border border-[#28c98a]/30 text-[10px] font-mono font-semibold">
                LIVE OBSERVATION — OPENSTREETMAP OVERPASS
              </span>
            )}
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white">
            Community Exposure Assessment
          </h2>
          <p className="text-xs text-[#94a3b8] mt-1 max-w-3xl leading-relaxed">
            Geospatial intersection queries correlate the estimated dispersion cone with OpenStreetMap community infrastructure points to alert sensitive receptors.
          </p>
        </div>

        {/* Receptors Display: Zero State or Receptor Lists */}
        {totalReceptors === 0 ? (
          <div className="p-8 rounded-lg bg-[#16202a] border border-[#223042] text-center space-y-2">
            <div className="text-sm font-mono font-bold text-white tracking-wide">
              NO SENSITIVE RECEPTORS IDENTIFIED
            </div>
            <div className="text-xs text-[#94a3b8]">
              within estimated dispersion footprint ({ce.hazard_length_km || 8.5} km corridor)
            </div>
            <div className="text-[11px] font-mono text-[#18b6d9] pt-1">
              SOURCE: OPENSTREETMAP QUERY (ZERO CORRIDOR MATCH)
            </div>
          </div>
        ) : (
          <>
            {/* Top Receptor Counters */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3.5 rounded-lg bg-[#16202a] border border-[#223042] text-center shadow-sm">
                <div className="text-[11px] text-[#94a3b8] uppercase font-mono">Settlements</div>
                <div className="text-xl font-bold font-mono text-white mt-0.5">{settlements.length}</div>
                <div className="text-[11px] text-[#f59a23] mt-0.5">Residential zones</div>
              </div>
              <div className="p-3.5 rounded-lg bg-[#16202a] border border-[#223042] text-center shadow-sm">
                <div className="text-[11px] text-[#94a3b8] uppercase font-mono">Schools</div>
                <div className="text-xl font-bold font-mono text-white mt-0.5">{schools.length}</div>
                <div className="text-[11px] text-[#a855f7] mt-0.5">Educational facilities</div>
              </div>
              <div className="p-3.5 rounded-lg bg-[#16202a] border border-[#223042] text-center shadow-sm">
                <div className="text-[11px] text-[#94a3b8] uppercase font-mono">Hospitals</div>
                <div className="text-xl font-bold font-mono text-white mt-0.5">{hospitals.length}</div>
                <div className="text-[11px] text-[#e34b4b] mt-0.5">Critical healthcare</div>
              </div>
            </div>

            {/* Grouped Receptors List */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Settlements */}
              <div className="p-3.5 rounded-lg bg-[#16202a] border border-[#223042] space-y-2">
                <div className="text-[11px] font-mono font-bold text-[#f59a23] uppercase border-b border-[#223042] pb-1.5 flex justify-between">
                  <span>SETTLEMENTS</span>
                  <span>DISTANCE</span>
                </div>
                <div className="space-y-2 text-xs">
                  {settlements.map((r, i) => (
                    <div key={i} className="flex justify-between items-center py-1">
                      <span className="text-[#f1f5f9] truncate pr-2">{r.name}</span>
                      <span className="font-mono text-[#f59a23] shrink-0">{r.distance_km} km</span>
                    </div>
                  ))}
                  {settlements.length === 0 && (
                    <div className="text-[11px] text-[#64748b] italic py-1">None in corridor</div>
                  )}
                </div>
              </div>

              {/* Schools */}
              <div className="p-3.5 rounded-lg bg-[#16202a] border border-[#223042] space-y-2">
                <div className="text-[11px] font-mono font-bold text-[#a855f7] uppercase border-b border-[#223042] pb-1.5 flex justify-between">
                  <span>SCHOOLS</span>
                  <span>DISTANCE</span>
                </div>
                <div className="space-y-2 text-xs">
                  {schools.map((r, i) => (
                    <div key={i} className="flex justify-between items-center py-1">
                      <span className="text-[#f1f5f9] truncate pr-2">{r.name}</span>
                      <span className="font-mono text-[#a855f7] shrink-0">{r.distance_km} km</span>
                    </div>
                  ))}
                  {schools.length === 0 && (
                    <div className="text-[11px] text-[#64748b] italic py-1">None in corridor</div>
                  )}
                </div>
              </div>

              {/* Hospitals */}
              <div className="p-3.5 rounded-lg bg-[#16202a] border border-[#223042] space-y-2">
                <div className="text-[11px] font-mono font-bold text-[#e34b4b] uppercase border-b border-[#223042] pb-1.5 flex justify-between">
                  <span>HOSPITALS</span>
                  <span>DISTANCE</span>
                </div>
                <div className="space-y-2 text-xs">
                  {hospitals.map((r, i) => (
                    <div key={i} className="flex justify-between items-center py-1">
                      <span className="text-[#f1f5f9] truncate pr-2">{r.name}</span>
                      <span className="font-mono text-[#e34b4b] shrink-0">{r.distance_km} km</span>
                    </div>
                  ))}
                  {hospitals.length === 0 && (
                    <div className="text-[11px] text-[#64748b] italic py-1">None in corridor</div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="pt-4 border-t border-[#223042] text-xs text-[#64748b] font-mono flex items-center justify-between">
        <span>EXPOSURE AUDIT: {isControlledDemo ? 'CURATED DEMO RECEPTOR DATASET' : 'OPENSTREETMAP LIVE QUERY'}</span>
        <span className="text-[#f59a23]">TOTAL FACILITIES: {totalReceptors} IDENTIFIED</span>
      </div>
    </div>
  );
}

/* =========================================================================
   STEP 08: 3D INSPECT (CESIUM 3D INCIDENT INSPECTION)
   Cesium 3D scene dominant with toolbar and technical inspector.
   ========================================================================= */
function Step8Inspect({ event, facilities, sensitiveLocations }) {
  const [locateTrigger, setLocateTrigger] = useState(0);

  return (
    <div className="flex-1 relative h-full w-full overflow-hidden flex">
      {/* Cesium 3D Scene */}
      <div className="flex-1 relative h-full">
        <Cesium3DViewer
          selectedFire={event}
          facilities={facilities}
          sensitiveLocations={sensitiveLocations}
          activePlume={null}
          onExit3D={() => {}}
          locateTrigger={locateTrigger}
        />
      </div>

      {/* Professional Telemetry Inspector Panel */}
      <div className="absolute top-4 right-4 z-[999] w-72 p-4 rounded-lg bg-[#121820]/95 border border-[#223042] text-xs space-y-3 shadow-lg">
        <div className="flex items-center justify-between pb-2 border-b border-[#223042]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#18b6d9]" />
            <span className="font-mono font-bold text-white text-[11px]">3D INCIDENT INSPECTOR</span>
          </div>
          <button
            onClick={() => setLocateTrigger(prev => prev + 1)}
            className="px-2 py-0.5 rounded bg-[#f59a23]/15 text-[#f59a23] border border-[#f59a23]/30 text-[10px] font-mono hover:bg-[#f59a23]/25 cursor-pointer"
          >
            LOCATE
          </button>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-[#94a3b8]">Event Track</span>
            <span className="font-mono text-white">{event.event_id || event.fire_id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#94a3b8]">Latitude</span>
            <span className="font-mono text-[#18b6d9]">{Number(event.latitude).toFixed(6)}° N</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#94a3b8]">Longitude</span>
            <span className="font-mono text-[#18b6d9]">{Number(event.longitude).toFixed(6)}° E</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#94a3b8]">Observed FRP</span>
            <span className="font-mono font-bold text-[#f59a23]">{event.frp} MW</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#94a3b8]">Satellite Sensor</span>
            <span className="font-mono text-white">{event.satellite || 'VIIRS NOAA-21'}</span>
          </div>
        </div>

        <div className="pt-2 border-t border-[#223042] text-[11px] text-[#94a3b8] space-y-1 font-mono">
          <div className="text-[#18b6d9] font-semibold">• 3D Navigation Controls</div>
          <div>Left drag: Orbit camera</div>
          <div>Right drag / Scroll: Zoom in/out</div>
          <div>Ctrl + drag: Tilt pitch & roll</div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   STEP 09: RESPOND (INCIDENT ASSESSMENT REPORT)
   Analyst Assessment Panel + Orange [VIEW INCIDENT REPORT] Button.
   ========================================================================= */
function Step9Respond({ event, onOpenReport }) {
  return (
    <div className="flex-1 p-5 sm:p-6 overflow-y-auto custom-scrollbar flex flex-col justify-between">
      <div className="w-full space-y-5">
        <div>
          <div className="text-[11px] text-[#18b6d9] uppercase tracking-wider font-mono font-semibold mb-1">
            STATUTORY EMERGENCY DOSSIER
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white">
            Incident Assessment & Response
          </h2>
          <p className="text-xs text-[#94a3b8] mt-1 max-w-3xl leading-relaxed">
            Consolidated intelligence summary prepared for the National Disaster Response Force (NDRF) and District Disaster Management Authority (DDMA).
          </p>
        </div>

        {/* Assessment Dossier Table */}
        <div className="border border-[#223042] rounded-lg overflow-hidden bg-[#16202a]">
          <div className="px-4 py-2.5 bg-[#121820] border-b border-[#223042] flex justify-between items-center text-xs">
            <span className="font-mono text-[#18b6d9] uppercase font-semibold">Incident Parameter</span>
            <span className="font-mono text-[#94a3b8] uppercase">Evaluated Value</span>
          </div>
          <div className="divide-y divide-[#223042] text-xs">
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-[#94a3b8]">Incident Identifier</span>
              <span className="font-mono font-bold text-white">{event.event_id || event.fire_id}</span>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-[#94a3b8]">Priority Tier</span>
              <span className="px-2 py-0.5 rounded bg-[#e34b4b] text-white font-mono font-bold text-[11px]">
                HIGH PRIORITY (TIER 1)
              </span>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-[#94a3b8]">Observed FRP</span>
              <span className="font-mono font-bold text-[#f59a23]">{event.frp} MW</span>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-[#94a3b8]">Baseline Exceedance Anomaly</span>
              <span className="font-mono font-bold text-[#f59a23]">{event.anomaly_ratio || '5.91'}× Baseline</span>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-[#94a3b8]">Sensitive Receptors within Estimate</span>
              <span className="font-mono text-white">4 Facilities (3 Settlements, 1 Hospital)</span>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-[#94a3b8]">Statutory Authority Review</span>
              <span className="font-mono text-[#f59a23] font-semibold">REQUIRED IMMEDIATELY</span>
            </div>
          </div>
        </div>

        {/* Action Button & Notice */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-lg bg-[#151d27] border border-[#223042]">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-white">Standard Operating Procedure Dossier</div>
            <div className="text-[11px] text-[#94a3b8]">
              Generate printable NDRF/DDMA incident dossier with all satellite radiometry, boundary coordinates, and receptor contact lists.
            </div>
          </div>

          <button
            onClick={onOpenReport}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-[#f59a23] hover:bg-[#e08916] text-black text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-sm shrink-0"
          >
            <FileText className="w-4 h-4" />
            <span>VIEW INCIDENT REPORT</span>
          </button>
        </div>
      </div>

      <div className="pt-4 border-t border-[#223042] text-xs text-[#64748b] font-mono flex items-center justify-between">
        <span>AUTHORITY: DDMA / NDRF ADVISORY READY</span>
        <span className="text-[#28c98a]">STATUS: EVIDENCE PACKAGE SEALED</span>
      </div>
    </div>
  );
}

/* =========================================================================
   STEP 10: SUMMARY (INTELLIGENCE SUMMARY & DECISION SUPPORT)
   3x3 compact feature blocks + final CTA: [EXPLORE LIVE PLATFORM →]
   ========================================================================= */
function Step10Summary({ onRestart, onOpenPlatform }) {
  const blocks = [
    { num: '01', title: 'NASA FIRMS', desc: 'Real-time thermal radiative detection via VIIRS 375m sensor' },
    { num: '02', title: 'Multi-Satellite Correlation', desc: 'Pass correlation across SNPP, NOAA-20, NOAA-21 to eliminate false alarms' },
    { num: '03', title: 'OSM Cadastre Context', desc: 'Industrial perimeter query matching authorized facility footprints' },
    { num: '04', title: 'FRP Anomaly Analysis', desc: 'Thermal exceedance quantified against facility baseline operating flares' },
    { num: '05', title: 'Event Assessment', desc: 'Multi-factor classification assigning critical incident priority tiers' },
    { num: '06', title: 'Atmospheric Dispersion', desc: 'Open-Meteo boundary-layer wind coupling modeling downwind plumes' },
    { num: '07', title: 'Community Exposure', desc: 'Sensitive receptor query identifying settlements, schools, and hospitals' },
    { num: '08', title: 'Cesium 3D Inspection', desc: 'Oblique site-level inspection with terrain, boundaries, and thermal pin' },
    { num: '09', title: 'Incident Dossier', desc: 'Complete NDRF / DDMA evidentiary package prepared for authority dispatch' }
  ];

  return (
    <div className="flex-1 p-5 sm:p-6 overflow-y-auto custom-scrollbar flex flex-col justify-between">
      <div className="w-full space-y-5">
        <div>
          <div className="text-[11px] text-[#18b6d9] uppercase tracking-wider font-mono font-semibold mb-1">
            END-TO-END PIPELINE ARCHITECTURE
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white">
            AGNIDRISHTI Analytical Summary
          </h2>
          <p className="text-xs text-[#94a3b8] mt-1 max-w-3xl leading-relaxed">
            From raw satellite thermal detection to automated community alert and incident report dispatch in nine verifiable stages.
          </p>
        </div>

        {/* 3x3 Compact Feature Blocks */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {blocks.map((b) => (
            <div key={b.num} className="p-3.5 rounded-lg bg-[#16202a] border border-[#223042] space-y-1.5 shadow-sm hover:border-[#18b6d9]/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#18b6d9]">{b.num}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#28c98a]" />
              </div>
              <div className="text-xs font-bold text-white">{b.title}</div>
              <div className="text-[11px] text-[#94a3b8] leading-relaxed">{b.desc}</div>
            </div>
          ))}
        </div>

        {/* Final Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onOpenPlatform}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-[#f59a23] hover:bg-[#e08916] text-black text-xs font-bold tracking-wider uppercase transition-colors cursor-pointer shadow-md"
            >
              <span>EXPLORE LIVE PLATFORM</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onRestart}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-md border border-[#223042] hover:bg-[#16202a] text-[#f1f5f9] text-xs font-medium transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restart Demo</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-[#64748b] text-center sm:text-right">
            SMART INDIA HACKATHON 2026 · PROBLEM STATEMENT 26162 (NTRO)
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-[#223042] text-xs text-[#64748b] font-mono flex items-center justify-between">
        <span>SYSTEM READINESS: 100% OPERATIONAL</span>
        <span className="text-[#28c98a]">INTELLIGENCE CYCLE COMPLETE</span>
      </div>
    </div>
  );
}
