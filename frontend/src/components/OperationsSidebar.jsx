import React, { useState, useMemo } from 'react';
import { Search, ArrowUpDown, Loader2 } from 'lucide-react';

function getDisplayClassification(fire) {
  if (fire.is_emergency || fire.category === 'CRITICAL_INDUSTRIAL_EMERGENCY') {
    return 'INDUSTRIAL FIRE';
  }
  if (fire.category === 'PERSISTENT_INDUSTRIAL_FLARE') {
    return 'PERSISTENT SOURCE';
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
  const industrialCount = fires.filter(f => f.is_industrial).length;

  return (
    <aside className="w-[310px] h-full bg-[#0b0f16] border-r border-white/[0.06] flex flex-col shrink-0 z-20 select-none font-sans">
      {/* 1. Top Summary Information Header */}
      <div className="p-3.5 border-b border-white/[0.06] bg-[#0d121b]">
        <div className="flex items-center justify-between mb-3 text-xs">
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
            {processedFires.length} shown
          </span>
        </div>

        {/* Filter Tabs: ALL, INDUSTRIAL, CRITICAL */}
        <div className="grid grid-cols-3 p-0.5 rounded-lg bg-[#121822] border border-white/[0.05] text-[11px] font-medium">
          <button
            onClick={() => setFilterMode('all')}
            className={`py-1.5 px-2 rounded-md transition-all text-center cursor-pointer ${
              filterMode === 'all'
                ? 'bg-[#1c2432] text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ALL ({fires.length})
          </button>
          <button
            onClick={() => setFilterMode('industrial')}
            className={`py-1.5 px-2 rounded-md transition-all text-center cursor-pointer ${
              filterMode === 'industrial'
                ? 'bg-[#1c2432] text-orange-300 shadow-sm font-semibold'
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
            CRITICAL
          </button>
        </div>

        {/* Search & Sort Controls */}
        <div className="mt-2.5 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search location or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 rounded-md bg-[#121822] border border-white/[0.06] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-500"
            />
          </div>

          <div className="relative shrink-0">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-[#121822] border border-white/[0.06] text-[11px] text-slate-300 pl-2.5 pr-6 py-1 rounded-md focus:outline-none focus:border-slate-500 cursor-pointer"
            >
              <option value="frp">Max FRP</option>
              <option value="threat">Severity</option>
            </select>
            <ArrowUpDown className="w-3 h-3 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 2. Scrollable Incident Feed */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
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
            const timeLabel = fire.acq_time ? `${fire.acq_time} UTC` : '11:00 IST';

            return (
              <div
                key={fire.fire_id}
                onClick={() => onSelectFire(fire)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? isEmergency
                      ? 'bg-[#1a1215] border-l-[3px] border-l-red-500 border-white/[0.15] shadow-md'
                      : 'bg-[#151c27] border-l-[3px] border-l-orange-500 border-white/[0.15] shadow-md'
                    : 'bg-[#0f141d] border-l-[3px] border-l-transparent border-white/[0.04] hover:bg-[#131823] hover:border-white/[0.08]'
                }`}
              >
                {/* 1. Location (Top Priority) */}
                <div className="text-[12px] font-bold text-slate-100 tracking-wide truncate mb-1">
                  {locationLabel}
                </div>

                {/* 2. Classification & Severity */}
                <div className="flex items-center justify-between text-[11px] mb-2">
                  <span className="text-slate-300 font-medium tracking-wide">
                    {classificationLabel}
                  </span>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                    isEmergency ? 'text-red-400' : 'text-slate-400'
                  }`}>
                    {fire.threat_level || (isEmergency ? 'CRITICAL' : 'EVALUATED')}
                  </span>
                </div>

                {/* 3. FRP & Timestamp */}
                <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                  <div className="flex items-baseline gap-1.5">
                    <span className={`font-mono font-bold text-[13px] ${
                      isEmergency ? 'text-red-400' : 'text-orange-400'
                    }`}>
                      {fire.frp} MW
                    </span>
                    {fire.anomaly_ratio && fire.anomaly_ratio > 1.2 && (
                      <span className="text-[10px] font-mono text-slate-400">
                        ({fire.anomaly_ratio}× baseline)
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] font-mono text-slate-400">
                    {timeLabel}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 3. Bottom Minimal Status */}
      <div className="px-3 py-2 bg-[#090d14] border-t border-white/[0.06] text-[10px] flex items-center justify-between text-slate-500 font-mono">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
          <span>STREAM: {isLive ? 'VIIRS NRT LIVE' : 'CALIBRATED BACKUP'}</span>
        </div>
        <span>{fires.length} ACTIVE HOTSPOTS</span>
      </div>
    </aside>
  );
}
