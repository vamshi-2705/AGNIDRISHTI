import React, { useState } from 'react';
import { Database, ChevronRight, Layers, Satellite, Cpu, MapPin, Gauge, CheckCircle2 } from 'lucide-react';

export default function IntelligencePipelineStrip({ isLive, totalHotspots }) {
  const [showSourcesModal, setShowSourcesModal] = useState(false);

  return (
    <div className="relative h-8 bg-[#090d12] border-b border-white/[0.07] px-4 flex items-center justify-between z-20 shrink-0 text-xs font-sans select-none">
      {/* Left: Intelligence Pipeline Flow */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
        <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mr-1 hidden sm:inline">
          PIPELINE:
        </span>

        {/* Step 1: NASA VIIRS */}
        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#121820] border border-white/[0.05] text-[10px]">
          <Satellite className="w-3 h-3 text-sky-400 shrink-0" />
          <span className="text-slate-300 font-medium">NASA VIIRS</span>
          <span className={`px-1 py-0.2 rounded text-[9px] font-mono font-semibold ${
            isLive ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40' : 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
          }`}>
            {isLive ? 'LIVE' : 'SIMULATED'}
          </span>
        </div>

        <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />

        {/* Step 2: Thermal Detection */}
        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#121820] border border-white/[0.05] text-[10px]">
          <Cpu className="w-3 h-3 text-orange-400 shrink-0" />
          <span className="text-slate-300 font-medium">THERMAL EVENTS</span>
          <span className="px-1 py-0.2 rounded text-[9px] font-mono font-semibold bg-orange-950/60 text-orange-300 border border-orange-800/40">
            {totalHotspots || 12} DETECTED
          </span>
        </div>

        <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />

        {/* Step 3: Spatial Context */}
        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#121820] border border-white/[0.05] text-[10px]">
          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="text-slate-300 font-medium">OSM + LULC</span>
          <span className="px-1 py-0.2 rounded text-[9px] font-mono font-semibold bg-[#1a232f] text-slate-300 border border-white/[0.05]">
            CONTEXT
          </span>
        </div>

        <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />

        {/* Step 4: Baseline Analysis */}
        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#121820] border border-white/[0.05] text-[10px]">
          <Gauge className="w-3 h-3 text-amber-400 shrink-0" />
          <span className="text-slate-300 font-medium">FRP BASELINE</span>
          <span className="px-1 py-0.2 rounded text-[9px] font-mono font-semibold bg-amber-950/60 text-amber-300 border border-amber-800/40">
            ANALYZED
          </span>
        </div>

        <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />

        {/* Step 5: Event Assessment */}
        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#121820] border border-white/[0.05] text-[10px]">
          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
          <span className="text-slate-300 font-medium">ASSESSMENT</span>
          <span className="px-1 py-0.2 rounded text-[9px] font-mono font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
            READY
          </span>
        </div>
      </div>

      {/* Right: Integrated Data Sources Popover Trigger */}
      <div className="relative">
        <button
          onClick={() => setShowSourcesModal(!showSourcesModal)}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#131922] hover:bg-[#1a232f] border border-white/[0.08] hover:border-slate-500 text-[10px] font-medium text-slate-300 hover:text-white transition-all cursor-pointer"
          title="View Active Geospatial Data Sources"
        >
          <Database className="w-3 h-3 text-emerald-400" />
          <span>DATA SOURCES</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-0.5"></span>
        </button>

        {/* Dropdown / Popover */}
        {showSourcesModal && (
          <div className="absolute right-0 top-9 w-72 bg-[#10151c] border border-white/[0.1] rounded-lg shadow-2xl p-3 z-50 text-slate-200">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.08]">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-white">
                <Layers className="w-3.5 h-3.5 text-orange-400" />
                <span>INTEGRATED DATA SOURCES</span>
              </div>
              <button
                onClick={() => setShowSourcesModal(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-[11px]">
              <div className="flex items-start justify-between p-1.5 rounded bg-[#161d26] border border-white/[0.04]">
                <div>
                  <div className="font-medium text-slate-100">NASA FIRMS</div>
                  <div className="text-[10px] text-slate-400">VIIRS I-Band 375m Radiometer</div>
                </div>
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                  isLive ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50' : 'bg-amber-950 text-amber-300 border border-amber-800/50'
                }`}>
                  {isLive ? 'LIVE NRT' : 'CALIBRATED'}
                </span>
              </div>

              <div className="flex items-start justify-between p-1.5 rounded bg-[#161d26] border border-white/[0.04]">
                <div>
                  <div className="font-medium text-slate-100">OpenStreetMap</div>
                  <div className="text-[10px] text-slate-400">Overpass API & Nominatim</div>
                </div>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                  LIVE
                </span>
              </div>

              <div className="flex items-start justify-between p-1.5 rounded bg-[#161d26] border border-white/[0.04]">
                <div>
                  <div className="font-medium text-slate-100">Open-Meteo</div>
                  <div className="text-[10px] text-slate-400">Atmospheric Wind Vectors</div>
                </div>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                  LIVE
                </span>
              </div>

              <div className="flex items-start justify-between p-1.5 rounded bg-[#161d26] border border-white/[0.04]">
                <div>
                  <div className="font-medium text-slate-100">ESA WorldCover</div>
                  <div className="text-[10px] text-slate-400">10m Land Cover Baseline</div>
                </div>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-slate-800 text-slate-300 border border-white/[0.08]">
                  BASELINE
                </span>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-white/[0.06] text-[9px] text-slate-400 text-center font-sans">
              All multi-sensor inputs are correlated in real time.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
