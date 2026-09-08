import React from 'react';
import { X, ShieldAlert, Wind, AlertTriangle, FileText, Flame, Compass, ChevronRight, Activity } from 'lucide-react';

export default function IncidentInspector({
  fire,
  onClose,
  onTogglePlume,
  isPlumeActive,
  onOpenReport,
  plumeLoading
}) {
  if (!fire) return null;

  const isEmergency = fire.is_emergency;

  return (
    <div className={`absolute top-4 right-4 w-[380px] max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl shadow-2xl z-[1000] border backdrop-blur-xl transition-all ${
      isEmergency
        ? 'bg-[#0f1422]/95 border-red-500/70 shadow-red-500/20'
        : 'bg-[#0b101d]/95 border-slate-700/80 shadow-black/50'
    }`}>
      {/* Header */}
      <div className={`p-3.5 border-b flex items-start justify-between ${
        isEmergency ? 'bg-red-950/40 border-red-800/40' : 'bg-slate-900/60 border-slate-800'
      }`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="px-2 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase tracking-wider text-white"
              style={{ backgroundColor: fire.threat_color || '#ef4444' }}
            >
              {fire.threat_level} THREAT
            </span>
            <span className="text-xs font-mono text-slate-400">
              ID: {fire.fire_id}
            </span>
          </div>
          <h3 className="text-sm font-bold text-slate-100 leading-tight">
            {fire.facility_name || fire.site_hint || 'Rural / Forest Anomaly'}
          </h3>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-3.5 text-xs font-sans">
        {/* Category & Classification */}
        <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
            AI Classification Analysis
          </div>
          <div className="font-semibold text-slate-200 text-xs">
            {fire.sub_category || fire.category}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 flex items-center justify-between font-mono">
            <span>Sensor: VIIRS {fire.instrument || '375m'}</span>
            <span>Confidence: <strong className="text-cyan-400">{fire.confidence || 'HIGH'}</strong></span>
          </div>
        </div>

        {/* 2x2 Anomaly Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 text-center font-mono">
          <div className={`p-2.5 rounded-lg border ${
            isEmergency ? 'bg-red-950/30 border-red-800/50' : 'bg-slate-900/80 border-slate-800'
          }`}>
            <div className="text-[10px] text-slate-400">OBSERVED FRP</div>
            <div className={`text-base font-extrabold ${isEmergency ? 'text-red-400' : 'text-amber-300'}`}>
              {fire.frp} MW
            </div>
            <div className="text-[9px] text-slate-400">Fire Radiative Power</div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
            <div className="text-[10px] text-slate-400">FACILITY BASELINE</div>
            <div className="text-base font-extrabold text-slate-200">
              {fire.baseline_frp_mw || 25.0} MW
            </div>
            <div className="text-[9px] text-slate-400">Historical Tolerance</div>
          </div>

          <div className={`p-2.5 rounded-lg border ${
            isEmergency ? 'bg-red-950/30 border-red-800/50' : 'bg-slate-900/80 border-slate-800'
          }`}>
            <div className="text-[10px] text-slate-400">ANOMALY SPIKE</div>
            <div className={`text-base font-extrabold ${isEmergency ? 'text-red-400' : 'text-cyan-400'}`}>
              {fire.anomaly_ratio}x
            </div>
            <div className="text-[9px] text-slate-400">Above Normal Baseline</div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
            <div className="text-[10px] text-slate-400">HAZARD RADIUS</div>
            <div className="text-base font-extrabold text-amber-300">
              {fire.hazard_radius_km || 2.0} km
            </div>
            <div className="text-[9px] text-slate-400">Evacuation Perimeter</div>
          </div>
        </div>

        {/* Chemicals & Hazardous Materials */}
        {fire.critical_chemicals && fire.critical_chemicals.length > 0 && (
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span>Critical Hazardous Chemicals Present</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {fire.critical_chemicals.map((chem, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800/90 text-slate-300 border border-slate-700/60"
                >
                  {chem}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Atmospheric Wind Conditions */}
        <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Wind className="w-4 h-4 text-cyan-400" />
            <span>WIND: {fire.wind_speed_kmh || 18.0} km/h</span>
          </div>
          <div className="flex items-center gap-1 text-slate-300">
            <Compass className="w-3.5 h-3.5 text-slate-400" />
            <span>Bearing: {fire.wind_direction_deg || 225}°</span>
          </div>
        </div>

        {/* AI Actionable SOP Box */}
        <div className={`p-3 rounded-lg border text-xs ${
          isEmergency
            ? 'bg-red-950/40 border-red-700/60 text-red-100'
            : 'bg-slate-900 border-slate-800 text-slate-300'
        }`}>
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 mb-1 flex items-center gap-1">
            <Activity className="w-3 h-3" />
            <span>TACTICAL DISPATCH PROTOCOL</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            {fire.actionable_sop || 'Standard operational surveillance. No escalation required.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            onClick={onTogglePlume}
            className={`w-full py-2 px-3 rounded-lg font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
              isPlumeActive
                ? 'bg-red-600 hover:bg-red-700 text-white border-red-500 shadow-lg shadow-red-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border-slate-700 hover:border-cyan-500'
            }`}
          >
            <Wind className="w-3.5 h-3.5" />
            {plumeLoading ? 'Computing Gaussian Dispersion...' : isPlumeActive ? 'Hide Toxic Smoke Plume' : 'Render Toxic Smoke Plume'}
          </button>

          <button
            onClick={onOpenReport}
            className="w-full py-2 px-3 rounded-lg font-mono text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-center gap-2"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            Export NDRF Incident Memo
          </button>
        </div>
      </div>
    </div>
  );
}
