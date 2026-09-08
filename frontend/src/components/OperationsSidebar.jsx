import React, { useState, useMemo } from 'react';
import { Flame, ShieldAlert, Search, Filter, AlertTriangle, ArrowUpDown, ChevronRight, Activity } from 'lucide-react';

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
    <aside className="w-[380px] h-full bg-[#080c14] border-r border-slate-800/80 flex flex-col shrink-0 z-20 select-none">
      {/* 1. Header & AI Noise Filter Control */}
      <div className="p-3.5 border-b border-slate-800/80 bg-slate-950/60">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-300">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI NOISE FILTER CONTROLLER</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Showing <strong className="text-slate-200">{processedFires.length}</strong> / {fires.length}
          </span>
        </div>

        {/* Segmented Pill Buttons */}
        <div className="grid grid-cols-3 p-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
          <button
            onClick={() => setFilterMode('all')}
            className={`py-1.5 px-2 rounded-md transition-all text-center ${
              filterMode === 'all'
                ? 'bg-slate-800 text-cyan-300 font-semibold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Hotspots
          </button>
          <button
            onClick={() => setFilterMode('industrial')}
            className={`py-1.5 px-2 rounded-md transition-all text-center ${
              filterMode === 'industrial'
                ? 'bg-amber-950/80 text-amber-300 font-semibold border border-amber-800/50 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Industrial
          </button>
          <button
            onClick={() => setFilterMode('emergencies')}
            className={`py-1.5 px-2 rounded-md transition-all text-center flex items-center justify-center gap-1 ${
              filterMode === 'emergencies'
                ? 'bg-red-950 text-red-300 font-bold border border-red-700/60 shadow'
                : 'text-red-400/80 hover:text-red-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            🚨 Alert ({emergencyCount})
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
              className="w-full pl-8 pr-2.5 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 font-mono"
            />
          </div>

          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 pl-2 pr-6 py-1.5 rounded-md focus:outline-none focus:border-cyan-500/60 cursor-pointer"
            >
              <option value="frp">Sort: Max FRP</option>
              <option value="threat">Sort: Threat</option>
            </select>
            <ArrowUpDown className="w-3 h-3 text-slate-500 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 2. Scrollable Incident Feed */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {loading ? (
          <div className="py-12 text-center text-xs font-mono text-slate-500 flex flex-col items-center gap-2">
            <Activity className="w-6 h-6 text-cyan-400 animate-spin" />
            <span>Scanning Satellite Ingestion Stream...</span>
          </div>
        ) : processedFires.length === 0 ? (
          <div className="py-12 text-center text-xs font-mono text-slate-500">
            No thermal anomalies match criteria.
          </div>
        ) : (
          processedFires.map((fire) => {
            const isSelected = selectedFire?.fire_id === fire.fire_id;
            const isEmergency = fire.is_emergency;
            const isIndustrial = fire.is_industrial;

            return (
              <div
                key={fire.fire_id}
                onClick={() => onSelectFire(fire)}
                className={`group p-3 rounded-lg border cursor-pointer transition-all ${
                  isEmergency
                    ? isSelected
                      ? 'bg-red-950/60 border-red-500 shadow-lg shadow-red-500/25 ring-1 ring-red-400'
                      : 'bg-red-950/30 border-red-700/50 hover:border-red-500 hover:bg-red-950/40 shadow-sm'
                    : isSelected
                    ? 'bg-slate-800/90 border-cyan-500 shadow-md ring-1 ring-cyan-500/50'
                    : 'bg-slate-900/80 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/50'
                }`}
              >
                {/* Top Row: Threat Badge & FRP */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: fire.threat_color || '#64748b' }}
                    ></span>
                    <span className="text-[11px] font-mono font-bold tracking-tight text-slate-200 truncate">
                      {fire.fire_id}
                    </span>
                    {isEmergency && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-extrabold uppercase bg-red-600 text-white animate-pulse">
                        EMERGENCY
                      </span>
                    )}
                  </div>

                  {/* FRP MW Chip */}
                  <div className={`px-2 py-0.5 rounded text-xs font-mono font-bold shrink-0 ${
                    isEmergency ? 'bg-red-900/80 text-red-200' : 'bg-slate-800 text-amber-300'
                  }`}>
                    {fire.frp} MW
                  </div>
                </div>

                {/* Middle Row: Exact Location Name */}
                <div className="text-xs font-semibold text-slate-200 truncate mb-0.5">
                  {fire.location?.district ? `${fire.location.district}, ${fire.location.state}` : (fire.facility_name || fire.site_hint || 'Rural Sector, India')}
                </div>

                {/* Formatted Coordinates & Satellite Sensor */}
                <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400/90 mb-1">
                  <span>{fire.location?.formatted_coords || `${fire.latitude?.toFixed(4)}° N, ${fire.longitude?.toFixed(4)}° E`}</span>
                  <span className="text-slate-400">VIIRS {fire.instrument || '375m'}</span>
                </div>

                {/* AI Cause Attribution & Certainty */}
                <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-slate-800/60 text-slate-400">
                  <span className="truncate max-w-[210px] text-slate-300">
                    {fire.cause_analysis?.cause_title || fire.sub_category || fire.category}
                  </span>
                  <span className="text-emerald-400 font-bold shrink-0">
                    {fire.cause_analysis?.certainty_pct || 90}% AI
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 3. Bottom Status Bar */}
      <div className="p-2.5 bg-slate-950 border-t border-slate-800/80 text-[10px] font-mono flex items-center justify-between text-slate-400">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>NASA VIIRS: <strong>ONLINE</strong></span>
        </div>
        <div className="text-slate-400">
          BACKEND: <span className={isLive ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
            {isLive ? '200 OK' : 'CALIBRATED'}
          </span>
        </div>
      </div>
    </aside>
  );
}
