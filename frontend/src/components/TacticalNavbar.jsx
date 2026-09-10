import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock } from 'lucide-react';
import logoImg from '../assets/logo.jpg';

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

  const emergencyCount = activeEmergencyCount ?? kpis.critical_industrial_emergencies;
  const hasEmergencies = emergencyCount > 0;
  const lastUpdated = summary?.last_updated || 'Near Real-Time';

  return (
    <header className="h-14 bg-[#090d14] border-b border-white/[0.06] px-5 flex items-center justify-between z-30 shrink-0 select-none font-sans">
      {/* Left: Brand & Navigation */}
      <div className="flex items-center gap-4">
        {onBackToLanding && (
          <button
            onClick={onBackToLanding}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
            title="Return to Overview"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] font-medium tracking-wide">OVERVIEW</span>
          </button>
        )}

        <div 
          className={`flex items-center gap-3 ${onBackToLanding ? 'cursor-pointer' : ''}`}
          onClick={onBackToLanding}
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
            <span className="text-[10px] text-slate-400 tracking-wide font-normal mt-0.5">
              Industrial Thermal Intelligence
            </span>
          </div>
        </div>
      </div>

      {/* Center: Compact Restrained Telemetry Status */}
      <div className="hidden md:flex items-center gap-4 text-xs">
        <div className="flex items-center gap-2 text-slate-400 font-normal">
          <span className="text-slate-300 font-medium">NASA FIRMS • VIIRS</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400">Latest Observation:</span>
          <span className="font-mono text-slate-300 text-[11px]">{lastUpdated}</span>
        </div>

        <span className="text-slate-700">|</span>

        <div className="flex items-center gap-2">
          {hasEmergencies ? (
            <div className="flex items-center gap-1.5 text-red-300">
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
              <span className="text-xs font-medium">
                {emergencyCount} {emergencyCount === 1 ? 'Critical Anomaly' : 'Critical Anomalies'}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
              <span className="text-xs font-medium">System Operational</span>
            </div>
          )}
        </div>
      </div>

      {/* Right: Clean KPIs & Live Clock */}
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-3 text-xs">
          <div className="flex items-baseline gap-1.5 text-slate-400">
            <span>Events:</span>
            <span className="font-mono font-semibold text-slate-200">
              {kpis.total_active_hotspots}
            </span>
          </div>

          <div className="flex items-baseline gap-1.5 text-slate-400">
            <span>Critical:</span>
            <span className={`font-mono font-semibold ${hasEmergencies ? 'text-red-400' : 'text-slate-200'}`}>
              {emergencyCount}
            </span>
          </div>
        </div>

        {/* Live Clock */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#121721] border border-white/[0.06] text-[11px] font-mono text-slate-300">
          <Clock className="w-3 h-3 text-slate-500" />
          <span>{timeStr || 'IST • UTC'}</span>
        </div>
      </div>
    </header>
  );
}
