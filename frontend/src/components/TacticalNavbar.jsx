import React, { useState, useEffect } from 'react';
import { ShieldAlert, Activity, Flame, Clock, ArrowLeft, Radio } from 'lucide-react';

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
    <header className="h-16 bg-[#0c1016] border-b border-white/[0.08] px-4 flex items-center justify-between z-30 shrink-0 select-none">
      {/* Left: Branding & Navigation */}
      <div className="flex items-center gap-3">
        {/* Return Button */}
        {onBackToLanding && (
          <button
            onClick={onBackToLanding}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#151b22] hover:bg-[#1c2430] border border-white/[0.08] hover:border-slate-500 text-xs font-mono font-medium text-slate-300 hover:text-white transition-all cursor-pointer group shrink-0"
            title="Return to Overview"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-400 group-hover:-translate-x-0.5 transition-transform" />
            <span>BACK</span>
          </button>
        )}

        <div 
          className={`flex items-center gap-3 ${onBackToLanding ? 'cursor-pointer group' : ''}`}
          onClick={onBackToLanding}
          title={onBackToLanding ? "Return to Overview" : undefined}
        >
          <div className="flex items-center justify-center w-9 h-9 rounded-md bg-[#151b22] border border-white/[0.1] group-hover:border-slate-500 transition-colors">
            <Flame className="w-4 h-4 text-orange-400" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white font-sans">
                AGNIDRISHTI
              </h1>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#151b22] text-slate-400 border border-white/[0.08]">
                EARTH OBSERVATION
              </span>
            </div>
            <p className="text-[10px] text-slate-400 tracking-wide font-sans">
              Geospatial Industrial Thermal Intelligence
            </p>
          </div>
        </div>

        {/* Satellite Telemetry Status Chip */}
        <div className="hidden lg:flex items-center gap-1.5 ml-2 px-2.5 py-1 rounded-md text-[11px] font-mono border bg-[#151b22] border-white/[0.08]">
          {isLive ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-emerald-400 font-medium">NASA VIIRS LIVE</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span className="text-amber-300 font-medium">CALIBRATED BACKUP</span>
            </>
          )}
        </div>
      </div>

      {/* Center: Operational Monitoring Posture */}
      <div className="hidden md:flex items-center">
        {hasEmergencies ? (
          <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-red-950/40 border border-red-800/50">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span className="text-xs font-semibold tracking-wider text-red-300 font-mono">
              CRITICAL EVENTS DETECTED
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-[#151b22] border border-white/[0.08]">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-xs font-medium tracking-wider text-slate-300 font-mono">
              SYSTEM NOMINAL • SURVEILLANCE ACTIVE
            </span>
          </div>
        )}
      </div>

      {/* Right: Operational Telemetry Metrics + Live UTC Clock */}
      <div className="flex items-center gap-2.5">
        {/* KPI Chips */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-mono">
          {/* Total Hotspots */}
          <div className="px-2.5 py-1 rounded-md bg-[#151b22] border border-white/[0.08] flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">HOTSPOTS:</span>
            <span className="font-bold text-slate-200">{kpis.total_active_hotspots}</span>
          </div>

          {/* Emergencies Count */}
          <div className={`px-2.5 py-1 rounded-md border flex items-center gap-1.5 ${
            hasEmergencies
              ? 'bg-red-950/40 border-red-800/60 text-red-300'
              : 'bg-[#151b22] border-white/[0.08] text-slate-300'
          }`}>
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
            <span className="text-slate-400">CRITICAL:</span>
            <span className="font-bold">{kpis.critical_industrial_emergencies}</span>
          </div>

          {/* Peak FRP */}
          <div className="px-2.5 py-1 rounded-md bg-[#151b22] border border-white/[0.08] flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-slate-400">PEAK:</span>
            <span className="font-bold text-orange-300">{peak.peak_frp_mw} MW</span>
          </div>
        </div>

        {/* Live Clock */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#10151b] border border-white/[0.08] text-[11px] font-mono text-slate-300">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{timeStr || '12:00:00 UTC'}</span>
        </div>
      </div>
    </header>
  );
}
