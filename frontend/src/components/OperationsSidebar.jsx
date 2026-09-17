import React, { useState, useMemo } from 'react';
import { Search, ArrowUpDown, Loader2, AlertTriangle, TrendingUp, TrendingDown, Minus, ShieldAlert } from 'lucide-react';

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

function getFrpColorClass(fire) {
  if (fire.is_emergency || fire.category === 'CRITICAL_INDUSTRIAL_EMERGENCY') {
    return 'text-red-400';
  }
  if (fire.category === 'COAL_MINING_FIRE') {
    return 'text-amber-400';
  }
  if (fire.category === 'AGRICULTURAL_STUBBLE' || fire.category === 'FOREST_FIRE') {
    return 'text-emerald-400';
  }
  return 'text-orange-400';
}

export default function OperationsSidebar({
  fires,
  filterMode,
  setFilterMode,
  selectedFire,
  onSelectFire,
  isLive,
  loading,
  is3DActive = false
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('frp'); // 'frp' | 'threat'

  // Critical emergencies for the dedicated top inbox
  const criticalInboxEvents = useMemo(() => {
    return fires.filter(f => f.is_emergency || f.threat_level === 'CRITICAL' || f.exposure_risk_level === 'CRITICAL');
  }, [fires]);

  const processedFires = useMemo(() => {
    let list = [...fires];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(f =>
        f.fire_id.toLowerCase().includes(q) ||
        (f.event_id && f.event_id.toLowerCase().includes(q)) ||
        (f.facility_name && f.facility_name.toLowerCase().includes(q)) ||
        (f.site_hint && f.site_hint.toLowerCase().includes(q)) ||
        (f.location?.district && f.location.district.toLowerCase().includes(q)) ||
        f.category.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      if (sortBy === 'frp') {
        return (b.frp || 0) - (a.frp || 0);
      }
      return (b.threat_score || 0) - (a.threat_score || 0);
    });

    return list;
  }, [fires, searchQuery, sortBy]);

  const [displayLimit, setDisplayLimit] = useState(75);

  // Reset display limit when query or filter changes
  React.useEffect(() => {
    setDisplayLimit(75);
  }, [searchQuery, filterMode, sortBy]);

  const visibleFires = useMemo(() => {
    return processedFires.slice(0, displayLimit);
  }, [processedFires, displayLimit]);

  const emergencyCount = criticalInboxEvents.length;

  return (
    <aside className={`absolute top-3 left-3 bottom-3 ${is3DActive ? 'w-[270px]' : 'w-[335px]'} max-h-[calc(100vh-5.5rem)] rounded-xl shadow-2xl z-[1000] flex flex-col font-sans select-none overflow-hidden glass-panel text-slate-100 transition-all duration-150`}>
      {/* 1. Dedicated Critical Events Inbox Header */}
      {criticalInboxEvents.length > 0 && (
        <div className={`${is3DActive ? 'p-2' : 'p-2.5'} bg-red-950/40 border-b border-red-500/20 shrink-0`}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-red-400 animate-pulse" />
              <span className={`${is3DActive ? 'text-[9.5px]' : 'text-[10.5px]'} font-mono font-bold tracking-wider text-red-300 uppercase`}>
                CRITICAL INBOX ({criticalInboxEvents.length})
              </span>
            </div>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-red-900/60 text-red-200 border border-red-700/40">
              URGENT
            </span>
          </div>

          <div className={`space-y-1.5 ${is3DActive ? 'max-h-[100px]' : 'max-h-[140px]'} overflow-y-auto pr-1`}>
            {criticalInboxEvents.map((item, idx) => {
              const isSelected = selectedFire?.fire_id === item.fire_id;
              const expRisk = item.exposure_risk_level || (item.community_exposure?.risk_level) || 'HIGH';
              return (
                <div
                  key={`${item.fire_id || item.event_id || 'inbox'}-${idx}`}
                  onClick={() => onSelectFire(item)}
                  className={`p-2 rounded-lg cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-red-900/60 border-red-400 shadow-md ring-1 ring-red-400/50'
                      : 'bg-black/40 hover:bg-red-950/40 border-red-800/40 text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-0.5">
                    <span className="font-mono font-bold text-red-300 truncate max-w-[170px]">
                      {item.event_id || item.fire_id}
                    </span>
                    <span className="font-mono font-bold text-orange-400">
                      {item.frp} MW
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-300 truncate mb-1">
                    {item.facility_name || item.location?.location_summary || `${item.location?.district || 'Jamnagar'}, India`}
                  </div>
                  <div className="flex items-center justify-between text-[9.5px] font-mono">
                    <span className="text-slate-400">
                      {item.anomaly_ratio ? `${item.anomaly_ratio}× Baseline` : 'Anomaly'}
                    </span>
                    <span className="px-1 py-0.2 rounded bg-red-950 text-red-300 border border-red-700 font-semibold">
                      EXPOSURE: {expRisk}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Filter & Controls Header */}
      <div className="p-3 glass-panel-header shrink-0">
        <div className="flex items-center justify-between mb-2 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400 tracking-wider">EVENTS</span>
              <span className="font-mono font-bold text-slate-100 text-sm">{fires.length}</span>
            </div>
            <span className="text-slate-700">•</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400 tracking-wider">CRITICAL</span>
              <span className={`font-mono font-bold text-sm ${emergencyCount > 0 ? 'text-red-400' : 'text-slate-300'}`}>
                {emergencyCount}
              </span>
            </div>
          </div>

          <span className="text-[10px] font-mono text-slate-400">
            {processedFires.length} / {fires.length}
          </span>
        </div>

        {/* Filter Tabs: ALL, INDUSTRIAL, CRITICAL */}
        <div className="grid grid-cols-3 p-0.5 rounded-lg bg-white/[0.03] backdrop-blur-md border border-white/[0.08] text-[11px] font-medium shadow-inner">
          <button
            onClick={() => setFilterMode('all')}
            className={`py-1.5 px-2 rounded-md transition-all text-center cursor-pointer ${
              filterMode === 'all'
                ? 'bg-white/[0.12] text-white shadow-sm font-semibold border border-white/[0.15]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ALL
          </button>
          <button
            onClick={() => setFilterMode('industrial')}
            className={`py-1.5 px-2 rounded-md transition-all text-center cursor-pointer ${
              filterMode === 'industrial'
                ? 'bg-white/[0.12] text-orange-300 shadow-sm font-semibold border border-white/[0.15]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            INDUSTRIAL
          </button>
          <button
            onClick={() => setFilterMode('emergencies')}
            className={`py-1.5 px-2 rounded-md transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 ${
              filterMode === 'emergencies'
                ? 'bg-red-950/80 text-red-200 shadow-sm font-semibold border border-red-700/50'
                : 'text-slate-400 hover:text-red-300'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
            CRITICAL ({emergencyCount})
          </button>
        </div>

        {/* Search & Sort Controls */}
        <div className="mt-2.5 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ID, facility, district..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 rounded-md bg-white/[0.04] backdrop-blur-md border border-white/[0.09] text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-white/30 focus:bg-white/[0.07] transition-all"
            />
          </div>

          <div className="relative shrink-0">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-white/[0.04] backdrop-blur-md border border-white/[0.09] text-[11px] text-slate-200 pl-2.5 pr-6 py-1 rounded-md focus:outline-none focus:border-white/30 focus:bg-white/[0.07] cursor-pointer transition-all"
            >
              <option value="frp" className="bg-[#0b1017] text-slate-200">Max FRP</option>
              <option value="threat" className="bg-[#0b1017] text-slate-200">Severity</option>
            </select>
            <ArrowUpDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 3. Scrollable Incident Feed */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {loading && fires.length === 0 ? (
          <div className="py-14 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
            <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
            <span>Synchronizing satellite thermal points...</span>
          </div>
        ) : processedFires.length === 0 ? (
          <div className="py-14 text-center text-xs text-slate-500">
            No thermal observations match criteria.
          </div>
        ) : (
          <>
            {loading && (
              <div className="px-2.5 py-1.5 mb-1.5 rounded-lg bg-sky-950/40 border border-sky-500/25 text-[10.5px] text-sky-300 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                  <span>Synchronizing live VIIRS feeds...</span>
                </div>
                <span className="text-[9px] font-mono text-sky-400 font-semibold px-1 py-0.2 rounded bg-sky-900/50">
                  SYNCING
                </span>
              </div>
            )}
            {visibleFires.map((fire, idx) => {
              const isSelected = selectedFire?.fire_id === fire.fire_id;
              const isEmergency = fire.is_emergency;
              const locationLabel = getDisplayLocation(fire);
              const classificationLabel = getDisplayClassification(fire);
              const timeLabel = fire.latest_detection || (fire.acq_time ? (fire.acq_time.includes(':') ? fire.acq_time : `${fire.acq_time} UTC`) : '09:15 UTC');
              const frpColorClass = getFrpColorClass(fire);
              const satDisplay = fire.satellites_display || 'SNPP + NOAA-21';
              const obsCount = fire.observation_count || fire.history?.length || 1;

              return (
                <div
                  key={`${fire.fire_id || fire.event_id || 'fire'}-${idx}`}
                  onClick={() => onSelectFire(fire)}
                  className={`${is3DActive ? 'p-2' : 'p-3'} rounded-lg cursor-pointer incident-card-translucent ${
                    isSelected ? 'is-selected' : ''
                  } ${isEmergency ? 'is-critical' : ''}`}
                >
                  {/* 1. Location & Event ID */}
                  <div className="flex items-start justify-between gap-1.5 mb-1">
                    <div className={`${is3DActive ? 'text-[11px]' : 'text-[12px]'} font-bold text-slate-100 tracking-wide leading-tight truncate`}>
                      {locationLabel}
                    </div>
                    <span className="font-mono text-[9.5px] text-slate-400 shrink-0 font-medium">
                      {fire.event_id || fire.fire_id}
                    </span>
                  </div>

                  {/* 2. Classification & Provenance Tag */}
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className={`${is3DActive ? 'text-[10px]' : 'text-[11px]'} font-medium text-slate-300 tracking-wide truncate`}>
                      {classificationLabel}
                    </span>
                    <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-white/[0.05] text-slate-300 border border-white/[0.08] shrink-0">
                      {satDisplay}
                    </span>
                  </div>

                  {/* 3. FRP, Baseline Ratio, Passes & Trend */}
                  <div className={`flex items-center justify-between pt-1.5 border-t border-white/[0.04] ${is3DActive ? 'text-[9.5px]' : 'text-[10.5px]'} font-mono`}>
                    <div className="flex items-baseline gap-1">
                      <span className={`font-bold ${is3DActive ? 'text-[11px]' : 'text-[12px]'} ${frpColorClass}`}>
                        {fire.frp} MW
                      </span>
                      <span className="text-slate-400 text-[9.5px]">
                        • {fire.anomaly_ratio ? `${fire.anomaly_ratio}×` : '1.0×'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-slate-400 text-[9.5px] shrink-0">
                      {fire.trend_direction === 'up' ? (
                        <TrendingUp className="w-2.5 h-2.5 text-red-400" />
                      ) : fire.trend_direction === 'down' ? (
                        <TrendingDown className="w-2.5 h-2.5 text-emerald-400" />
                      ) : (
                        <Minus className="w-2.5 h-2.5 text-slate-500" />
                      )}
                      <span>{obsCount}p</span>
                      <span className="text-slate-600">•</span>
                      <span>{timeLabel}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {processedFires.length > displayLimit && (
              <button
                onClick={() => setDisplayLimit(prev => prev + 75)}
                className="w-full py-2 mt-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono text-slate-300 hover:text-white transition-all text-center cursor-pointer"
              >
                Show More (+{processedFires.length - displayLimit} remaining)
              </button>
            )}
          </>
        )}
      </div>

      {/* 4. Bottom Status Bar */}
      <div className="px-3 py-2 glass-panel-footer text-[10px] flex items-center justify-between text-slate-400 font-mono shrink-0">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
          <span>NASA VIIRS MULTI-SATELLITE</span>
        </div>
        <span>{fires.length} HOTSPOTS</span>
      </div>
    </aside>
  );
}
