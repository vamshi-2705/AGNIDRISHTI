import React, { useState, useRef, useEffect } from 'react';
import { 
  Database, ChevronRight, ChevronLeft, Satellite, MapPin, Gauge, 
  Cpu, AlertTriangle, ShieldCheck, Play, Pause, RotateCcw, 
  Eye, CheckCircle2, Users, Layers, FileText, Sparkles
} from 'lucide-react';

export const DEMO_PIPELINE_STAGES = [
  { step: 1, id: 'detect', label: 'DETECT', context: 'VIIRS Anomaly', icon: Satellite, desc: 'Thermal anomaly detected' },
  { step: 2, id: 'verify', label: 'VERIFY', context: 'Multi-Pass', icon: CheckCircle2, desc: 'Multi-satellite pass verified' },
  { step: 3, id: 'context', label: 'CONTEXT', context: 'Facility + OSM', icon: MapPin, desc: 'Industrial boundary matched' },
  { step: 4, id: 'analyze', label: 'ANALYZE', context: 'FRP Baseline', icon: Gauge, desc: '3.41× baseline anomaly' },
  { step: 5, id: 'classify', label: 'CLASSIFY', context: 'Industrial Fire', icon: Cpu, desc: 'Critical classification' },
  { step: 6, id: 'assess', label: 'ASSESS', context: 'Dispersion', icon: AlertTriangle, desc: '18 km/h NW wind, SE corridor' },
  { step: 7, id: 'exposure', label: 'EXPOSURE', context: 'Downwind Receptors', icon: Users, desc: 'Nearby settlements & schools' },
  { step: 8, id: '3d_inspect', label: '3D INSPECT', context: 'Site Geometry', icon: Layers, desc: 'Site-level inspection' },
  { step: 9, id: 'respond', label: 'RESPOND', context: 'Incident Brief', icon: ShieldCheck, desc: 'Actionable brief generated' },
  { step: 10, id: 'summary', label: 'SUMMARY', context: 'NDRF Dossier', icon: FileText, desc: 'Critical incident summary' }
];

const STANDARD_STAGES = [
  { id: 'detect', label: 'DETECT', context: 'NASA VIIRS', icon: Satellite },
  { id: 'context', label: 'CONTEXT', context: 'OSM + LULC', icon: MapPin },
  { id: 'analyze', label: 'ANALYZE', context: 'FRP Baseline', icon: Gauge },
  { id: 'classify', label: 'CLASSIFY', context: 'Thermal Event', icon: Cpu },
  { id: 'assess', label: 'ASSESS', context: 'Dispersion Risk', icon: AlertTriangle },
  { id: 'respond', label: 'RESPOND', context: 'Incident Report', icon: ShieldCheck }
];

export default function IntelligencePipelineStrip({ 
  isLive, 
  totalHotspots,
  isDemoMode = false,
  demoStage = 1,
  onSelectStage = () => {},
  isPlayingDemo = false,
  onTogglePlayDemo = () => {},
  onResetDemo = () => {}
}) {
  const [showSourcesModal, setShowSourcesModal] = useState(false);
  const popoverRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setShowSourcesModal(false);
      }
    }
    if (showSourcesModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSourcesModal]);

  return (
    <div className="h-9 bg-[#070a0f] border-b border-white/[0.05] px-4 flex items-center justify-between z-20 shrink-0 text-xs font-sans select-none overflow-x-auto scrollbar-none">
      {/* DEMO MODE: 10-Stage Guided Investigation Pipeline */}
      {isDemoMode ? (
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
          {/* Demo Controls Bar */}
          <div className="flex items-center gap-1 pr-2 border-r border-white/10 shrink-0">
            <button
              onClick={onTogglePlayDemo}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer border ${
                isPlayingDemo
                  ? 'bg-amber-950/80 text-amber-300 border-amber-600/70 shadow-sm'
                  : 'bg-cyan-950/80 text-cyan-300 border-cyan-600/60 hover:bg-cyan-900/80 hover:text-white'
              }`}
              title={isPlayingDemo ? "Pause Demo Autoplay" : "Start Demo Walkthrough Sequence"}
            >
              {isPlayingDemo ? (
                <>
                  <Pause className="w-2.5 h-2.5 fill-amber-300" />
                  <span>PAUSE</span>
                </>
              ) : (
                <>
                  <Play className="w-2.5 h-2.5 fill-cyan-300" />
                  <span>PLAY DEMO</span>
                </>
              )}
            </button>

            <button
              onClick={onResetDemo}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
              title="Reset Demo to Step 1 (DETECT)"
            >
              <RotateCcw className="w-2.5 h-2.5" />
            </button>

            <span className="text-[9.5px] font-mono text-slate-400 ml-0.5">
              {demoStage}/10
            </span>
          </div>

          {/* 10 Interactive Sequential Stages */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {DEMO_PIPELINE_STAGES.map((stage) => {
              const Icon = stage.icon;
              const isActive = demoStage === stage.step;
              const isPast = demoStage > stage.step;
              const isLast = stage.step === DEMO_PIPELINE_STAGES.length;

              return (
                <React.Fragment key={stage.id}>
                  <button
                    onClick={() => onSelectStage(stage.step)}
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-all cursor-pointer shrink-0 border ${
                      isActive
                        ? 'bg-orange-500/20 text-orange-200 border-orange-500/60 shadow-[0_0_10px_rgba(249,115,22,0.25)]'
                        : isPast
                        ? 'bg-white/[0.04] text-slate-300 border-white/[0.08] hover:bg-white/[0.08]'
                        : 'bg-transparent text-slate-500 border-transparent hover:text-slate-300'
                    }`}
                    title={`${stage.step}. ${stage.label}: ${stage.desc} (Click to inspect)`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-mono font-bold ${
                      isActive
                        ? 'bg-orange-500 text-black'
                        : isPast
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-white/[0.06] text-slate-400'
                    }`}>
                      {stage.step}
                    </span>
                    <span className={`text-[10.5px] font-bold tracking-wider ${
                      isActive ? 'text-white' : isPast ? 'text-slate-200' : 'text-slate-400'
                    }`}>
                      {stage.label}
                    </span>
                    <span className={`text-[9.5px] font-mono hidden md:inline ${
                      isActive ? 'text-orange-300' : 'text-slate-500'
                    }`}>
                      {stage.context}
                    </span>
                  </button>

                  {!isLast && (
                    <ChevronRight className={`w-3 h-3 shrink-0 ${isPast ? 'text-emerald-500/50' : 'text-slate-700'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      ) : (
        /* REAL MODE: Standard 6-Stage Intelligence Pipeline */
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mr-1 hidden sm:inline">
            PIPELINE:
          </span>

          {STANDARD_STAGES.map((stage, idx) => {
            const Icon = stage.icon;
            const isLast = idx === STANDARD_STAGES.length - 1;

            return (
              <React.Fragment key={stage.id}>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Icon className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="text-[11px] font-bold tracking-wider text-slate-200">
                    {stage.label}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono tracking-normal">
                    {stage.context}
                  </span>
                </div>

                {!isLast && (
                  <ChevronRight className="w-3 h-3 text-slate-600 shrink-0 mx-1" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Right: Data Sources Trigger */}
      <div className="relative shrink-0 ml-3" ref={popoverRef}>
        <button
          onClick={() => setShowSourcesModal(!showSourcesModal)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] transition-colors cursor-pointer"
          title="View Active Geospatial Data Sources"
        >
          <Database className="w-3 h-3 text-emerald-400" />
          <span>DATA SOURCES</span>
          <span className={`w-1.5 h-1.5 rounded-full ml-0.5 ${isLive ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
        </button>

        {showSourcesModal && (
          <div className="absolute right-0 top-9 w-72 bg-[#0e131b] border border-white/[0.08] rounded-lg shadow-2xl p-3 z-50 text-slate-200 font-sans">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.06]">
              <span className="text-[11px] font-bold text-white tracking-wider uppercase font-mono">
                DATA SOURCES & PROVENANCE
              </span>
              <button
                onClick={() => setShowSourcesModal(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer p-0.5"
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5 text-[11px]">
              {/* NASA FIRMS / VIIRS */}
              <div className="flex items-center justify-between p-1.5 px-2 rounded bg-[#131822] border border-white/[0.04]">
                <div>
                  <div className="font-semibold text-slate-200 text-[11px]">NASA FIRMS / VIIRS</div>
                  <div className="text-[10px] text-slate-400">Thermal observations (SNPP, NOAA-20, NOAA-21)</div>
                </div>
                <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                  isLive ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40' : 'bg-amber-950/80 text-amber-300 border border-amber-800/40'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                  {isLive ? 'LIVE' : 'DEMO'}
                </span>
              </div>

              {/* OpenStreetMap */}
              <div className="flex items-center justify-between p-1.5 px-2 rounded bg-[#131822] border border-white/[0.04]">
                <div>
                  <div className="font-semibold text-slate-200 text-[11px]">OpenStreetMap Overpass</div>
                  <div className="text-[10px] text-slate-400">Industrial perimeters & critical receptors</div>
                </div>
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-800 text-amber-300 border border-amber-800/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  VERIFIED
                </span>
              </div>

              {/* ESA WorldCover */}
              <div className="flex items-center justify-between p-1.5 px-2 rounded bg-[#131822] border border-white/[0.04]">
                <div>
                  <div className="font-semibold text-slate-200 text-[11px]">ESA WorldCover / LULC</div>
                  <div className="text-[10px] text-slate-400">Built-up & vegetative baseline</div>
                </div>
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-800 text-slate-300 border border-white/[0.06]">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                  10M BASE
                </span>
              </div>

              {/* Open-Meteo GFS */}
              <div className="flex items-center justify-between p-1.5 px-2 rounded bg-[#131822] border border-white/[0.04]">
                <div>
                  <div className="font-semibold text-slate-200 text-[11px]">Boundary-Layer Meteorology</div>
                  <div className="text-[10px] text-slate-400">Surface wind speed & dispersion vectors</div>
                </div>
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  ACTIVE
                </span>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-white/[0.05] text-[10px] text-slate-400 text-center">
              Multi-source correlation for reliable thermal intelligence.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
