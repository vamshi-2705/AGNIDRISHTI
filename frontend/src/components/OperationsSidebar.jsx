import React, { useState, useMemo } from 'react';
import { Search, Filter, ArrowUpDown, Activity } from 'lucide-react';

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

  // Filter & Sort fires based on user search and sort selection
  const processedFires = useMemo(() => {
    let list = [...fires];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(f =>
        f.fire_id.toLowerCase().includes(q) ||
        (f.facility_name && f.facility_name.toLowerCase().includes(q)) ||
        (f.site_hint && f.site_hint.toLowerCase().includes(q)) ||
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
    <aside className="w-[380px] h-full bg-[#0d1217] border-r border-white/[0.08] flex flex-col shrink-0 z-20 select-none font-sans">
      {/* 1. Header & Filter Control */}
      <div className="p-3.5 border-b border-white/[0.08] bg-[#10151c]">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5 text-xs font-sans font-semibold text-slate-200">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>THERMAL EVENTS</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Showing <strong className="text-slate-200">{processedFires.length}</strong> / {fires.length}
          </span>
        </div>

        {/* Filter Tabs: ALL, INDUSTRIAL, CRITICAL */}
        <div className="grid grid-cols-3 p-1 rounded-md bg-[#151b22] border border-white/[0.08] text-xs font-sans">
          <button
            onClick={() => setFilterMode('all')}
            className={`py-1.5 px-2 rounded transition-all text-center ${
              filterMode === 'all'
                ? 'bg-[#222c38] text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ALL
          </button>
          <button
            onClick={() => setFilterMode('industrial')}
            className={`py-1.5 px-2 rounded transition-all text-center ${
              filterMode === 'industrial'
                ? 'bg-[#222c38] text-orange-300 font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            INDUSTRIAL
          </button>
          <button
            onClick={() => setFilterMode('emergencies')}
            className={`py-1.5 px-2 rounded transition-all text-center flex items-center justify-center gap-1.5 ${
              filterMode === 'emergencies'
                ? 'bg-red-950/60 text-red-300 font-semibold border border-red-800/40 shadow-sm'
                : 'text-slate-400 hover:text-red-300'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            CRITICAL ({emergencyCount})
          </button>
        </div>

        {/* Search and Sort Row */}
        <div className="mt-2.5 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search facility, fire ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 rounded-md bg-[#151b22] border border-white/[0.08] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-500 font-sans"
            />
          </div>

          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-[#151b22] border border-white/[0.08] text-[11px] font-sans text-slate-300 pl-2 pr-6 py-1.5 rounded-md focus:outline-none focus:border-slate-500 cursor-pointer"
            >
              <option value="frp">Sort: Max FRP</option>
              <option value="threat">Sort: Severity</option>
            </select>
            <ArrowUpDown className="w-3 h-3 text-slate-500 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 2. Scrollable Incident Feed */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {loading ? (
          <div className="py-12 text-center text-xs font-sans text-slate-400 flex flex-col items-center gap-2">
            <Activity className="w-5 h-5 text-slate-400 animate-spin" />
            <span>Processing thermal observations...</span>
          </div>
        ) : processedFires.length === 0 ? (
          <div className="py-12 text-center text-xs font-sans text-slate-500">
            No thermal observations match criteria.
          </div>
        ) : (
          processedFires.map((fire) => {
            const isSelected = selectedFire?.fire_id === fire.fire_id;
            const isEmergency = fire.is_emergency;
            const isFlare = fire.category === 'PERSISTENT_INDUSTRIAL_FLARE';
            const isCoal = fire.category === 'COAL_MINING_FIRE';

            return (
              <div
                key={fire.fire_id}
                onClick={() => onSelectFire(fire)}
                className={`group p-2.5 rounded-md border cursor-pointer transition-all ${
                  isEmergency
                    ? isSelected
                      ? 'bg-[#181215] border-l-2 border-l-red-500 border-white/[0.15] shadow-sm'
                      : 'bg-[#131012] border-l-2 border-l-red-500/80 border-white/[0.05] hover:border-white/[0.1] hover:bg-[#181316]'
                    : isFlare
                    ? isSelected
                      ? 'bg-[#161b24] border-l-2 border-l-orange-500 border-white/[0.15] shadow-sm'
                      : 'bg-[#12161d] border-l-2 border-l-orange-500/70 border-white/[0.05] hover:border-white/[0.1] hover:bg-[#151a22]'
                    : isCoal
                    ? isSelected
                      ? 'bg-[#161a22] border-l-2 border-l-amber-500 border-white/[0.15] shadow-sm'
                      : 'bg-[#12151c] border-l-2 border-l-amber-500/70 border-white/[0.05] hover:border-white/[0.1] hover:bg-[#151920]'
                    : isSelected
                    ? 'bg-[#141b20] border-l-2 border-l-emerald-500 border-white/[0.15] shadow-sm'
                    : 'bg-[#11161d] border-l-2 border-l-emerald-500/60 border-white/[0.05] hover:border-white/[0.1] hover:bg-[#131920]'
                }`}
              >
                {/* LINE 1: Dot + ID (Left) & Severity Badge (Right) */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: fire.threat_color || (isEmergency ? '#ef4444' : '#f97316') }}
                    ></span>
                    <span className="text-[11px] font-mono font-semibold text-slate-200 truncate">
                      {fire.fire_id}
                    </span>
                  </div>

                  {isEmergency ? (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-sans font-bold uppercase bg-red-950/80 text-red-300 border border-red-800/60">
                      CRITICAL
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-sans font-medium uppercase bg-[#17202c] text-slate-400 border border-white/[0.05]">
                      {fire.threat_level || 'EVALUATED'}
                    </span>
                  )}
                </div>

                {/* LINE 2 & LINE 3: Location (Left) + FRP & Anomaly Ratio (Right) */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-100 truncate">
                      {fire.location?.district ? `${fire.location.district}, ${fire.location.state}` : (fire.facility_name || fire.site_hint || 'Rural Sector, India')}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5 font-sans">
                      {fire.cause_analysis?.cause_title || fire.sub_category || fire.category}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className={`text-xs font-bold font-mono ${isEmergency ? 'text-red-400' : 'text-orange-300'}`}>
                      {fire.frp} MW
                    </div>
                    <div className="text-[9.5px] font-mono font-semibold text-slate-300">
                      {fire.anomaly_ratio ? `${fire.anomaly_ratio}× BASELINE` : 'NOMINAL BASELINE'}
                    </div>
                  </div>
                </div>

                {/* LINE 4: Smaller Secondary Information (Sensor & Coordinates) */}
                <div className="flex items-center justify-between text-[9.5px] font-mono text-slate-400 pt-1 border-t border-white/[0.05]">
                  <span>VIIRS {fire.instrument || '375m'}</span>
                  <span>{fire.location?.formatted_coords || `${fire.latitude?.toFixed(3)}° N, ${fire.longitude?.toFixed(3)}° E`}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 3. Bottom Status Bar */}
      <div className="p-2.5 bg-[#10151c] border-t border-white/[0.08] text-[10px] font-sans flex items-center justify-between text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>DATA STREAM: <strong className="text-slate-300">ONLINE</strong></span>
        </div>
        <div className="font-mono">
          STATUS: <span className={isLive ? 'text-emerald-400 font-medium' : 'text-amber-400'}>
            {isLive ? 'LIVE' : 'BACKUP'}
          </span>
        </div>
      </div>
    </aside>
  );
}
