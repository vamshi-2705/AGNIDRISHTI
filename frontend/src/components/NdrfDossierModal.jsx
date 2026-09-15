import React from 'react';
import { 
  X, Printer, ShieldAlert, MapPin, Wind, AlertTriangle, FileText, 
  Radio, Clock, Building2, Users, School, PlusSquare, CheckCircle2, ChevronRight 
} from 'lucide-react';

export default function NdrfDossierModal({ report, onClose }) {
  if (!report) return null;

  const summary = report.incident_summary || {};
  const satMeta = summary.satellite_metadata || {};
  const coords = summary.coordinates || {};
  const facility = report.industrial_facility_impact || {};
  const dispersion = report.atmospheric_dispersion_assessment || {};
  const exposure = report.community_exposure_assessment || {};
  const tactics = report.tactical_response_plan || {};
  const evidence = report.evidence_chain || [];
  const history = report.observation_history || [];

  const handlePrint = () => {
    window.print();
  };

  const isEmergency = summary.threat_level === 'CRITICAL' || summary.category === 'CRITICAL_INDUSTRIAL_EMERGENCY';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[2000] flex items-center justify-center p-4">
      <div className="bg-[#0c1017] border border-white/[0.12] rounded-xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col font-sans text-slate-100">
        {/* Modal Top Bar */}
        <div className="p-4 border-b border-white/[0.08] bg-[#10151f] flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-orange-400" />
            <div>
              <h2 className="text-sm font-semibold font-mono text-slate-100 tracking-wide">
                {report.official_title || 'AGNIDRISHTI INCIDENT REPORT & SENSITIVE RECEPTOR AUDIT'}
              </h2>
              <p className="text-[10px] font-mono text-slate-400">
                DOSSIER ID: <span className="text-slate-200 font-semibold">{report.dossier_id || report.report_id}</span> • GENERATED: {report.generated_at}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded bg-[#182230] hover:bg-[#223044] text-xs font-mono text-slate-200 border border-white/[0.1] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span>Print / PDF Export</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded text-slate-400 hover:text-slate-100 hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Report Body */}
        <div className="p-6 space-y-5 text-xs">
          {/* Executive Summary Banner */}
          <div className={`p-4 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
            isEmergency 
              ? 'bg-red-950/40 border-red-500/40' 
              : 'bg-slate-900/60 border-white/[0.08]'
          }`}>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold tracking-wider">
                  OFFICIAL INCIDENT CLASSIFICATION
                </span>
                {report.authority_review_required && (
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-red-900/80 text-red-200 border border-red-600 font-bold uppercase">
                    AUTHORITY ACTION MANDATED
                  </span>
                )}
              </div>
              <div className="text-lg font-bold text-white tracking-wide">
                {summary.category || 'CRITICAL INDUSTRIAL EMERGENCY'}
              </div>
              <div className="text-xs text-slate-300 mt-0.5 font-mono flex items-center gap-2">
                <span className="text-orange-300 font-semibold">{facility.facility_name || 'Industrial Infrastructure'}</span>
                <span>•</span>
                <span>{summary.sub_category || 'Industrial High-FRP Exceedance'}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0 font-mono">
              <div className="text-center bg-black/30 p-2.5 rounded border border-white/[0.06] min-w-[90px]">
                <div className="text-[9.5px] text-slate-400 font-sans">THREAT SCORE</div>
                <div className={`text-xl font-bold mt-0.5 ${isEmergency ? 'text-red-400' : 'text-orange-400'}`}>
                  {summary.threat_score || 85} / 100
                </div>
                <div className="text-[9px] text-slate-300 font-semibold uppercase">
                  {summary.threat_level || 'EVALUATED'}
                </div>
              </div>

              <div className="text-center bg-black/30 p-2.5 rounded border border-white/[0.06] min-w-[90px]">
                <div className="text-[9.5px] text-slate-400 font-sans">ANOMALY RATIO</div>
                <div className="text-xl font-bold text-sky-400 mt-0.5">
                  {summary.anomaly_ratio}×
                </div>
                <div className="text-[9px] text-slate-300 font-semibold uppercase">
                  {summary.trend || 'EXCEEDANCE'}
                </div>
              </div>
            </div>
          </div>

          {/* Section 1: Geospatial Coordinates & Multi-Satellite Telemetry */}
          <div className="border border-white/[0.08] rounded-lg p-4 bg-[#111621] space-y-3">
            <div className="text-[11px] font-mono font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-sky-400" />
                <span>1. GEOSPATIAL COORDINATES & MULTI-SATELLITE PROVENANCE</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                Sensor: {satMeta.instrument || 'VIIRS (375m nadir)'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px] font-mono">
              <div className="p-2.5 rounded bg-black/25 border border-white/[0.05]">
                <span className="text-slate-400 block text-[9.5px] font-sans">COORDINATES</span>
                <strong className="text-slate-200">{coords.formatted_coords || `${coords.latitude}°N, ${coords.longitude}°E`}</strong>
              </div>
              <div className="p-2.5 rounded bg-black/25 border border-white/[0.05]">
                <span className="text-slate-400 block text-[9.5px] font-sans">SATELLITES MERGED</span>
                <strong className="text-sky-300">{satMeta.satellite_display || satMeta.satellite || 'SNPP / NOAA-20 / NOAA-21'}</strong>
              </div>
              <div className="p-2.5 rounded bg-black/25 border border-white/[0.05]">
                <span className="text-slate-400 block text-[9.5px] font-sans">DETECTION WINDOW</span>
                <strong className="text-slate-200">{satMeta.acquisition_time || '12:00'} UTC</strong>
              </div>
              <div className="p-2.5 rounded bg-black/25 border border-white/[0.05]">
                <span className="text-slate-400 block text-[9.5px] font-sans">MULTI-PASS COUNT</span>
                <strong className="text-emerald-300">{satMeta.observation_count || history.length || 1} pass(es)</strong>
              </div>
            </div>

            {/* Historical Passes Table */}
            {history.length > 0 && (
              <div className="pt-2 border-t border-white/[0.05]">
                <span className="text-[10px] text-slate-400 font-mono block mb-1.5 uppercase tracking-wider">
                  Event Passes Chronology:
                </span>
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-[10.5px]">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-slate-400 text-[9.5px]">
                        <th className="pb-1">TIME (UTC)</th>
                        <th className="pb-1">DATE</th>
                        <th className="pb-1">SATELLITE</th>
                        <th className="pb-1">FRP (MW)</th>
                        <th className="pb-1">TEMP (K)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04] text-slate-300">
                      {history.map((h, i) => (
                        <tr key={i} className="hover:bg-white/[0.02]">
                          <td className="py-1 font-semibold text-slate-200">{h.acq_time}</td>
                          <td className="py-1">{h.acq_date}</td>
                          <td className="py-1 text-sky-400">{h.satellite ? h.satellite.replace('VIIRS_', '') : 'VIIRS'}</td>
                          <td className="py-1 font-bold text-orange-400">{h.frp} MW</td>
                          <td className="py-1">{h.brightness_ti4 ? `${h.brightness_ti4} K` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Industrial Facility Impact & Chemicals */}
          <div className="border border-white/[0.08] rounded-lg p-4 bg-[#111621] space-y-2.5">
            <div className="text-[11px] font-mono font-semibold text-slate-300 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-orange-400" />
              <span>2. INDUSTRIAL FACILITY IMPACT & MATERIALS</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between border-b border-white/[0.05] pb-1.5">
                <span className="text-slate-400">Target Industrial Asset:</span>
                <span className="font-semibold text-white">{facility.facility_name}</span>
              </div>
              <div className="flex justify-between border-b border-white/[0.05] pb-1.5">
                <span className="text-slate-400">Observed FRP vs Expected Baseline:</span>
                <span className="font-mono text-slate-200">
                  <strong className="text-orange-300">{facility.observed_frp_mw} MW</strong> observed (Baseline: {facility.baseline_frp_mw} MW)
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1 text-[11px]">Associated Petrochemical & Chemical Compounds:</span>
                <div className="flex flex-wrap gap-1.5">
                  {(facility.critical_chemicals_present || ['Crude Hydrocarbons', 'Benzene', 'H2S']).map((c, i) => (
                    <span key={i} className="px-2 py-0.5 rounded text-[10px] font-mono bg-black/30 text-slate-300 border border-white/[0.06]">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Atmospheric Dispersion Assessment */}
          <div className="border border-white/[0.08] rounded-lg p-4 bg-[#111621] space-y-3">
            <div className="text-[11px] font-mono font-semibold text-slate-300 flex items-center gap-1.5">
              <Wind className="w-3.5 h-3.5 text-sky-400" />
              <span>3. ESTIMATED DOWNWIND DISPERSION CORRIDOR (GAUSSIAN PLUME)</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px] font-mono">
              <div className="p-2.5 rounded bg-black/25 border border-white/[0.05]">
                <span className="text-slate-400 block text-[9.5px] font-sans">DOWNWIND BEARING</span>
                <strong className="text-slate-200">{dispersion.downwind_trajectory_bearing || '55.0° NE'}</strong>
              </div>
              <div className="p-2.5 rounded bg-black/25 border border-white/[0.05]">
                <span className="text-slate-400 block text-[9.5px] font-sans">SURFACE WIND</span>
                <strong className="text-slate-200">{dispersion.wind_speed || '24.5 km/h'}</strong>
              </div>
              <div className="p-2.5 rounded bg-black/25 border border-white/[0.05]">
                <span className="text-slate-400 block text-[9.5px] font-sans">ESTIMATED DISPERSION</span>
                <strong className="text-orange-300">{dispersion.toxic_plume_corridor_length || '18.4 km'}</strong>
              </div>
              <div className="p-2.5 rounded bg-black/25 border border-white/[0.05]">
                <span className="text-slate-400 block text-[9.5px] font-sans">HAZARD RADIUS</span>
                <strong className="text-red-400">{dispersion.evacuation_zone_radius || '5.0 km'}</strong>
              </div>
            </div>

            {dispersion.public_warning_statement && (
              <p className="text-[11px] text-slate-300 bg-black/30 border border-white/[0.06] p-2.5 rounded leading-relaxed">
                {dispersion.public_warning_statement}
              </p>
            )}
          </div>

          {/* Section 4: Downwind Community Exposure Audit */}
          <div className="border border-white/[0.08] rounded-lg p-4 bg-[#111621] space-y-3">
            <div className="text-[11px] font-mono font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-rose-400" />
                <span>4. DOWNWIND SENSITIVE RECEPTOR AUDIT</span>
              </span>
              <span className={`text-[9.5px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                exposure.risk_level === 'CRITICAL' ? 'bg-red-950 text-red-300 border border-red-700' :
                exposure.risk_level === 'HIGH' ? 'bg-orange-950 text-orange-300 border border-orange-700' :
                exposure.risk_level === 'MEDIUM' ? 'bg-amber-950 text-amber-300 border border-amber-700' :
                'bg-emerald-950 text-emerald-300 border border-emerald-800'
              }`}>
                COMMUNITY RISK: {exposure.risk_level || 'MEDIUM'}
              </span>
            </div>

            {/* Counts */}
            <div className="grid grid-cols-3 gap-2 text-center font-mono text-[11px]">
              <div className="p-2 rounded bg-black/30 border border-white/[0.05]">
                <span className="text-slate-400 block text-[9.5px] font-sans">AFFECTED SETTLEMENTS</span>
                <strong className="text-slate-200 text-sm">{exposure.affected_settlements_count || 0}</strong>
              </div>
              <div className="p-2 rounded bg-black/30 border border-white/[0.05]">
                <span className="text-slate-400 block text-[9.5px] font-sans">SCHOOLS IN CORRIDOR</span>
                <strong className="text-amber-300 text-sm">{exposure.affected_schools_count || 0}</strong>
              </div>
              <div className="p-2 rounded bg-black/30 border border-white/[0.05]">
                <span className="text-slate-400 block text-[9.5px] font-sans">HOSPITALS IN CORRIDOR</span>
                <strong className="text-rose-400 text-sm">{exposure.affected_hospitals_count || 0}</strong>
              </div>
            </div>

            {/* Intersecting locations list */}
            {((exposure.intersecting_settlements && exposure.intersecting_settlements.length > 0) ||
              (exposure.intersecting_schools && exposure.intersecting_schools.length > 0) ||
              (exposure.intersecting_hospitals && exposure.intersecting_hospitals.length > 0)) && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                  Identified Sensitive Facilities in Plume Footprint:
                </span>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1 font-mono text-[10.5px]">
                  {exposure.intersecting_hospitals?.map((h, i) => (
                    <div key={`hosp-${i}`} className="flex items-center justify-between bg-rose-950/40 px-2.5 py-1.5 rounded border border-rose-800/40">
                      <span className="text-rose-200 flex items-center gap-1.5 font-medium">
                        <PlusSquare className="w-3.5 h-3.5 text-rose-400" />
                        {h.name} ({h.capacity || 'Medical Facility'})
                      </span>
                      <span className="text-rose-300">{h.distance_km} km downwind</span>
                    </div>
                  ))}
                  {exposure.intersecting_schools?.map((s, i) => (
                    <div key={`sch-${i}`} className="flex items-center justify-between bg-amber-950/30 px-2.5 py-1.5 rounded border border-amber-800/30">
                      <span className="text-amber-200 flex items-center gap-1.5 font-medium">
                        <School className="w-3.5 h-3.5 text-amber-400" />
                        {s.name} ({s.capacity || 'Educational Facility'})
                      </span>
                      <span className="text-amber-300">{s.distance_km} km downwind</span>
                    </div>
                  ))}
                  {exposure.intersecting_settlements?.map((v, i) => (
                    <div key={`vill-${i}`} className="flex items-center justify-between bg-black/25 px-2.5 py-1.5 rounded border border-white/[0.04]">
                      <span className="text-slate-200 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {v.name} (Pop ~{v.population ? v.population.toLocaleString() : '1,500'})
                      </span>
                      <span className="text-orange-300">{v.distance_km} km downwind</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contributing Exposure Factors */}
            {exposure.exposure_reasons && exposure.exposure_reasons.length > 0 && (
              <div className="pt-2 border-t border-white/[0.05]">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                  Exposure Assessment Factors:
                </span>
                <ul className="space-y-1 text-[11px] text-slate-300 pl-2">
                  {exposure.exposure_reasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <ChevronRight className="w-3 h-3 text-orange-400 shrink-0 mt-0.5" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Section 5: Deterministic Evidence Chain & Decision Support */}
          <div className="border border-white/[0.08] rounded-lg p-4 bg-[#111621] space-y-3">
            <div className="text-[11px] font-mono font-semibold text-slate-300 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
              <span>5. ACTIONABLE DECISION SUPPORT & TACTICAL PROTOCOLS</span>
            </div>

            <div className="space-y-2 text-[11px] text-slate-300">
              <div className="p-2.5 rounded bg-black/30 border border-white/[0.06] font-mono text-slate-200 leading-relaxed">
                {tactics.standard_operating_procedure || 'Verify ground telemetry and notify local industrial emergency command post.'}
              </div>

              {tactics.immediate_actions && tactics.immediate_actions.length > 0 && (
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                    Immediate Operational Directives:
                  </span>
                  {tactics.immediate_actions.map((act, i) => (
                    <div key={i} className="flex items-start gap-2 p-1.5 rounded bg-black/20 text-slate-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{act}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Bottom Bar */}
        <div className="p-4 border-t border-white/[0.08] bg-[#10151f] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
          <span>CLASSIFICATION: OFFICIAL INTERNAL AUDIT • NTRO / NDRF / DDMA DISASTER MITIGATION</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded bg-[#182230] hover:bg-[#223044] text-slate-200 cursor-pointer transition-colors"
            >
              Print Document
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded bg-[#202b3a] hover:bg-[#2c3b4e] text-slate-100 font-semibold cursor-pointer transition-colors"
            >
              Close Dossier
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
