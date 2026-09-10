import React, { useState, useMemo } from 'react';
import { Search, ArrowUpDown, Loader2 } from 'lucide-react';

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
  loading
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('frp'); // 'frp' | 'threat'

  const processedFires = useMemo(() => {
    let list = [...fires];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(f =>
        f.fire_id.toLowerCase().includes(q) ||
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

  const emergencyCount = fires.filter(f => f.is_emergency).length;

  return (
    <aside className="absolute top-3 left-3 bottom-3 w-[320px] max-h-[calc(100vh-5.5rem)] rounded-xl shadow-2xl z-[1000] flex flex-col font-sans select-none overflow-hidden glass-panel text-slate-100">
      {/* 1. Header: Events, Critical Counts & Filter Tabs */}
      <div className="p-3 glass-panel-header shrink-0">
        <div className="flex items-center justify-between mb-2.5 text-xs">
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
        <div className="grid grid-cols-3 p-0.5 rounded-lg bg-[#111622]/60 backdrop-blur-sm border border-white/[0.05] text-[11px] font-medium">
          <button
            onClick={() => setFilterMode('all')}
            className={`py-1.5 px-2 rounded-md transition-all text-center cursor-pointer ${
              filterMode === 'all'
                ? 'bg-white/[0.08] text-white shadow-sm font-semibold border border-white/[0.09]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ALL
          </button>
          <button
            onClick={() => setFilterMode('industrial')}
            className={`py-1.5 px-2 rounded-md transition-all text-center cursor-pointer ${
              filterMode === 'industrial'
                ? 'bg-white/[0.08] text-orange-300 shadow-sm font-semibold border border-white/[0.09]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            INDUSTRIAL
          </button>
          <button
            onClick={() => setFilterMode('emergencies')}
            className={`py-1.5 px-2 rounded-md transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 ${
              filterMode === 'emergencies'
                ? 'bg-red-950/70 text-red-300 shadow-sm font-semibold border border-red-800/40'
                : 'text-slate-400 hover:text-red-300'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            CRITICAL ({emergencyCount})
          </button>
        </div>

        {/* Search & Sort Controls */}
        <div className="mt-2.5 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ID, facility, district..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 rounded-md bg-[#111622]/60 backdrop-blur-sm border border-white/[0.07] text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-white/20 transition-colors"
            />
          </div>

          <div className="relative shrink-0">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-[#111622]/60 backdrop-blur-sm border border-white/[0.07] text-[11px] text-slate-300 pl-2.5 pr-6 py-1 rounded-md focus:outline-none focus:border-white/20 cursor-pointer transition-colors"
            >
              <option value="frp">Max FRP</option>
              <option value="threat">Severity</option>
            </select>
            <ArrowUpDown className="w-3 h-3 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 2. Scrollable Incident Feed */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {loading ? (
          <div className="py-14 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
            <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
            <span>Loading satellite thermal points...</span>
          </div>
        ) : processedFires.length === 0 ? (
          <div className="py-14 text-center text-xs text-slate-500">
            No thermal observations match criteria.
          </div>
        ) : (
          processedFires.map((fire) => {
            const isSelected = selectedFire?.fire_id === fire.fire_id;
            const isEmergency = fire.is_emergency;
            const locationLabel = getDisplayLocation(fire);
            const classificationLabel = getDisplayClassification(fire);
            const timeLabel = fire.acq_time ? (fire.acq_time.includes(':') ? fire.acq_time : `${fire.acq_time} UTC`) : '09:15 UTC';
            const frpColorClass = getFrpColorClass(fire);

            return (
              <div
                key={fire.fire_id}
                onClick={() => onSelectFire(fire)}
                className={`p-3 rounded-lg cursor-pointer incident-card-translucent ${
                  isSelected ? 'is-selected' : ''
                } ${isEmergency ? 'is-critical' : ''}`}
              >
                {/* 1. Location (Primary) & Incident ID */}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="text-[12px] font-bold text-slate-100 tracking-wide leading-tight truncate">
                    {locationLabel}
                  </div>
                  <span className="font-mono text-[10px] text-slate-400 shrink-0 font-medium">
                    {fire.fire_id}
                  </span>
                </div>

                {/* 2. Classification & Severity */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-medium text-slate-300 tracking-wide truncate">
                    {classificationLabel}
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                    isEmergency ? 'text-red-400' : 'text-slate-400'
                  }`}>
                    {fire.threat_level || (isEmergency ? 'CRITICAL' : 'EVALUATED')}
                  </span>
                </div>

                {/* 3. FRP, Anomaly / Baseline Ratio, VIIRS & Time */}
                <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] text-[10.5px] font-mono">
                  <div className="flex items-baseline gap-1.5">
                    <span className={`font-bold text-[12px] ${frpColorClass}`}>
                      {fire.frp} MW
                    </span>
                    <span className="text-slate-400 text-[10px]">
                      • {fire.anomaly_ratio ? `${fire.anomaly_ratio}× BASELINE` : '1.0× BASELINE'}
                    </span>
                  </div>

                  <div className="text-slate-400 text-[10px] shrink-0">
                    <span>VIIRS • {timeLabel}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 3. Bottom Minimal Status Bar */}
      <div className="px-3 py-2 glass-panel-footer text-[10px] flex items-center justify-between text-slate-400 font-mono shrink-0">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
          <span>STREAM: {isLive ? 'NASA VIIRS LIVE' : 'CALIBRATED BACKUP'}</span>
        </div>
        <span>{fires.length} HOTSPOTS</span>
      </div>
    </aside>
  );
}
