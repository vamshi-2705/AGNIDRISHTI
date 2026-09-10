import React, { useState, useRef, useEffect } from 'react';
import { Database, ChevronRight, Satellite, MapPin, Gauge, Cpu, AlertTriangle, ShieldCheck } from 'lucide-react';

const PIPELINE_STAGES = [
  { id: 'detect', label: 'DETECT', context: 'NASA VIIRS', icon: Satellite },
  { id: 'context', label: 'CONTEXT', context: 'OSM + LULC', icon: MapPin },
  { id: 'analyze', label: 'ANALYZE', context: 'FRP Baseline', icon: Gauge },
  { id: 'classify', label: 'CLASSIFY', context: 'Anomaly Engine', icon: Cpu },
  { id: 'assess', label: 'ASSESS', context: 'Dispersion Risk', icon: AlertTriangle },
  { id: 'respond', label: 'RESPOND', context: 'Action Dossier', icon: ShieldCheck }
];

export default function IntelligencePipelineStrip({ isLive, totalHotspots }) {
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
    <div className="h-9 bg-[#070a0f] border-b border-white/[0.05] px-5 flex items-center justify-between z-20 shrink-0 text-xs font-sans select-none">
      {/* 6-Stage Intelligence Pipeline with Technical Context */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
        <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mr-1 hidden sm:inline">
          PIPELINE:
        </span>

        {PIPELINE_STAGES.map((stage, idx) => {
          const Icon = stage.icon;
          const isLast = idx === PIPELINE_STAGES.length - 1;

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
          <div className="absolute right-0 top-9 w-76 bg-[#0e131b] border border-white/[0.08] rounded-lg shadow-2xl p-3.5 z-50 text-slate-200">
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-white/[0.06]">
              <span className="text-xs font-semibold text-white tracking-wide">
                Integrated Data Sources
              </span>
              <button
                onClick={() => setShowSourcesModal(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer p-0.5"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-[11px]">
              {/* NASA FIRMS */}
              <div className="flex items-center justify-between p-2 rounded bg-[#131822] border border-white/[0.04]">
                <div>
                  <div className="font-medium text-slate-200">NASA FIRMS</div>
                  <div className="text-[10px] text-slate-400">VIIRS 375m NRT Thermal</div>
                </div>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                  isLive ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' : 'bg-amber-950 text-amber-300 border border-amber-800/40'
                }`}>
                  {isLive ? 'LIVE' : 'FALLBACK'}
                </span>
              </div>

              {/* OpenStreetMap */}
              <div className="flex items-center justify-between p-2 rounded bg-[#131822] border border-white/[0.04]">
                <div>
                  <div className="font-medium text-slate-200">OpenStreetMap</div>
                  <div className="text-[10px] text-slate-400">Overpass Industrial Context</div>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                  LIVE
                </span>
              </div>

              {/* Open-Meteo */}
              <div className="flex items-center justify-between p-2 rounded bg-[#131822] border border-white/[0.04]">
                <div>
                  <div className="font-medium text-slate-200">Open-Meteo</div>
                  <div className="text-[10px] text-slate-400">Surface Wind Vectors (10m)</div>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                  LIVE
                </span>
              </div>

              {/* ESA WorldCover */}
              <div className="flex items-center justify-between p-2 rounded bg-[#131822] border border-white/[0.04]">
                <div>
                  <div className="font-medium text-slate-200">ESA WorldCover</div>
                  <div className="text-[10px] text-slate-400">10m Land-Use Classification</div>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-800 text-slate-300 border border-white/[0.06]">
                  BASELINE
                </span>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-white/[0.05] text-[10px] text-slate-400 text-center">
              Correlated in real time across the Indian subcontinent.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
