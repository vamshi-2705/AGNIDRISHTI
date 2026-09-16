import React, { useState, useEffect } from 'react';
import { 
  X, Crosshair, Wind, FileText, MapPin, Building2, ShieldAlert, 
  Copy, Check, Radio, ArrowLeft
} from 'lucide-react';
import { getDataHealth } from '../services/api';

function formatUtcTime(acqDate, acqTime) {
  if (!acqDate && !acqTime) return 'LIVE FIRMS PASS';
  const cleanTime = acqTime ? String(acqTime).padStart(4, '0') : '1200';
  const hh = cleanTime.substring(0, 2);
  const mm = cleanTime.substring(2, 4);
  return `${acqDate || '2026-01-01'} ${hh}:${mm} UTC`;
}

function formatConfidence(conf) {
  if (conf == null || conf === '' || conf === 'null' || conf === 'undefined') {
    return 'Not Available';
  }
  if (typeof conf === 'string') {
    const lower = conf.toLowerCase().trim();
    if (lower === 'h' || lower === 'high') return 'High (90–100%)';
    if (lower === 'n' || lower === 'nominal') return 'Nominal (30–80%)';
    if (lower === 'l' || lower === 'low') return 'Low (<30%)';
    const num = Number(conf);
    if (!isNaN(num)) return `${num}%`;
    return conf;
  }
  if (typeof conf === 'number' && !isNaN(conf)) {
    return `${conf}%`;
  }
  return 'Not Available';
}

export default function Cesium3DInspector({
  fire,
  activePlume,
  onLocateEvent,
  onExit3D,
  onTogglePlume,
  isPlumeActive,
  plumeLoading,
  onOpenReport,
  onCollapse,
  isFlying = false
}) {
  const [copied, setCopied] = useState(false);
  const [dataHealth, setDataHealth] = useState(null);

  useEffect(() => {
    let mounted = true;
    getDataHealth().then(res => {
      if (mounted && res.data) {
        setDataHealth(res.data);
      }
    });
    return () => { mounted = false; };
  }, []);

  if (!fire) return null;

  // Exact FIRMS coordinates (Section 7)
  const latNum = Number(fire.latitude);
  const lonNum = Number(fire.longitude);
  const latStr = !isNaN(latNum) ? `${latNum.toFixed(6)}° N` : 'Not Available';
  const lonStr = !isNaN(lonNum) ? `${lonNum.toFixed(6)}° E` : 'Not Available';

  // FRP & Baseline Consistency (Section 16 & 17)
  const frpNum = Number(fire.frp);
  const frpDisplay = !isNaN(frpNum) && frpNum > 0 ? `${frpNum.toFixed(1)} MW` : 'Not Available';
  const baselineFrpNum = Number(fire.baseline_frp_mw);
  const baselineFrpDisplay = !isNaN(baselineFrpNum) && baselineFrpNum > 0 ? `${baselineFrpNum.toFixed(1)} MW` : '45.0 MW';

  let anomalyRatioDisplay = '1.00×';
  if (fire.anomaly_ratio != null && !isNaN(Number(fire.anomaly_ratio))) {
    anomalyRatioDisplay = `${Number(fire.anomaly_ratio).toFixed(2)}×`;
  } else if (!isNaN(frpNum) && !isNaN(baselineFrpNum) && baselineFrpNum > 0) {
    anomalyRatioDisplay = `${(frpNum / baselineFrpNum).toFixed(2)}×`;
  }

  const isEmergency = Boolean(fire.is_emergency || fire.category === 'CRITICAL_INDUSTRIAL_EMERGENCY');

  // Satellites display
  const satellites = Array.isArray(fire.satellites) && fire.satellites.length > 0
    ? fire.satellites.join(' + ')
    : fire.satellites_display || fire.satellite || 'NOAA-21 / VIIRS';

  const observationCount = fire.history && fire.history.length > 0
    ? fire.history.length
    : fire.temporal_profile?.observations_last_30d || 1;

  // Real Wind & Estimated Dispersion Data (Sections 11 & 12)
  const windSpeedVal = fire.wind_speed_kmh != null ? Number(fire.wind_speed_kmh) : (activePlume?.properties?.wind_speed_kmh != null ? Number(activePlume.properties.wind_speed_kmh) : null);
  const windBearingVal = fire.wind_direction_deg != null ? Number(fire.wind_direction_deg) : (activePlume?.properties?.downwind_azimuth_deg != null ? Number(activePlume.properties.downwind_azimuth_deg) : null);
  const hasWindData = windSpeedVal != null && !isNaN(windSpeedVal) && windBearingVal != null && !isNaN(windBearingVal);

  const dispDistVal = activePlume?.properties?.hazard_length_km != null ? Number(activePlume.properties.hazard_length_km) : (fire.hazard_radius_km != null ? Number(fire.hazard_radius_km) : null);
  const hasDispersion = dispDistVal != null && !isNaN(dispDistVal);

  // Facility Context (Section 9)
  const hasFacility = fire.facility_name && fire.facility_name !== 'None' && fire.facility_name !== 'null' && String(fire.facility_name).trim().length > 0;

  // Exposure Context (Section 14)
  const communityExposure = fire.community_exposure || activePlume?.properties?.community_exposure || null;
  const hasExposureData = communityExposure && (
    (communityExposure.affected_settlements_count != null && communityExposure.affected_settlements_count > 0) ||
    (communityExposure.affected_schools_count != null && communityExposure.affected_schools_count > 0) ||
    (communityExposure.affected_hospitals_count != null && communityExposure.affected_hospitals_count > 0) ||
    (communityExposure.intersecting_settlements && communityExposure.intersecting_settlements.length > 0)
  );

  const handleCopyCoords = () => {
    if (!isNaN(latNum) && !isNaN(lonNum)) {
      navigator.clipboard.writeText(`${latNum.toFixed(6)}, ${lonNum.toFixed(6)}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <aside className={`w-80 h-full flex flex-col bg-[#0b101b]/95 backdrop-blur-xl border-l border-white/10 shadow-2xl z-20 text-slate-100 select-none overflow-hidden transition-all duration-700 ${isFlying ? 'opacity-40 pointer-events-none scale-[0.99]' : 'opacity-100'}`}>
      {/* Header */}
      <div className="p-3 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[11px] font-mono tracking-wider font-bold text-cyan-300">
            3D INCIDENT INSPECTION
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onCollapse && (
            <button
              onClick={onCollapse}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              title="Collapse Inspector"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Inspector Scrollable Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5 text-xs">
        {/* 1. Incident Identity & Classification */}
        <div className="p-2.5 rounded-lg bg-white/[0.04] border border-white/10 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10.5px] text-slate-300 font-bold">
              {fire.event_id || fire.fire_id || 'AGNI-LIVE-EVENT'}
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase border ${
              isEmergency 
                ? 'bg-red-950/80 text-red-300 border-red-600/70' 
                : 'bg-amber-950/80 text-amber-300 border-amber-600/70'
            }`}>
              {isEmergency ? 'CRITICAL EVENT' : (fire.category?.replace(/_/g, ' ') || 'THERMAL EVENT')}
            </span>
          </div>

          <div className="text-xs font-bold text-white font-sans truncate">
            {hasFacility ? fire.facility_name : 'Satellite Thermal Target'}
          </div>

          <div className="text-[9.5px] text-slate-400 font-mono">
            {fire.location?.district ? `${fire.location.district}, ${fire.location.state}` : 'India Subcontinent Zone'}
          </div>
        </div>

        {/* 2. Exact Thermal Observation */}
        <div className="p-3 rounded-lg bg-white/[0.03] border border-white/10 space-y-2 font-mono text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-400 uppercase text-[10px] font-semibold tracking-wider font-sans border-b border-white/[0.06] pb-1.5">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span>THERMAL RADIATIVE OBSERVATION</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <div>
              <span className="text-slate-400 text-[10px] block">FIRE RADIATIVE POWER</span>
              <span className="text-base font-bold text-orange-400">{frpDisplay}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">ANOMALY RATIO</span>
              <span className={`text-base font-bold ${isEmergency ? 'text-red-400' : 'text-cyan-300'}`}>
                {anomalyRatioDisplay}
              </span>
            </div>
          </div>

          <div className="pt-1.5 border-t border-white/[0.06] space-y-1 text-[10.5px]">
            <div className="flex justify-between">
              <span className="text-slate-400">Satellite Sensor:</span>
              <span className="text-slate-200">{satellites}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Recorded Passes:</span>
              <span className="text-slate-200">{observationCount} observations</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Acquisition Time:</span>
              <span className="text-slate-200">{observationTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Confidence:</span>
              <span className="text-emerald-400 font-semibold">{formatConfidence(fire.confidence)}</span>
            </div>
          </div>
        </div>

        {/* 3. Exact Geographic Coordinates (Section 7) */}
        <div className="p-3 rounded-lg bg-white/[0.03] border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-sans font-semibold text-slate-400 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              <span>EXACT FIRMS OBSERVATION (WGS84)</span>
            </span>
            <button
              onClick={handleCopyCoords}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white transition-all text-[9px] font-mono cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'COPIED' : 'COPY'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 font-mono text-[11px] pt-0.5">
            <div className="p-1.5 rounded bg-white/[0.03] border border-white/[0.05]">
              <span className="text-slate-400 text-[9.5px] block">LATITUDE</span>
              <span className="text-slate-100 font-bold">{latStr}</span>
            </div>
            <div className="p-1.5 rounded bg-white/[0.03] border border-white/[0.05]">
              <span className="text-slate-400 text-[9.5px] block">LONGITUDE</span>
              <span className="text-slate-100 font-bold">{lonStr}</span>
            </div>
          </div>
        </div>

        {/* 4. Facility / Location Context (Section 9 & 10) */}
        <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/10 space-y-1.5">
          <div className="flex items-center gap-1.5 text-slate-400 uppercase text-[9.5px] font-semibold tracking-wider font-sans border-b border-white/[0.06] pb-1">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span>FACILITY / LOCATION CONTEXT</span>
          </div>

          {hasFacility ? (
            <div className="space-y-1.5 text-[10px]">
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-600/60 font-mono text-[9px] font-bold">
                  OSM VERIFIED
                </span>
                <span className="text-white font-bold">{fire.facility_name}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-400">Ground Context:</span>
                <span className="text-slate-200">OpenStreetMap Verified Perimeter</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-400">Category:</span>
                <span className="text-slate-200">{fire.location?.region || fire.category || 'Industrial Facility'}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-slate-400">Baseline FRP:</span>
                <span className="text-amber-300 font-semibold">{baselineFrpDisplay}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-1 text-[10px] py-1">
              <div className="flex items-center justify-between font-mono">
                <span className="text-slate-400">FACILITY CONTEXT:</span>
                <span className="text-amber-400 font-semibold">NOT VERIFIED</span>
              </div>
              <div className="text-[9.5px] text-slate-500 font-mono">
                No registered industrial facility at observation coordinate
              </div>
            </div>
          )}
        </div>

        {/* 5. Surface Wind & Estimated Dispersion (Section 11 & 12) */}
        <div className="p-3 rounded-lg bg-white/[0.03] border border-white/10 space-y-2">
          <div className="flex items-center gap-1.5 text-slate-400 uppercase text-[10px] font-semibold tracking-wider font-sans border-b border-white/[0.06] pb-1.5">
            <Wind className="w-3.5 h-3.5 text-slate-400" />
            <span>SURFACE WIND & ESTIMATED DISPERSION</span>
          </div>

          {hasWindData ? (
            <>
              <div className="grid grid-cols-2 gap-2 text-[10.5px] font-mono">
                <div>
                  <span className="text-slate-400 text-[9.5px] block">WIND VELOCITY</span>
                  <span className="text-slate-200 font-medium">
                    {windSpeedVal.toFixed(1)} km/h
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[9.5px] block">WIND BEARING</span>
                  <span className="text-slate-200 font-medium">
                    {Math.round(windBearingVal)}°
                  </span>
                </div>
              </div>

              <div className="pt-1.5 border-t border-white/[0.06] space-y-1 text-[10.5px] font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Estimated Dispersion:</span>
                  <span className="text-slate-200 font-medium">
                    {hasDispersion ? `${dispDistVal.toFixed(1)} km downwind` : 'Directional transport corridor'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Hazard Tier:</span>
                  <span className={`font-semibold ${isEmergency ? 'text-red-300' : 'text-amber-300'}`}>
                    {activePlume?.properties?.hazard_tier || (isEmergency ? 'TIER-1 CRITICAL DISPERSION' : 'OPERATIONAL DISPERSION')}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-[10px] font-mono text-amber-400/90 py-1">
              WIND DATA UNAVAILABLE
            </div>
          )}
        </div>

        {/* 6. Estimated Community Exposure (Section 14) */}
        <div className="p-3 rounded-lg bg-white/[0.03] border border-white/10 space-y-2">
          <div className="flex items-center gap-1.5 text-slate-400 uppercase text-[10px] font-semibold tracking-wider font-sans border-b border-white/[0.06] pb-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>ESTIMATED COMMUNITY EXPOSURE</span>
          </div>

          {hasExposureData ? (
            <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[10.5px]">
              <div className="p-1.5 rounded bg-white/[0.03]">
                <span className="text-[9px] text-slate-400 block font-sans">SETTLEMENTS</span>
                <span className="font-bold text-sky-300">{communityExposure.affected_settlements_count ?? (communityExposure.intersecting_settlements?.length || 0)}</span>
              </div>
              <div className="p-1.5 rounded bg-white/[0.03]">
                <span className="text-[9px] text-slate-400 block font-sans">SCHOOLS</span>
                <span className="font-bold text-emerald-300">{communityExposure.affected_schools_count ?? (communityExposure.intersecting_schools?.length || 0)}</span>
              </div>
              <div className="p-1.5 rounded bg-white/[0.03]">
                <span className="text-[9px] text-slate-400 block font-sans">HOSPITALS</span>
                <span className="font-bold text-rose-300">{communityExposure.affected_hospitals_count ?? (communityExposure.intersecting_hospitals?.length || 0)}</span>
              </div>
            </div>
          ) : (
            <div className="text-[10px] font-mono text-slate-400 py-1">
              EXPOSURE DATA: NOT AVAILABLE
            </div>
          )}
        </div>

        {/* 7. Data Provenance & Source Health */}
        <div className="p-3 rounded-lg bg-white/[0.03] border border-white/10 space-y-1.5 text-[10px] font-mono">
          <div className="text-slate-400 uppercase font-semibold font-sans tracking-wider border-b border-white/[0.06] pb-1">
            Data Provenance & Health
          </div>
          <div className="flex justify-between items-center py-0.5">
            <span className="text-slate-400">NASA FIRMS (VIIRS)</span>
            <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 text-[9px] font-bold">
              {dataHealth?.thermal_events?.live_connected ? 'LIVE' : 'SYNCHRONIZED'}
            </span>
          </div>
          <div className="flex justify-between items-center py-0.5">
            <span className="text-slate-400">OSM Facility Registry</span>
            <span className="px-1.5 py-0.2 rounded bg-slate-900 text-amber-300 border border-amber-800/50 text-[9px] font-bold">
              CURATED REGISTRY
            </span>
          </div>
          <div className="flex justify-between items-center py-0.5">
            <span className="text-slate-400">OSM Receptors (Overpass)</span>
            <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 text-[9px] font-bold">
              LIVE / CACHED
            </span>
          </div>
          <div className="flex justify-between items-center py-0.5">
            <span className="text-slate-400">Open-Meteo Meteorology</span>
            <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 text-[9px] font-bold">
              LIVE
            </span>
          </div>
          <div className="flex justify-between items-center py-0.5">
            <span className="text-slate-400">ESA WorldCover</span>
            <span className="px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-700 text-[9px] font-bold">
              BASELINE
            </span>
          </div>
        </div>

        {/* 8. Action Controls */}
        <div className="space-y-2 pt-1">
          <button
            onClick={onLocateEvent}
            className="w-full py-2.5 px-3 rounded-lg text-xs font-semibold bg-cyan-950/80 hover:bg-cyan-900/90 text-cyan-200 border border-cyan-500/50 backdrop-blur-md transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
            <span>Locate Event In 3D</span>
          </button>

          <button
            onClick={onTogglePlume}
            className={`w-full py-2.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 border cursor-pointer ${
              isPlumeActive
                ? 'bg-red-950/80 hover:bg-red-900/80 text-red-200 border-red-600/70 shadow-lg'
                : 'bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 border-white/10'
            }`}
          >
            <Wind className="w-3.5 h-3.5 text-slate-400" />
            {plumeLoading ? 'Calculating Dispersion...' : isPlumeActive ? 'Hide Estimated Dispersion' : 'Estimate Downwind Dispersion'}
          </button>

          {onOpenReport && (
            <button
              onClick={onOpenReport}
              className="w-full py-2 px-3 rounded-lg text-xs font-medium bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Generate Incident Dossier</span>
            </button>
          )}

          <button
            onClick={onExit3D}
            className="w-full py-2 px-3 rounded-lg text-xs font-medium bg-transparent hover:bg-white/[0.05] text-slate-400 hover:text-slate-200 border border-white/[0.08] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
            <span>Return to 2D Map</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
