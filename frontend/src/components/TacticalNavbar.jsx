import React, { useState, useEffect } from 'react';
import { Radio, ShieldAlert, Activity, Flame, Clock, Wifi, WifiOff, Home, ArrowLeft } from 'lucide-react';

export default function TacticalNavbar({ summary, isLive, activeEmergencyCount, onBackToLanding }) {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const utc = now.toUTCString().split(' ').slice(4, 5)[0] + ' UTC';
      const ist = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }) + ' IST';
      setTimeStr(`${ist} • ${utc}`);
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
  const peak = summary?.peak_anomaly || { peak_frp_mw: 284.6 };

  const hasEmergencies = (activeEmergencyCount ?? kpis.critical_industrial_emergencies) > 0;

  return (
    <header className="h-16 bg-[#080c14] border-b border-slate-800/80 px-4 flex items-center justify-between z-30 shrink-0 select-none">
      {/* Left: Branding & Navigation */}
      <div className="flex items-center gap-3">
        {/* Prominent Back to Landing Button */}
        {onBackToLanding && (
          <button
            onClick={onBackToLanding}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-400 text-xs font-mono font-bold text-cyan-300 hover:text-white transition-all shadow-md cursor-pointer group shrink-0"
            title="Return to Landing Page"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400 group-hover:-translate-x-0.5 transition-transform" />
            <span>BACK</span>
          </button>
        )}

        <div 
          className={`flex items-center gap-3 ${onBackToLanding ? 'cursor-pointer group' : ''}`}
          onClick={onBackToLanding}
          title={onBackToLanding ? "Return to Landing Page" : undefined}
        >
          <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-950/80 to-slate-900 border border-cyan-500/40 shadow-lg shadow-cyan-500/10 group-hover:border-cyan-400 transition-colors">
            <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold tracking-wider bg-gradient-to-r from-slate-100 via-cyan-200 to-sky-400 bg-clip-text text-transparent font-mono">
                AGNIDRISHTI
              </h1>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-sky-950/90 text-sky-400 border border-sky-700/50">
                SIH-26162
              </span>
            </div>
            <p className="text-[10px] text-slate-400 tracking-wider uppercase font-mono">
              NTRO • Geospatial Industrial Fire Surveillance
            </p>
          </div>
        </div>

        {/* Live / Offline Status Chip */}
        <div className="hidden lg:flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-full text-[11px] font-mono border bg-slate-900/90 border-slate-800">
          {isLive ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-emerald-400 font-semibold">NASA VIIRS LIVE</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span className="text-amber-300">CALIBRATED BACKUP</span>
            </>
          )}
        </div>
      </div>

      {/* Center: Tactical DEFCON Threat Indicator */}
      <div className="hidden md:flex items-center">
        {hasEmergencies ? (
          <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-red-950/80 border border-red-500/60 shadow-lg shadow-red-500/20 animate-pulse">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
            </span>
            <span className="text-xs font-bold tracking-widest text-red-200 font-mono">
              DEFCON 2: ACTIVE INDUSTRIAL EMERGENCY
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="text-xs font-medium tracking-wider text-emerald-300 font-mono">
              DEFCON 5: NOMINAL INDUSTRIAL SURVEILLANCE
            </span>
          </div>
        )}
      </div>

      {/* Right: Telemetry KPI Cards + Live UTC Clock */}
      <div className="flex items-center gap-3">
        {/* KPI Chips */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-mono">
          {/* Total Hotspots */}
          <div className="px-2.5 py-1 rounded bg-slate-900/90 border border-slate-800/80 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">HOTSPOTS:</span>
            <span className="font-bold text-slate-100">{kpis.total_active_hotspots}</span>
          </div>

          {/* Emergencies Count */}
          <div className={`px-2.5 py-1 rounded border flex items-center gap-1.5 ${
            hasEmergencies
              ? 'bg-red-950/70 border-red-700/60 text-red-300'
              : 'bg-slate-900 border-slate-800 text-slate-300'
          }`}>
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
            <span>EMERGENCIES:</span>
            <span className="font-bold">{kpis.critical_industrial_emergencies}</span>
          </div>

          {/* Peak FRP */}
          <div className="px-2.5 py-1 rounded bg-slate-900/90 border border-slate-800/80 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">PEAK:</span>
            <span className="font-bold text-amber-300">{peak.peak_frp_mw} MW</span>
          </div>
        </div>

        {/* Live Clock */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300/90">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>{timeStr || '12:00:00 UTC'}</span>
        </div>

        {/* Back to Landing Page Button */}
        {onBackToLanding && (
          <button
            onClick={onBackToLanding}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/30 hover:border-cyan-400 text-[11px] font-mono text-cyan-300 hover:text-white transition-all shadow-sm"
            title="Return to Landing Page"
          >
            <Home className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">LANDING</span>
          </button>
        )}
      </div>
    </header>
  );
}
