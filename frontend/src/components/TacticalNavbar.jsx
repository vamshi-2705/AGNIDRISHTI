import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, Satellite } from 'lucide-react';
import logoImg from '../assets/logo.jpg';

export default function TacticalNavbar({ summary, isLive, activeEmergencyCount, onBackToLanding }) {
  const [istTime, setIstTime] = useState('');
  const [utcTime, setUtcTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().split(' ').slice(4, 5)[0] + ' UTC');
      setIstTime(now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }) + ' IST');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const kpis = summary?.kpis || {
    total_active_hotspots: 12,
    critical_industrial_emergencies: 2,
    industrial_noise_filtered_pct: 33.3
  };

  const emergencyCount = activeEmergencyCount ?? kpis.critical_industrial_emergencies;
  const hasEmergencies = emergencyCount > 0;
  const lastUpdated = summary?.last_updated || '2026-09-10 07:15 UTC';

  return (
    <header className="h-14 bg-[#090d14] border-b border-white/[0.06] px-5 flex items-center justify-between z-30 shrink-0 select-none font-sans">
      {/* LEFT: Overview / Back + Brand */}
      <div className="flex items-center gap-4">
        {onBackToLanding && (
          <button
            onClick={onBackToLanding}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
            title="Return to Overview"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] tracking-wider uppercase font-semibold">OVERVIEW / BACK</span>
          </button>
        )}

        <div 
          className={`flex items-center gap-3 ${onBackToLanding ? 'cursor-pointer group' : ''}`}
          onClick={onBackToLanding}
          title={onBackToLanding ? "Return to Overview" : undefined}
        >
          <div className="w-8 h-8 rounded-full overflow-hidden border border-white/[0.1] bg-black shrink-0 flex items-center justify-center p-0.5 shadow-sm">
            <img 
              src={logoImg} 
              alt="AGNI DRISHTI Logo" 
              className="w-full h-full object-cover rounded-full"
            />
          </div>

          <div className="flex flex-col">
            <div className="flex items-baseline gap-1.5 leading-none">
              <span className="text-base font-bold tracking-wider text-orange-500">
                AGNI
              </span>
              <span className="text-base font-light tracking-[0.16em] text-white">
                DRISHTI
              </span>
            </div>
            <span className="text-[10.5px] text-slate-400 tracking-wide font-normal mt-0.5">
              Industrial Thermal Intelligence
            </span>
          </div>
        </div>
      </div>

      {/* CENTER / STATUS: NASA FIRMS • VIIRS (Primary), Critical anomalies (Primary), Observation time (Secondary) */}
      <div className="hidden md:flex items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <Satellite className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="font-bold text-white tracking-wide text-[12.5px]">NASA FIRMS • VIIRS</span>
          <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
          <span className="text-slate-600 ml-1">•</span>
          <span className="text-[10px] text-slate-400 font-mono ml-0.5">
            Latest Observation: <span className="text-slate-400">{lastUpdated}</span>
          </span>
        </div>

        <span className="text-slate-700">|</span>

        {/* PRIMARY: CRITICAL ANOMALIES COUNT */}
        <div className={`flex items-center gap-2 px-2.5 py-1 rounded-md border font-mono ${
          hasEmergencies
            ? 'bg-red-950/60 border-red-700/50 text-red-300 shadow-sm'
            : 'bg-slate-900/60 border-white/[0.06] text-slate-400'
        }`}>
          <span className={`w-2 h-2 rounded-full ${hasEmergencies ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></span>
          <span className="text-[11px] font-bold tracking-wider uppercase">
            CRITICAL ANOMALIES: {emergencyCount}
          </span>
        </div>
      </div>

      {/* RIGHT: Events count (Primary), Critical count (Primary), IST & UTC time (Secondary) */}
      <div className="flex items-center gap-4 text-xs">
        <div className="hidden sm:flex items-center gap-3 font-mono">
          <div className="flex items-baseline gap-1 px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.05]">
            <span className="text-[10px] uppercase font-semibold text-slate-400 font-sans">EVENTS:</span>
            <span className="font-bold text-white text-[12px]">
              {kpis.total_active_hotspots}
            </span>
          </div>

          <div className={`flex items-baseline gap-1 px-2 py-0.5 rounded border ${
            hasEmergencies ? 'bg-red-950/40 border-red-800/40' : 'bg-white/[0.03] border-white/[0.05]'
          }`}>
            <span className="text-[10px] uppercase font-semibold text-slate-400 font-sans">CRITICAL:</span>
            <span className={`font-bold text-[12px] ${hasEmergencies ? 'text-red-400' : 'text-slate-300'}`}>
              {emergencyCount}
            </span>
          </div>
        </div>

        {/* IST & UTC (Muted secondary timestamp) */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/[0.03] border border-white/[0.06] font-mono">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[11px] font-medium text-slate-200">{istTime || 'IST'}</span>
          <span className="text-slate-600">•</span>
          <span className="text-[9.5px] text-slate-400">{utcTime || 'UTC'}</span>
        </div>
      </div>
    </header>
  );
}
