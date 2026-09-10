import React from 'react';
import { X, Printer, ShieldAlert, MapPin, Wind, AlertTriangle, FileText } from 'lucide-react';

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
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
      <div className="bg-[#0e1217] border border-white/[0.1] rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col font-sans text-slate-100">
        {/* Modal Top Bar */}
        <div className="p-4 border-b border-white/[0.08] bg-[#12161d] flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-slate-300" />
            <div>
              <h2 className="text-sm font-semibold font-mono text-slate-100">
                THERMAL EVENT INCIDENT REPORT
              </h2>
              <p className="text-[10px] font-mono text-slate-400">
                REPORT ID: <span className="text-slate-300">{report.dossier_id}</span> • {report.generated_at}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded bg-[#18202a] hover:bg-[#202b38] text-xs font-mono text-slate-200 border border-white/[0.08] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              Print / PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded text-slate-400 hover:text-slate-100 hover:bg-[#18202a] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Report Content */}
        <div className="p-6 space-y-4 text-xs">
          {/* Classification Header Banner */}
          <div className="p-4 rounded-md bg-[#141a22] border border-white/[0.08] flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono uppercase text-slate-400 font-semibold tracking-wider">
                EVENT ASSESSMENT
              </div>
              <div className="text-base font-bold text-white mt-0.5">
                {summary.category || 'CRITICAL INDUSTRIAL EMERGENCY'}
              </div>
              <div className="text-xs text-slate-300 mt-0.5 font-mono">
                {facility.facility_name || 'Industrial Refining Complex'}
              </div>
            </div>

            <div className="text-right font-mono">
              <div className="text-[10px] text-slate-400">SEVERITY SCORE</div>
              <div className="text-xl font-bold text-orange-400">
                {summary.threat_score || 98} / 100
              </div>
              <div className="text-[10px] text-slate-300 uppercase font-semibold">
                {summary.threat_level || 'CRITICAL'} PRIORITY
              </div>
            </div>
          </div>

          {/* Section 1: Geospatial Coordinates & Telemetry */}
          <div className="border border-white/[0.08] rounded-md p-3.5 bg-[#12161d]">
            <div className="text-[11px] font-mono font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>1. GEOSPATIAL COORDINATES & SATELLITE SENSOR TELEMETRY</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px] font-mono">
              <div className="p-2 rounded bg-[#0b0e13] border border-white/[0.05]">
                <span className="text-slate-500 block text-[10px]">LATITUDE</span>
                <strong className="text-slate-200">{summary.coordinates?.latitude}° N</strong>
              </div>
              <div className="p-2 rounded bg-[#0b0e13] border border-white/[0.05]">
                <span className="text-slate-500 block text-[10px]">LONGITUDE</span>
                <strong className="text-slate-200">{summary.coordinates?.longitude}° E</strong>
              </div>
              <div className="p-2 rounded bg-[#0b0e13] border border-white/[0.05]">
                <span className="text-slate-500 block text-[10px]">OBSERVED FRP</span>
                <strong className="text-orange-300">{facility.observed_frp_mw} MW</strong>
              </div>
              <div className="p-2 rounded bg-[#0b0e13] border border-white/[0.05]">
                <span className="text-slate-500 block text-[10px]">ANOMALY RATIO</span>
                <strong className="text-orange-300">{summary.anomaly_ratio}x Baseline</strong>
              </div>
            </div>
          </div>

          {/* Section 2: Industrial Context & Hazard Specs */}
          <div className="border border-white/[0.08] rounded-md p-3.5 bg-[#12161d]">
            <div className="text-[11px] font-mono font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
              <span>2. FACILITY CONTEXT & POTENTIAL HAZARDS</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between border-b border-white/[0.05] pb-1.5">
                <span className="text-slate-400">Affected Facility:</span>
                <span className="font-medium text-slate-200">{facility.facility_name}</span>
              </div>
              <div className="flex justify-between border-b border-white/[0.05] pb-1.5">
                <span className="text-slate-400">Historical Operational Baseline:</span>
                <span className="font-mono text-slate-300">{facility.baseline_frp_mw} MW</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Potential Hazards & Associated Materials:</span>
                <div className="flex flex-wrap gap-1.5">
                  {(facility.critical_chemicals_present || ['Crude Hydrocarbons', 'Benzene', 'H2S']).map((c, i) => (
                    <span key={i} className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#1a222c] text-slate-300 border border-white/[0.05]">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Atmospheric Dispersion Estimate */}
          <div className="border border-white/[0.08] rounded-md p-3.5 bg-[#12161d]">
            <div className="text-[11px] font-mono font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <Wind className="w-3.5 h-3.5 text-slate-400" />
              <span>3. ESTIMATED DOWNWIND DISPERSION CORRIDOR</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px] font-mono mb-2">
              <div className="p-2 rounded bg-[#0b0e13] border border-white/[0.05]">
                <span className="text-slate-500 block text-[10px]">DOWNWIND BEARING</span>
                <strong className="text-slate-200">{dispersion.downwind_trajectory_bearing || '55.0° NE'}</strong>
              </div>
              <div className="p-2 rounded bg-[#0b0e13] border border-white/[0.05]">
                <span className="text-slate-500 block text-[10px]">SURFACE WIND</span>
                <strong className="text-slate-200">{dispersion.wind_speed || '24.5 km/h'}</strong>
              </div>
              <div className="p-2 rounded bg-[#0b0e13] border border-white/[0.05]">
                <span className="text-slate-500 block text-[10px]">ESTIMATED DISPERSION</span>
                <strong className="text-orange-300">{dispersion.toxic_plume_corridor_length || '18.4 km'}</strong>
              </div>
              <div className="p-2 rounded bg-[#0b0e13] border border-white/[0.05]">
                <span className="text-slate-500 block text-[10px]">ESTIMATED HAZARD RADIUS</span>
                <strong className="text-red-400">{dispersion.evacuation_zone_radius || '5.0 km'}</strong>
              </div>
            </div>
            <p className="text-[11px] text-slate-300 bg-[#0b0e13] border border-white/[0.05] p-2 rounded">
              {dispersion.public_warning_statement || 'Downwind hazard corridor estimated along bearing vector based on live surface wind observation.'}
            </p>
          </div>

          {/* Section 4: Actionable Decision Support */}
          <div className="border border-white/[0.08] rounded-md p-3.5 bg-[#12161d]">
            <div className="text-[11px] font-mono font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
              <span>4. ACTIONABLE DECISION SUPPORT</span>
            </div>
            <div className="space-y-2 text-[11px] text-slate-300">
              <p className="p-2 rounded bg-[#0b0e13] border border-white/[0.05] font-mono text-slate-200">
                {tactics.standard_operating_procedure || 'Verify ground telemetry and notify local industrial emergency command post.'}
              </p>
              <ul className="space-y-1 pl-2 list-disc list-inside text-slate-400">
                <li>Establish Incident Command Post at upwind coordinates relative to current wind bearing.</li>
                <li>Monitor downwind transport corridors and coordinate with facility safety officers.</li>
                <li>Consult local environmental monitoring stations for atmospheric particulate readings.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Modal Bottom Bar */}
        <div className="p-4 border-t border-white/[0.08] bg-[#12161d] flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>CLASSIFICATION: INTERNAL INCIDENT REPORT • INDUSTRIAL SAFETY & DISASTER MITIGATION</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#1c2430] hover:bg-[#25303f] text-slate-200 cursor-pointer transition-colors"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}
