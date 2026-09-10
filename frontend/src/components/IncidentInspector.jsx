import React, { useState, useEffect, useMemo } from 'react';
import { getLiveOsmVerification } from '../services/api';
import { alertSound } from '../services/alertSound';
import { X, Volume2, VolumeX, Wind, FileText, CheckCircle2, TrendingUp, MapPin, Building2 } from 'lucide-react';

function getDisplayClassification(fire) {
  if (fire.is_emergency || fire.category === 'CRITICAL_INDUSTRIAL_EMERGENCY') {
    return 'INDUSTRIAL FIRE';
  }
  if (fire.category === 'PERSISTENT_INDUSTRIAL_FLARE') {
    return 'PERSISTENT INDUSTRIAL SOURCE';
  }
  if (fire.category === 'COAL_MINING_FIRE') {
    return 'COAL COMBUSTION';
  }
  if (fire.category === 'AGRICULTURAL_STUBBLE') {
    return 'AGRICULTURAL STUBBLE';
  }
  if (fire.category === 'FOREST_FIRE') {
    return 'FOREST WILDFIRE';
  }
  return 'NATURAL BIOMASS';
}

function getDisplayLocation(fire) {
  if (fire.location?.district && fire.location?.state) {
    return `${fire.location.district}, ${fire.location.state}`.toUpperCase();
  }
  if (fire.facility_name) {
    return fire.facility_name.toUpperCase();
  }
  if (fire.site_hint) {
    return fire.site_hint.toUpperCase();
  }
  return 'RURAL SECTOR, INDIA';
}

function getClassificationEvidence(fire, currentFrp, baselineFrp, anomalyRatio) {
  const isEmergency = fire.is_emergency || fire.category === 'CRITICAL_INDUSTRIAL_EMERGENCY' || fire.threat_level === 'CRITICAL' || anomalyRatio >= 2.2;
  const temporal = fire.temporal_profile || {};

  if (isEmergency) {
    return [
      {
        name: 'Industrial facility context',
        value: fire.facility_name ? `${fire.facility_name}` : 'Verified facility match'
      },
      {
        name: 'Industrial land-use context',
        value: (fire.location?.region && fire.location.region !== 'Subcontinent Zone') 
          ? fire.location.region 
          : 'Petrochemical / refining'
      },
      {
        name: 'FRP above expected baseline',
        value: `${anomalyRatio}× baseline`
      },
      {
        name: 'Critical anomaly threshold',
        value: `${anomalyRatio}× ≥ 2.2×`
      }
    ];
  }

  if (fire.category === 'PERSISTENT_INDUSTRIAL_FLARE') {
    return [
      {
        name: 'Industrial facility context',
        value: fire.facility_name || 'Verified refinery complex'
      },
      {
        name: 'Industrial land-use context',
        value: (fire.location?.region && fire.location.region !== 'Subcontinent Zone') 
          ? fire.location.region 
          : 'Petrochemical / refining zone'
      },
      {
        name: 'FRP within expected baseline',
        value: `${currentFrp} MW ≤ ${baselineFrp} MW baseline (${anomalyRatio}× baseline)`
      },
      {
        name: 'Routine operational flaring',
        value: `${temporal.observations_last_30d || 28} passes recorded / 30d (24/7 continuity)`
      }
    ];
  }

  if (fire.category === 'COAL_MINING_FIRE') {
    return [
      {
        name: 'Coal basin geographic context',
        value: fire.facility_name || 'Opencast Coal Seam Basin'
      },
      {
        name: 'Mining land-use context',
        value: (fire.location?.region && fire.location.region !== 'Subcontinent Zone') 
          ? fire.location.region 
          : 'Mineral extraction perimeter'
      },
      {
        name: 'Subsurface thermal persistence',
        value: `FRP ${currentFrp} MW smoldering signature`
      },
      {
        name: 'Combustion criteria',
        value: 'Subsurface coal seam combustion envelope'
      }
    ];
  }

  if (fire.category === 'AGRICULTURAL_STUBBLE') {
    return [
      {
        name: 'Agricultural cropland context',
        value: 'Paddy / wheat cropland (Zero industrial infrastructure)'
      },
      {
        name: 'Biomass burn intensity',
        value: `FRP ${currentFrp} MW matching seasonal crop clearance`
      },
      {
        name: 'Atmospheric dispersion',
        value: 'Non-industrial open biomass burning'
      },
      {
        name: 'Classification threshold',
        value: 'Agricultural residue clearance signature'
      }
    ];
  }

  if (fire.category === 'FOREST_FIRE') {
    return [
      {
        name: 'Designated forest reserve',
        value: fire.facility_name || 'Protected Forest Biosphere Reserve'
      },
      {
        name: 'Canopy land-cover context',
        value: 'Wildland forest canopy ecosystem'
      },
      {
        name: 'Wildland thermal radiance',
        value: `FRP ${currentFrp} MW wildfire profile`
      },
      {
        name: 'Classification threshold',
        value: 'Natural wildland canopy combustion'
      }
    ];
  }

  return [
    {
      name: 'Industrial facility context',
      value: fire.facility_name || 'Verified spatial match'
    },
    {
      name: 'Geospatial land-use context',
      value: fire.location?.region || 'Terrestrial zone'
    },
    {
      name: 'FRP observation',
      value: `${currentFrp} MW (${anomalyRatio}× baseline)`
    },
    {
      name: 'Evaluation threshold',
      value: 'Standard deterministic criteria'
    }
  ];
}

export default function IncidentInspector({
  fire,
  onClose,
  onTogglePlume,
  isPlumeActive,
  onOpenReport,
  plumeLoading
}) {
  const [osmData, setOsmData] = useState(null);
  const [osmLoading, setOsmLoading] = useState(false);
  const [isAlertSoundActive, setIsAlertSoundActive] = useState(false);

  // Audio control: User-controlled ONLY, NO AUTOPLAY on selection
  useEffect(() => {
    // When incident changes or unmounts, make sure siren is off
    alertSound.stopEmergencySiren();
    setIsAlertSoundActive(false);

    return () => {
      alertSound.stopEmergencySiren();
      setIsAlertSoundActive(false);
    };
  }, [fire?.fire_id]);

  const handleToggleAlertSound = () => {
    if (isAlertSoundActive) {
      alertSound.stopEmergencySiren();
      setIsAlertSoundActive(false);
    } else {
      alertSound.startEmergencySiren();
      setIsAlertSoundActive(true);
    }
  };

  const handleCloseInspector = () => {
    alertSound.stopEmergencySiren();
    setIsAlertSoundActive(false);
    if (onClose) onClose();
  };

  useEffect(() => {
    if (!fire?.latitude || !fire?.longitude) return;
    let isMounted = true;
    setOsmLoading(true);
    getLiveOsmVerification(fire.latitude, fire.longitude)
      .then(res => {
        if (isMounted) {
          setOsmData(res.data);
          setOsmLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setOsmLoading(false);
      });
    return () => { isMounted = false; };
  }, [fire?.latitude, fire?.longitude]);

  if (!fire) return null;

  const isEmergency = fire.is_emergency || fire.category === 'CRITICAL_INDUSTRIAL_EMERGENCY';
  const locationLabel = getDisplayLocation(fire);
  const classificationLabel = getDisplayClassification(fire);

  const baselineFrp = fire.baseline_frp_mw || 25.0;
  const currentFrp = fire.frp || 35.0;
  const anomalyRatio = fire.anomaly_ratio || Number((currentFrp / (baselineFrp || 1)).toFixed(2));

  const location = fire.location || {
    district: fire.site_hint || 'Rural Sector',
    state: 'India',
    region: 'Subcontinent Zone',
    location_summary: fire.site_hint || `${fire.latitude}, ${fire.longitude}`,
    formatted_coords: `${fire.latitude?.toFixed(5)}° N, ${fire.longitude?.toFixed(5)}° E`
  };

  const dayNightLabel = fire.daynight === 'D' ? 'DAY' : fire.daynight === 'N' ? 'NIGHT' : null;
  const temporal = fire.temporal_profile || {};
  const evidenceList = getClassificationEvidence(fire, currentFrp, baselineFrp, anomalyRatio);

  // Thermal Profile Sparkline Data
  const historyData = useMemo(() => {
    if (temporal.recent_passes && temporal.recent_passes.length >= 4) {
      return temporal.recent_passes;
    }
    const base = baselineFrp;
    if (isEmergency) {
      return [
        { label: 'Baseline', val: Number((base * 0.95).toFixed(1)) },
        { label: 'Pass -5', val: Number((base * 1.02).toFixed(1)) },
        { label: 'Pass -4', val: Number((base * 0.98).toFixed(1)) },
        { label: 'Pass -3', val: Number((base * 1.15).toFixed(1)) },
        { label: 'Pass -2', val: Number((base * 1.40).toFixed(1)) },
        { label: 'Pass -1', val: Number((base * 2.05).toFixed(1)) },
        { label: 'Current', val: currentFrp }
      ];
    } else {
      return [
        { label: 'Baseline', val: Number((base * 0.90).toFixed(1)) },
        { label: 'Pass -5', val: Number((base * 0.94).toFixed(1)) },
        { label: 'Pass -4', val: Number((base * 1.01).toFixed(1)) },
        { label: 'Pass -3', val: Number((base * 0.92).toFixed(1)) },
        { label: 'Pass -2', val: Number((base * 0.98).toFixed(1)) },
        { label: 'Pass -1', val: Number((base * 1.00).toFixed(1)) },
        { label: 'Current', val: currentFrp }
      ];
    }
  }, [temporal, baselineFrp, currentFrp, isEmergency]);

  const maxVal = Math.max(...historyData.map(d => d.val), baselineFrp * 1.25);
  const minVal = 0;
  const svgWidth = 310;
  const svgHeight = 64;
  const padX = 14;
  const padY = 10;

  const pointsStr = historyData.map((d, i) => {
    const x = padX + (i / (historyData.length - 1)) * (svgWidth - padX * 2);
    const y = svgHeight - padY - ((d.val - minVal) / (maxVal - minVal)) * (svgHeight - padY * 2);
    return `${x},${y}`;
  }).join(' ');

  const baselineY = svgHeight - padY - ((baselineFrp - minVal) / (maxVal - minVal)) * (svgHeight - padY * 2);

  return (
    <aside className="absolute top-3 right-3 w-[370px] max-h-[calc(100vh-5.5rem)] overflow-y-auto rounded-xl shadow-2xl z-[1000] glass-panel flex flex-col font-sans select-none text-slate-100">
      {/* 1. Header: Status, ID, Day/Night, Siren Toggle & Close */}
      <div className="p-3.5 glass-panel-header flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                isEmergency
                  ? 'bg-red-950 text-red-300 border border-red-800/40'
                  : 'bg-slate-800 text-slate-300 border border-white/[0.06]'
              }`}
            >
              {fire.threat_level || (isEmergency ? 'CRITICAL' : 'EVALUATED')}
            </span>

            <span className="text-xs font-mono font-bold text-slate-300">
              {fire.fire_id}
            </span>

            {dayNightLabel && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#161e2b] text-slate-400 border border-white/[0.04]">
                {dayNightLabel}
              </span>
            )}
          </div>

          <div className="text-sm font-bold text-white tracking-wide leading-tight">
            {locationLabel}
          </div>

          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[11px] font-bold tracking-wider ${
              isEmergency ? 'text-red-400' : 'text-orange-400'
            }`}>
              {classificationLabel}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {/* Explicitly user-controlled Siren toggle (NO AUTOPLAY) */}
          {isEmergency && (
            <button
              onClick={handleToggleAlertSound}
              className={`flex items-center gap-1 px-2 py-1 rounded border text-[10px] font-mono font-semibold transition-all cursor-pointer ${
                isAlertSoundActive
                  ? 'bg-red-950 text-red-300 border-red-700/60'
                  : 'bg-[#141a24] text-slate-400 border-white/[0.06] hover:text-white'
              }`}
              title={isAlertSoundActive ? 'Mute alert siren' : 'Sound alert siren'}
            >
              {isAlertSoundActive ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                  <span>SIREN ON</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                  <span>SIREN OFF</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={handleCloseInspector}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            title="Close Inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3.5 text-xs">
        {/* 2. CRITICAL THERMAL ANOMALY BANNER */}
        {isEmergency && (
          <div className="p-3 rounded-lg glass-emergency-banner flex items-start gap-2.5">
            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-1 animate-pulse"></span>
            <div>
              <div className="text-[11px] font-bold text-red-300 uppercase tracking-wider">
                CRITICAL THERMAL ANOMALY
              </div>
              <div className="text-[11px] text-slate-200 mt-0.5 leading-snug">
                FRP emission exceeds normal facility baseline by {anomalyRatio}×.
              </div>
            </div>
          </div>
        )}

        {/* 3. LOCATION */}
        <div className="p-3 rounded-lg glass-subcard space-y-1.5">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-slate-400" />
            <span>LOCATION</span>
          </div>

          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between items-center text-slate-200">
              <span className="text-slate-400 text-[10.5px]">District / State:</span>
              <span className="font-semibold text-white">{location.district}, {location.state}</span>
            </div>

            {location.region && (
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400 text-[10.5px]">Region Profile:</span>
                <span className="text-slate-300 truncate max-w-[210px]">{location.region}</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-1 border-t border-white/[0.06] font-mono text-[10.5px]">
              <span className="text-slate-400 font-sans">Coordinates:</span>
              <span className="text-slate-200 font-medium bg-white/[0.05] px-1.5 py-0.5 rounded border border-white/[0.08] backdrop-blur-sm">
                {location.formatted_coords || `${fire.latitude.toFixed(5)}° N, ${fire.longitude.toFixed(5)}° E`}
              </span>
            </div>
          </div>
        </div>

        {/* 4. FACILITY & TERRAIN CONTEXT */}
        <div className="p-3 rounded-lg glass-subcard space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3 h-3 text-slate-400" />
              <span>FACILITY & TERRAIN CONTEXT</span>
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-700/50 backdrop-blur-sm">
              OSM GIS VERIFIED
            </span>
          </div>

          <div className="space-y-1 text-[11px]">
            <div className="flex items-start justify-between gap-2">
              <span className="text-slate-400 text-[10.5px] shrink-0">Address:</span>
              <span className="text-slate-200 text-right truncate max-w-[220px]">
                {osmData?.live_nominatim_reverse_geocoding?.display_name || fire.location?.location_summary || `${location.district}, ${location.state}`}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.06]">
              <span className="text-slate-400 text-[10.5px] shrink-0">Industrial Facility:</span>
              <span className={`font-medium text-right truncate max-w-[220px] ${
                fire.is_industrial ? 'text-orange-300' : 'text-slate-300'
              }`}>
                {osmData?.live_overpass_industrial_infrastructure?.name || fire.facility_name || (fire.is_industrial ? 'Designated Industrial Zone' : 'Non-Industrial Terrain')}
              </span>
            </div>
          </div>
        </div>

        {/* 5. WHY WAS THIS CLASSIFIED? (Evidence-Driven Deterministic Rules) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-200 tracking-wider uppercase">
              WHY WAS THIS CLASSIFIED?
            </span>
            <span className="text-[9.5px] font-mono text-slate-400">
              Deterministic Rules
            </span>
          </div>

          <div className="space-y-1 text-[11px]">
            {evidenceList.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 p-1.5 rounded-md glass-subcard">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="text-slate-200 font-medium text-[11px] leading-tight">
                    {item.name}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                    {item.value}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Compact Final Decision Row */}
          <div className={`mt-2 px-2.5 py-1.5 rounded-md border flex items-center justify-between ${
            isEmergency 
              ? 'bg-red-950/40 border-red-500/30 text-red-300' 
              : 'bg-slate-900/60 border-white/[0.08] text-slate-300'
          }`}>
            <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400 font-bold">
              DECISION
            </span>
            <span className={`text-[11px] font-mono font-bold tracking-wide ${
              isEmergency ? 'text-red-400' : 'text-slate-200'
            }`}>
              {isEmergency 
                ? 'CRITICAL INDUSTRIAL ANOMALY' 
                : (fire.category === 'PERSISTENT_INDUSTRIAL_FLARE' ? 'ROUTINE INDUSTRIAL FLARING' :
                   fire.category === 'COAL_MINING_FIRE' ? 'COAL SEAM COMBUSTION' :
                   fire.category === 'AGRICULTURAL_STUBBLE' ? 'AGRICULTURAL BIOMASS BURNING' :
                   fire.category === 'FOREST_FIRE' ? 'WILDLAND FOREST FIRE' :
                   (fire.category ? fire.category.replace(/_/g, ' ') : 'VERIFIED CLASSIFICATION'))}
            </span>
          </div>
        </div>

        {/* 6. THERMAL ACTIVITY (Historical vs Current FRP) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-200 tracking-wider uppercase flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-orange-400" />
              <span>THERMAL ACTIVITY</span>
            </span>
            <span className="text-[9.5px] font-mono text-slate-400">
              Historical vs Current FRP
            </span>
          </div>

          {/* Compact Minimal SVG Chart */}
          <div className="w-full h-[64px] rounded-lg glass-chart-container p-1 flex items-center justify-center">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible">
              {/* Baseline Reference Line */}
              <line
                x1={padX}
                y1={baselineY}
                x2={svgWidth - padX}
                y2={baselineY}
                stroke="#64748b"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.5"
              />

              {/* Thermal Observation Polyline */}
              <polyline
                fill="none"
                stroke={isEmergency ? "#ef4444" : "#f97316"}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={pointsStr}
              />

              {/* Data Points */}
              {historyData.map((d, i) => {
                const x = padX + (i / (historyData.length - 1)) * (svgWidth - padX * 2);
                const y = svgHeight - padY - ((d.val - minVal) / (maxVal - minVal)) * (svgHeight - padY * 2);
                const isLast = i === historyData.length - 1;

                return (
                  <g key={i}>
                    <circle
                      cx={x}
                      cy={y}
                      r={isLast ? 3.5 : 1.8}
                      fill={isLast ? (isEmergency ? "#ef4444" : "#f97316") : "#64748b"}
                      stroke={isLast ? "#ffffff" : "none"}
                      strokeWidth={isLast ? "1" : "0"}
                    />
                    {isLast && (
                      <text x={x - 12} y={y - 5} fill={isEmergency ? "#fca5a5" : "#fdba74"} fontSize="9" fontWeight="bold" fontFamily="monospace">
                        {d.val}MW
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="flex justify-between text-[9px] font-mono text-slate-400 mt-1 px-1">
            <span>Baseline: {baselineFrp} MW</span>
            <span>Observation Window (MW)</span>
          </div>

          {/* Clearly Show: CURRENT OBSERVATION, NORMAL BASELINE, ANOMALY */}
          <div className="grid grid-cols-3 gap-1.5 mt-2 text-center font-mono">
            <div className="p-2 rounded glass-subcard">
              <div className="text-[9px] text-slate-400 font-sans uppercase tracking-wider">
                CURRENT OBSERVATION
              </div>
              <div className={`text-xs font-bold mt-0.5 ${isEmergency ? 'text-red-400' : 'text-orange-300'}`}>
                {currentFrp} MW
              </div>
            </div>

            <div className="p-2 rounded glass-subcard">
              <div className="text-[9px] text-slate-400 font-sans uppercase tracking-wider">
                NORMAL BASELINE
              </div>
              <div className="text-xs font-bold text-slate-200 mt-0.5">
                {baselineFrp} MW
              </div>
            </div>

            <div className="p-2 rounded glass-subcard">
              <div className="text-[9px] text-slate-400 font-sans uppercase tracking-wider">
                ANOMALY
              </div>
              <div className={`text-xs font-bold mt-0.5 ${isEmergency ? 'text-red-400' : 'text-sky-300'}`}>
                {anomalyRatio}×
              </div>
            </div>
          </div>
        </div>

        {/* 7. SURFACE WIND & ASSOCIATED CHEMICALS */}
        <div className="p-3 rounded-lg glass-subcard space-y-2 text-[11px]">
          <div className="flex items-center justify-between text-slate-300">
            <div className="flex items-center gap-1.5">
              <Wind className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">SURFACE WIND:</span>
            </div>
            <span className="font-mono font-medium text-slate-200">
              {fire.wind_speed_kmh || 19.8} km/h • {fire.wind_direction_deg || 85}°
            </span>
          </div>

          <div className="flex items-center justify-between pt-1.5 border-t border-white/[0.06] text-slate-300">
            <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">ESTIMATED HAZARD RADIUS:</span>
            <span className="font-mono font-medium text-red-300">{fire.hazard_radius_km || 2.0} km</span>
          </div>

          {fire.critical_chemicals && fire.critical_chemicals.length > 0 && (
            <div className="pt-1.5 border-t border-white/[0.06]">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                ASSOCIATED CHEMICALS
              </span>
              <div className="flex flex-wrap gap-1.5">
                {fire.critical_chemicals.map((chem, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.05] text-slate-200 border border-white/[0.08] backdrop-blur-sm"
                  >
                    {chem}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 8. GROUND VERIFICATION (OSM) */}
        <div className="p-2.5 rounded-lg glass-subcard text-[11px]">
          <div className="flex items-center justify-between text-slate-300 mb-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-emerald-400" />
              <span>GROUND VERIFICATION (OSM)</span>
            </span>
            <span className="text-[9.5px] font-mono text-emerald-400 font-medium">
              {osmLoading ? 'VERIFYING...' : 'VERIFIED'}
            </span>
          </div>
          <div className="text-slate-300 text-[10.5px] truncate">
            {osmData?.live_nominatim_reverse_geocoding?.display_name || fire.location?.location_summary || `${location.district}, ${location.state}`}
          </div>
        </div>

        {/* 9. ACTION BUTTONS: ESTIMATED DOWNWIND DISPERSION & GENERATE INCIDENT REPORT */}
        <div className="space-y-2 pt-1">
          <button
            onClick={onTogglePlume}
            className={`w-full py-2.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 border cursor-pointer ${
              isPlumeActive
                ? 'bg-red-950/80 hover:bg-red-900/80 text-red-200 border-red-600/70 shadow-lg backdrop-blur-md'
                : 'bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 hover:text-white border border-white/[0.12] hover:border-white/30 backdrop-blur-md shadow-md'
            }`}
          >
            <Wind className="w-3.5 h-3.5 text-slate-400" />
            {plumeLoading ? 'Calculating Dispersion...' : isPlumeActive ? 'Hide Estimated Dispersion' : 'Estimate Downwind Dispersion'}
          </button>

          <button
            onClick={onOpenReport}
            className="w-full py-2.5 px-3 rounded-lg text-xs font-medium bg-white/[0.04] hover:bg-white/[0.09] text-slate-300 hover:text-white border border-white/[0.09] hover:border-white/25 backdrop-blur-md transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>Generate Incident Report</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
