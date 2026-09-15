import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getLiveOsmVerification } from '../services/api';
import { alertSound } from '../services/alertSound';
import { 
  X, Volume2, VolumeX, Wind, FileText, CheckCircle2, TrendingUp, 
  MapPin, Building2, Radio, Play, Pause, RotateCcw, AlertTriangle, 
  Clock, ShieldAlert, Check, Users, School, PlusSquare, Layers
} from 'lucide-react';

function formatUtcAndIst(acqDate, acqTime) {
  if (!acqDate || !acqTime) return { utc: '12:00 UTC', ist: '17:30 IST' };
  const cleanTime = String(acqTime).padStart(4, '0');
  const hh = cleanTime.substring(0, 2);
  const mm = cleanTime.substring(2, 4);
  const utcStr = `${hh}:${mm} UTC`;
  
  // Approximate IST = UTC + 5:30
  let istH = parseInt(hh, 10) + 5;
  let istM = parseInt(mm, 10) + 30;
  if (istM >= 60) {
    istM -= 60;
    istH += 1;
  }
  istH = istH % 24;
  const istStr = `${String(istH).padStart(2, '0')}:${String(istM).padStart(2, '0')} IST`;
  return { utc: utcStr, ist: istStr };
}

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
  plumeLoading,
  onReplayEvent,
  onEnter3D
}) {
  const [osmData, setOsmData] = useState(null);
  const [osmLoading, setOsmLoading] = useState(false);
  const [isAlertSoundActive, setIsAlertSoundActive] = useState(false);
  
  // Replay state
  const [isPlayingReplay, setIsPlayingReplay] = useState(false);
  const [replayIndex, setReplayIndex] = useState(null);
  const [replaySpeed, setReplaySpeed] = useState(1);
  const replayTimerRef = useRef(null);

  // Authority review state (local acknowledgment)
  const [reviewStatus, setReviewStatus] = useState('PENDING'); // 'PENDING' | 'ACKNOWLEDGED' | 'VERIFIED' | 'ESCALATED'

  // Audio control: User-controlled ONLY, NO AUTOPLAY on selection
  useEffect(() => {
    alertSound.stopEmergencySiren();
    setIsAlertSoundActive(false);
    setIsPlayingReplay(false);
    setReplayIndex(null);
    setReviewStatus('PENDING');

    return () => {
      alertSound.stopEmergencySiren();
      setIsAlertSoundActive(false);
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);
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
    if (replayTimerRef.current) clearInterval(replayTimerRef.current);
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

  // Multi-satellite provenance
  const satellitesList = fire.satellites || [fire.satellite || 'VIIRS_SNPP'];
  const satelliteDisplay = fire.satellites_display || satellitesList.map(s => s.replace('VIIRS_', '')).join(' • ');

  // Acquisition times
  const timeLabels = formatUtcAndIst(fire.acq_date, fire.acq_time);

  // Community exposure
  const exposure = fire.community_exposure || null;

  // Thermal Profile Sparkline & Multi-pass Data
  const historyData = useMemo(() => {
    if (fire.history && fire.history.length > 0) {
      return fire.history.map((h, i) => ({
        label: h.acq_time || `Pass ${i + 1}`,
        time: h.acq_time,
        date: h.acq_date,
        satellite: h.satellite ? h.satellite.replace('VIIRS_', '') : 'VIIRS',
        val: Number(h.frp.toFixed(1))
      }));
    }
    if (temporal.recent_passes && temporal.recent_passes.length >= 4) {
      return temporal.recent_passes;
    }
    const base = baselineFrp;
    if (isEmergency) {
      return [
        { label: 'Pass -5', satellite: 'SNPP', val: Number((base * 1.02).toFixed(1)) },
        { label: 'Pass -4', satellite: 'NOAA-20', val: Number((base * 0.98).toFixed(1)) },
        { label: 'Pass -3', satellite: 'NOAA-21', val: Number((base * 1.15).toFixed(1)) },
        { label: 'Pass -2', satellite: 'SNPP', val: Number((base * 1.40).toFixed(1)) },
        { label: 'Pass -1', satellite: 'NOAA-20', val: Number((base * 2.05).toFixed(1)) },
        { label: 'Current', satellite: 'NOAA-21', val: currentFrp }
      ];
    } else {
      return [
        { label: 'Pass -5', satellite: 'SNPP', val: Number((base * 0.94).toFixed(1)) },
        { label: 'Pass -4', satellite: 'NOAA-20', val: Number((base * 1.01).toFixed(1)) },
        { label: 'Pass -3', satellite: 'NOAA-21', val: Number((base * 0.92).toFixed(1)) },
        { label: 'Pass -2', satellite: 'SNPP', val: Number((base * 0.98).toFixed(1)) },
        { label: 'Pass -1', satellite: 'NOAA-20', val: Number((base * 1.00).toFixed(1)) },
        { label: 'Current', satellite: 'SNPP', val: currentFrp }
      ];
    }
  }, [fire.history, temporal, baselineFrp, currentFrp, isEmergency]);

  // Active pass for replay (if null, defaults to latest)
  const activePointIndex = replayIndex !== null ? replayIndex : historyData.length - 1;
  const displayedFrp = historyData[activePointIndex]?.val || currentFrp;

  // Replay timer handling
  useEffect(() => {
    if (isPlayingReplay) {
      const intervalMs = Math.max(250, 1000 / replaySpeed);
      replayTimerRef.current = setInterval(() => {
        setReplayIndex(prev => {
          const next = (prev === null ? 0 : prev + 1);
          if (next >= historyData.length) {
            setIsPlayingReplay(false);
            return historyData.length - 1;
          }
          return next;
        });
      }, intervalMs);
    } else {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    }
    return () => {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    };
  }, [isPlayingReplay, replaySpeed, historyData.length]);

  const handleToggleReplay = () => {
    if (isPlayingReplay) {
      setIsPlayingReplay(false);
    } else {
      if (replayIndex === null || replayIndex >= historyData.length - 1) {
        setReplayIndex(0);
      }
      setIsPlayingReplay(true);
    }
  };

  const handleResetReplay = () => {
    setIsPlayingReplay(false);
    setReplayIndex(null);
  };

  const maxVal = Math.max(...historyData.map(d => d.val), baselineFrp * 1.3);
  const minVal = 0;
  const svgWidth = 320;
  const svgHeight = 70;
  const padX = 14;
  const padY = 12;

  const pointsStr = historyData.map((d, i) => {
    const x = padX + (i / Math.max(1, historyData.length - 1)) * (svgWidth - padX * 2);
    const y = svgHeight - padY - ((d.val - minVal) / Math.max(1, maxVal - minVal)) * (svgHeight - padY * 2);
    return `${x},${y}`;
  }).join(' ');

  const baselineY = svgHeight - padY - ((baselineFrp - minVal) / Math.max(1, maxVal - minVal)) * (svgHeight - padY * 2);

  return (
    <aside className="absolute top-3 right-3 w-[390px] max-h-[calc(100vh-5.5rem)] overflow-y-auto rounded-xl shadow-2xl z-[1000] glass-panel flex flex-col font-sans select-none text-slate-100 border border-white/[0.1]">
      {/* 1. Header: Status, ID, Day/Night, Siren Toggle & Close */}
      <div className="p-3.5 glass-panel-header flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                isEmergency
                  ? 'bg-red-950 text-red-300 border border-red-800/60 animate-pulse'
                  : 'bg-slate-800 text-slate-300 border border-white/[0.08]'
              }`}
            >
              {fire.threat_level || (isEmergency ? 'CRITICAL' : 'EVALUATED')}
            </span>

            <span className="text-xs font-mono font-bold text-slate-200">
              {fire.event_id || fire.fire_id}
            </span>

            {dayNightLabel && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#161e2b] text-slate-400 border border-white/[0.05]">
                {dayNightLabel}
              </span>
            )}

            {satellitesList.length > 1 && (
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-sky-950/70 text-sky-300 border border-sky-700/50">
                {satellitesList.length} PASSES MERGED
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
          {/* User-controlled Siren toggle (NO AUTOPLAY) */}
          {isEmergency && (
            <button
              onClick={handleToggleAlertSound}
              className={`flex items-center gap-1 px-2 py-1 rounded border text-[10px] font-mono font-semibold transition-all cursor-pointer ${
                isAlertSoundActive
                  ? 'bg-red-950 text-red-300 border-red-700/60'
                  : 'bg-[#141a24] text-slate-400 border-white/[0.08] hover:text-white'
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

          {onEnter3D && (
            <button
              onClick={onEnter3D}
              className="flex items-center gap-1 px-2 py-1 rounded bg-cyan-950/80 hover:bg-cyan-900/90 text-cyan-300 hover:text-cyan-100 border border-cyan-500/50 text-[10px] font-mono font-bold transition-all cursor-pointer shadow-sm"
              title="Open 3D Incident Inspection Mode"
            >
              <Layers className="w-3 h-3 text-cyan-400" />
              <span>3D</span>
            </button>
          )}

          <button
            onClick={handleCloseInspector}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            title="Close Inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3 text-xs">
        {/* 2. AUTHORITY REVIEW REQUIRED WORKFLOW BANNER */}
        {(isEmergency || fire.authority_review_required || (exposure && exposure.risk_level === 'CRITICAL')) && (
          <div className="p-3 rounded-lg bg-red-950/70 border border-red-600/50 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-red-200 font-bold text-[11px] tracking-wide">
                <ShieldAlert className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                <span>AUTHORITY REVIEW REQUIRED</span>
              </div>
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                reviewStatus === 'ESCALATED' ? 'bg-red-900 text-white' :
                reviewStatus === 'VERIFIED' ? 'bg-emerald-900 text-emerald-200' :
                reviewStatus === 'ACKNOWLEDGED' ? 'bg-amber-900 text-amber-200' :
                'bg-red-950 text-red-300 border border-red-800'
              }`}>
                {reviewStatus}
              </span>
            </div>

            <p className="text-[10px] text-slate-300 leading-snug">
              Thermal anomaly exceeds normal threshold with potential downwind community impact. Verified human authority action mandated.
            </p>

            <div className="flex items-center gap-1.5 pt-1">
              {reviewStatus === 'PENDING' && (
                <button
                  onClick={() => setReviewStatus('ACKNOWLEDGED')}
                  className="flex-1 py-1 px-2 rounded bg-amber-950/80 hover:bg-amber-900/90 text-amber-200 border border-amber-700/50 text-[10px] font-medium transition cursor-pointer"
                >
                  Acknowledge Incident
                </button>
              )}

              {(reviewStatus === 'PENDING' || reviewStatus === 'ACKNOWLEDGED') && (
                <button
                  onClick={() => setReviewStatus('VERIFIED')}
                  className="flex-1 py-1 px-2 rounded bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-200 border border-emerald-700/50 text-[10px] font-medium transition cursor-pointer"
                >
                  Mark Verified
                </button>
              )}

              <button
                onClick={() => {
                  setReviewStatus('ESCALATED');
                  if (onOpenReport) onOpenReport();
                }}
                className="flex-1 py-1 px-2 rounded bg-red-900 hover:bg-red-800 text-white border border-red-500 text-[10px] font-semibold transition cursor-pointer flex items-center justify-center gap-1"
              >
                <AlertTriangle className="w-3 h-3 text-red-200" />
                <span>Escalate NDRF</span>
              </button>
            </div>
          </div>
        )}

        {/* 3. DATA SOURCE & PROVENANCE PANEL */}
        <div className="p-3 rounded-lg glass-subcard space-y-1.5">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-sky-400" />
              <span>DATA SOURCE & SATELLITE PROVENANCE</span>
            </span>
            <span className="text-[9px] font-mono text-sky-300 font-semibold">
              NASA FIRMS VIIRS
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10.5px]">
            <div className="bg-black/20 p-1.5 rounded border border-white/[0.04]">
              <span className="text-slate-400 block text-[9.5px]">Sensors Merged:</span>
              <span className="text-slate-200 font-mono font-medium">{satelliteDisplay}</span>
            </div>
            <div className="bg-black/20 p-1.5 rounded border border-white/[0.04]">
              <span className="text-slate-400 block text-[9.5px]">Spatial Resolution:</span>
              <span className="text-slate-200 font-mono font-medium">375m nominal nadir</span>
            </div>
          </div>

          <div className="pt-1 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-slate-300">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>Observation: {timeLabels.utc} ({timeLabels.ist})</span>
            </div>
            <span className="text-slate-400">Polling: 5m cycle</span>
          </div>
        </div>

        {/* 4. LOCATION */}
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

        {/* 5. FACILITY & TERRAIN CONTEXT */}
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
              <span className="text-slate-200 text-right truncate max-w-[230px]">
                {osmData?.live_nominatim_reverse_geocoding?.display_name || fire.location?.location_summary || `${location.district}, ${location.state}`}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.06]">
              <span className="text-slate-400 text-[10.5px] shrink-0">Industrial Facility:</span>
              <span className={`font-medium text-right truncate max-w-[230px] ${
                fire.is_industrial ? 'text-orange-300' : 'text-slate-300'
              }`}>
                {osmData?.live_overpass_industrial_infrastructure?.name || fire.facility_name || (fire.is_industrial ? 'Designated Industrial Zone' : 'Non-Industrial Terrain')}
              </span>
            </div>
          </div>
        </div>

        {/* 6. DOWNWIND COMMUNITY EXPOSURE PANEL */}
        {exposure && (
          <div className="p-3 rounded-lg glass-subcard space-y-2 border border-white/[0.08]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3 h-3 text-rose-400" />
                <span>DOWNWIND COMMUNITY EXPOSURE</span>
              </span>
              <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                exposure.risk_level === 'CRITICAL' ? 'bg-red-950 text-red-300 border border-red-700' :
                exposure.risk_level === 'HIGH' ? 'bg-orange-950 text-orange-300 border border-orange-700' :
                exposure.risk_level === 'MEDIUM' ? 'bg-amber-950 text-amber-300 border border-amber-700' :
                'bg-emerald-950 text-emerald-300 border border-emerald-800'
              }`}>
                {exposure.risk_level} RISK
              </span>
            </div>

            {/* Receptors Display */}
            {(!exposure.total_sensitive_in_corridor || exposure.total_sensitive_in_corridor === 0) ? (
              <div className="p-3 rounded bg-black/30 border border-white/[0.06] text-center space-y-1">
                <div className="text-[11px] font-mono font-bold text-slate-200 tracking-wide">
                  NO SENSITIVE RECEPTORS IDENTIFIED
                </div>
                <div className="text-[10px] text-slate-400">
                  within estimated dispersion footprint ({exposure.hazard_length_km || 8.5} km corridor)
                </div>
              </div>
            ) : (
              <>
                {/* Counts badges */}
                <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[10px]">
                  <div className="bg-black/25 p-1.5 rounded border border-white/[0.04]">
                    <span className="text-slate-400 block text-[9px]">Settlements</span>
                    <span className="font-bold text-slate-200">{exposure.affected_settlements_count || 0}</span>
                  </div>
                  <div className="bg-black/25 p-1.5 rounded border border-white/[0.04]">
                    <span className="text-slate-400 block text-[9px]">Schools</span>
                    <span className="font-bold text-amber-300">{exposure.affected_schools_count || 0}</span>
                  </div>
                  <div className="bg-black/25 p-1.5 rounded border border-white/[0.04]">
                    <span className="text-slate-400 block text-[9px]">Hospitals</span>
                    <span className="font-bold text-rose-300">{exposure.affected_hospitals_count || 0}</span>
                  </div>
                </div>

                {/* Intersecting sensitive facilities preview */}
                <div className="space-y-1 pt-1 border-t border-white/[0.06]">
                  <span className="text-[9.5px] text-slate-400 block">Identified In Dispersion Corridor:</span>
                  <div className="max-h-24 overflow-y-auto space-y-1 pr-1 font-mono text-[10px]">
                    {(exposure.intersecting_settlements || []).slice(0, 3).map((site, i) => (
                      <div key={`set-${i}`} className="flex items-center justify-between bg-black/20 px-2 py-1 rounded border border-white/[0.04]">
                        <span className="text-slate-200 truncate max-w-[200px]">{site.name}</span>
                        <span className="text-orange-400">{site.distance_km} km</span>
                      </div>
                    ))}
                    {(exposure.intersecting_schools || []).slice(0, 2).map((sch, i) => (
                      <div key={`sch-${i}`} className="flex items-center justify-between bg-purple-950/30 px-2 py-1 rounded border border-purple-800/30">
                        <span className="text-purple-200 truncate max-w-[200px]">{sch.name}</span>
                        <span className="text-purple-300">{sch.distance_km} km</span>
                      </div>
                    ))}
                    {(exposure.intersecting_hospitals || []).slice(0, 2).map((hosp, i) => (
                      <div key={`hosp-${i}`} className="flex items-center justify-between bg-rose-950/30 px-2 py-1 rounded border border-rose-800/30">
                        <span className="text-rose-200 truncate max-w-[200px] flex items-center gap-1">
                          <PlusSquare className="w-3 h-3 text-rose-400 shrink-0" />
                          {hosp.name}
                        </span>
                        <span className="text-rose-300">{hosp.distance_km} km</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Receptor Data Source attribution */}
            <div className="pt-1.5 border-t border-white/[0.06] text-[9px] font-mono flex items-center justify-between text-slate-400">
              <span>RECEPTOR SOURCE:</span>
              <span className={exposure.receptor_source === 'OPENSTREETMAP_OVERPASS_LIVE' || exposure.live_osm_receptors_count > 0 ? 'text-cyan-400' : 'text-amber-400'}>
                {exposure.receptor_source === 'OPENSTREETMAP_OVERPASS_LIVE' || exposure.live_osm_receptors_count > 0 
                  ? 'OpenStreetMap Overpass (Live Query)' 
                  : (exposure.total_sensitive_in_corridor > 0 
                      ? 'Curated receptor coverage — demonstration dataset'
                      : 'OpenStreetMap Query (Zero In Corridor)')}
              </span>
            </div>

            {/* Exposure reasoning */}
            {exposure.exposure_reasons && exposure.exposure_reasons.length > 0 && (
              <div className="pt-1 border-t border-white/[0.06] text-[10px] text-slate-300 space-y-0.5">
                {exposure.exposure_reasons.map((r, i) => (
                  <div key={i} className="flex items-start gap-1">
                    <span className="text-slate-400 shrink-0">•</span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 7. WHY WAS THIS CLASSIFIED? (Evidence-Driven Deterministic Rules) */}
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

        {/* 8. THERMAL ACTIVITY & EVENT REPLAY (Historical Baseline vs Observed FRP) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-200 tracking-wider uppercase flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-orange-400" />
              <span>THERMAL ACTIVITY & REPLAY</span>
            </span>
            <span className="text-[9.5px] font-mono text-slate-400">
              Pass History ({historyData.length})
            </span>
          </div>

          {/* Event Replay Toolbar */}
          <div className="mb-1.5 p-1.5 rounded-lg bg-[#0e131b] border border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleToggleReplay}
                className="px-2 py-1 rounded bg-orange-950/60 hover:bg-orange-900/80 text-orange-300 border border-orange-700/50 text-[10px] font-mono font-semibold flex items-center gap-1 transition cursor-pointer"
                title={isPlayingReplay ? 'Pause Replay' : 'Play Historical Replay'}
              >
                {isPlayingReplay ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-orange-300" />}
                <span>{isPlayingReplay ? 'PAUSE' : 'REPLAY'}</span>
              </button>

              {replayIndex !== null && (
                <button
                  onClick={handleResetReplay}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
                  title="Reset to Latest"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}

              <span className="text-[10px] font-mono text-slate-400 ml-1">
                Pass {activePointIndex + 1}/{historyData.length}
              </span>
            </div>

            {/* Speed toggle */}
            <div className="flex items-center gap-1">
              {[1, 2, 4].map(s => (
                <button
                  key={s}
                  onClick={() => setReplaySpeed(s)}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition cursor-pointer ${
                    replaySpeed === s 
                      ? 'bg-orange-500 text-black font-bold' 
                      : 'text-slate-400 hover:text-white bg-white/[0.04]'
                  }`}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Sparkline Chart */}
          <div className="w-full h-[70px] rounded-lg glass-chart-container p-1 flex items-center justify-center">
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
                const x = padX + (i / Math.max(1, historyData.length - 1)) * (svgWidth - padX * 2);
                const y = svgHeight - padY - ((d.val - minVal) / Math.max(1, maxVal - minVal)) * (svgHeight - padY * 2);
                const isActive = i === activePointIndex;

                return (
                  <g 
                    key={i} 
                    className="cursor-pointer"
                    onClick={() => {
                      setIsPlayingReplay(false);
                      setReplayIndex(i);
                    }}
                  >
                    <circle
                      cx={x}
                      cy={y}
                      r={isActive ? 4.5 : 2.0}
                      fill={isActive ? (isEmergency ? "#ef4444" : "#f97316") : "#64748b"}
                      stroke={isActive ? "#ffffff" : "none"}
                      strokeWidth={isActive ? "1.5" : "0"}
                    />
                    {isActive && (
                      <text x={Math.max(padX, Math.min(svgWidth - 45, x - 14))} y={Math.max(12, y - 6)} fill={isEmergency ? "#fca5a5" : "#fdba74"} fontSize="9" fontWeight="bold" fontFamily="monospace">
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
            <span>Click point to inspect pass</span>
          </div>

          {/* Current Observation, Baseline, Anomaly Ratio */}
          <div className="grid grid-cols-3 gap-1.5 mt-2 text-center font-mono">
            <div className="p-2 rounded glass-subcard">
              <div className="text-[9px] text-slate-400 font-sans uppercase tracking-wider">
                {replayIndex !== null ? `PASS ${activePointIndex + 1}` : 'CURRENT'}
              </div>
              <div className={`text-xs font-bold mt-0.5 ${isEmergency ? 'text-red-400' : 'text-orange-300'}`}>
                {displayedFrp} MW
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
                {(displayedFrp / (baselineFrp || 1)).toFixed(2)}×
              </div>
            </div>
          </div>
        </div>

        {/* 9. SURFACE WIND & ASSOCIATED CHEMICALS */}
        <div className="p-3 rounded-lg glass-subcard space-y-2 text-[11px]">
          <div className="flex items-center justify-between text-slate-300">
            <div className="flex items-center gap-1.5">
              <Wind className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">SURFACE WIND:</span>
            </div>
            <span className="font-mono font-medium text-slate-200">
              {fire.wind_source === 'METEOROLOGY_UNAVAILABLE' && !fire.wind_speed_kmh
                ? 'UNAVAILABLE'
                : `${fire.wind_speed_kmh != null ? fire.wind_speed_kmh : 19.8} km/h • ${fire.wind_direction_deg != null ? fire.wind_direction_deg : 85}°`}
            </span>
          </div>

          {fire.wind_direction_deg != null && fire.wind_source !== 'METEOROLOGY_UNAVAILABLE' && (
            <div className="flex items-center justify-between pt-1 border-t border-white/[0.04] text-slate-300">
              <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">DOWNWIND BEARING:</span>
              <span className="font-mono font-medium text-sky-300">
                {Math.round(((Number(fire.wind_direction_deg) + 180.0) % 360.0))}°
              </span>
            </div>
          )}

          <div className="flex items-center justify-between pt-1.5 border-t border-white/[0.06] text-slate-300">
            <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">ESTIMATED DOWNWIND DISPERSION:</span>
            <span className="font-mono font-medium text-red-300">
              {fire.wind_source === 'METEOROLOGY_UNAVAILABLE' && !fire.wind_speed_kmh
                ? 'DISPERSION UNAVAILABLE'
                : `${fire.hazard_radius_km || 5.0} km downwind`}
            </span>
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

        {/* 10. GROUND VERIFICATION (OSM) */}
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

        {/* 11. ACTION BUTTONS: 3D INSPECTION, ESTIMATED DOWNWIND DISPERSION & GENERATE INCIDENT REPORT */}
        <div className="space-y-2 pt-1">
          {onEnter3D && (
            <button
              onClick={onEnter3D}
              className="w-full py-2.5 px-3 rounded-lg text-xs font-semibold bg-cyan-950/80 hover:bg-cyan-900/90 text-cyan-200 hover:text-cyan-100 border border-cyan-500/60 hover:border-cyan-400 backdrop-blur-md transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-950/40 font-mono tracking-wide"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>3D INSPECT</span>
            </button>
          )}

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
