import React from 'react';
import { X, Printer, ShieldAlert, Download, FileCheck, MapPin, Wind, AlertTriangle } from 'lucide-react';

export default function NdrfDossierModal({ report, onClose }) {
  if (!report) return null;

  const summary = report.incident_summary || {};
  const facility = report.industrial_facility_impact || {};
  const dispersion = report.atmospheric_dispersion_assessment || {};
  const tactics = report.tactical_response_plan || {};

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
      <div className="bg-[#0b0f19] border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col font-sans text-slate-100">
        {/* Modal Top Bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            <div>
              <h2 className="text-sm font-bold font-mono text-slate-100">
                NDRF TACTICAL INCIDENT DOSSIER
              </h2>
              <p className="text-[10px] font-mono text-slate-400">
                DOSSIER ID: <span className="text-cyan-400">{report.dossier_id}</span> • {report.generated_at}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-cyan-300 border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Dossier Content */}
        <div className="p-6 space-y-5 text-xs">
          {/* Classification Header Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-red-950/80 to-slate-900 border border-red-500/50 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono uppercase text-red-400 font-bold tracking-wider">
                TACTICAL EMERGENCY ALERT CLASSIFICATION
              </div>
              <div className="text-lg font-extrabold text-white mt-0.5">
                {summary.category || 'CRITICAL INDUSTRIAL EMERGENCY'}
              </div>
              <div className="text-xs text-slate-300 mt-0.5 font-mono">
                {facility.facility_name || 'Reliance Jamnagar Refining Complex'}
              </div>
            </div>

            <div className="text-right font-mono">
              <div className="text-[10px] text-slate-400">THREAT SCORE</div>
              <div className="text-2xl font-black text-red-400">
                {summary.threat_score || 98} / 100
              </div>
              <div className="text-[10px] text-red-300 uppercase font-bold">
                {summary.threat_level || 'CRITICAL'} PRIORITY
              </div>
            </div>
          </div>

          {/* Section 1: Geospatial Coordinates & Satellite Verification */}
          <div className="border border-slate-800 rounded-xl p-4 bg-slate-900/40">
            <div className="text-[11px] font-mono font-bold text-cyan-400 mb-2.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              <span>1. GEOSPATIAL COORDINATES & SATELLITE SENSOR TELEMETRY</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] font-mono">
              <div className="p-2 rounded bg-slate-950/70 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">LATITUDE</span>
                <strong className="text-slate-200">{summary.coordinates?.latitude}° N</strong>
              </div>
              <div className="p-2 rounded bg-slate-950/70 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">LONGITUDE</span>
                <strong className="text-slate-200">{summary.coordinates?.longitude}° E</strong>
              </div>
              <div className="p-2 rounded bg-slate-950/70 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">OBSERVED FRP</span>
                <strong className="text-red-400">{facility.observed_frp_mw} MW</strong>
              </div>
              <div className="p-2 rounded bg-slate-950/70 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">ANOMALY RATIO</span>
                <strong className="text-red-400">{summary.anomaly_ratio}x Normal</strong>
              </div>
            </div>
          </div>

          {/* Section 2: Industrial Impact & Chemical Inventory */}
          <div className="border border-slate-800 rounded-xl p-4 bg-slate-900/40">
            <div className="text-[11px] font-mono font-bold text-amber-400 mb-2.5 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>2. CRITICAL CHEMICAL INVENTORY & FACILITY SPECS</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                <span className="text-slate-400">Target Facility:</span>
                <span className="font-semibold text-slate-200">{facility.facility_name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                <span className="text-slate-400">Historical Operational Baseline:</span>
                <span className="font-mono text-slate-300">{facility.baseline_frp_mw} MW</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Combustion Hazards & Toxic Chemicals:</span>
                <div className="flex flex-wrap gap-1.5">
                  {(facility.critical_chemicals_present || ['Crude Hydrocarbons', 'Benzene', 'H2S']).map((c, i) => (
                    <span key={i} className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-950 text-red-300 border border-red-800/50">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Atmospheric Dispersion & Evacuation Corridor */}
          <div className="border border-slate-800 rounded-xl p-4 bg-slate-900/40">
            <div className="text-[11px] font-mono font-bold text-cyan-400 mb-2.5 flex items-center gap-1.5">
              <Wind className="w-3.5 h-3.5" />
              <span>3. ATMOSPHERIC GAUSSIAN PLUME DISPERSION & EVACUATION CORRIDOR</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px] font-mono mb-2.5">
              <div className="p-2 rounded bg-slate-950/70 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">DOWNWIND BEARING</span>
                <strong className="text-cyan-300">{dispersion.downwind_trajectory_bearing || '55.0° NE'}</strong>
              </div>
              <div className="p-2 rounded bg-slate-950/70 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">SURFACE WIND</span>
                <strong className="text-slate-200">{dispersion.wind_speed || '24.5 km/h'}</strong>
              </div>
              <div className="p-2 rounded bg-slate-950/70 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">TOXIC PLUME LENGTH</span>
                <strong className="text-red-400">{dispersion.toxic_plume_corridor_length || '18.4 km'}</strong>
              </div>
            </div>
            <p className="text-[11px] text-amber-200/90 italic bg-amber-950/20 border border-amber-800/30 p-2.5 rounded-lg">
              {dispersion.public_warning_statement || 'Mandatory downwind evacuation recommended along 55.0° northeast bearing vector.'}
            </p>
          </div>

          {/* Section 4: Tactical Response Plan */}
          <div className="border border-slate-800 rounded-xl p-4 bg-slate-900/40">
            <div className="text-[11px] font-mono font-bold text-emerald-400 mb-2.5 flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5" />
              <span>4. NDRF & DDMA TACTICAL ACTION PLAN</span>
            </div>
            <div className="space-y-2 text-[11px] text-slate-300">
              <p className="p-2 rounded bg-slate-950 border border-slate-800 font-mono text-slate-200">
                {tactics.standard_operating_procedure || 'Dispatch foam deluge tenders and sound Level-1 evacuation sirens.'}
              </p>
              <ul className="space-y-1.5 pl-2 list-disc list-inside text-slate-400">
                <li>Establish Incident Command Post at upwind coordinates (&gt; 3 km southwest of origin).</li>
                <li>Mobilize foam fire trucks and seal off downwind transport corridors.</li>
                <li>Coordinate with State Pollution Control Board for continuous ambient hydrocarbon gas sampling.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Modal Bottom Bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>CLASSIFICATION: OFFICIAL USE ONLY • DISASTER MANAGEMENT</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
}
