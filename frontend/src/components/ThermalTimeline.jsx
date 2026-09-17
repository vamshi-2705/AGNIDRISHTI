import React from 'react';
import { Clock, Play, Pause, RotateCcw } from 'lucide-react';

export default function ThermalTimeline({
  timeRange = 24,
  setTimeRange,
  scrubberHours,
  setScrubberHours,
  sliderValue,
  setSliderValue,
  isPlaying = false,
  setIsPlaying,
  totalEvents = 0,
  filteredCount = 0,
  is3DActive = false
}) {
  const ranges = [
    { id: '1h', num: 1, label: 'Last 1h' },
    { id: '3h', num: 3, label: 'Last 3h' },
    { id: '6h', num: 6, label: 'Last 6h' },
    { id: '12h', num: 12, label: 'Last 12h' },
    { id: '24h', num: 24, label: 'Last 24h' }
  ];

  // Safely normalize timeRange to both string label and numeric value
  const numericRange = typeof timeRange === 'number' 
    ? timeRange 
    : parseInt(String(timeRange || '24').replace(/\D/g, ''), 10) || 24;
  const stringRange = `${numericRange}h`.toUpperCase();

  // Handle active value (supports scrubberHours or sliderValue)
  const currentHours = typeof scrubberHours === 'number' 
    ? scrubberHours 
    : (typeof sliderValue === 'number' ? (sliderValue / 100) * numericRange : numericRange);

  const handleRangeSelect = (r) => {
    if (typeof setTimeRange === 'function') {
      if (typeof timeRange === 'string') {
        setTimeRange(r.id);
      } else {
        setTimeRange(r.num);
      }
    }
    if (typeof setScrubberHours === 'function') {
      setScrubberHours(r.num);
    }
    if (typeof setSliderValue === 'function') {
      setSliderValue(100);
    }
  };

  const handleSliderChange = (e) => {
    const val = parseFloat(e.target.value);
    if (typeof setScrubberHours === 'function') {
      setScrubberHours(val);
    }
    if (typeof setSliderValue === 'function') {
      setSliderValue(Math.round((val / numericRange) * 100));
    }
  };

  const handleReset = () => {
    if (typeof setScrubberHours === 'function') {
      setScrubberHours(numericRange);
    }
    if (typeof setSliderValue === 'function') {
      setSliderValue(100);
    }
  };

  return (
    <div className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] ${
      is3DActive
        ? 'w-auto min-w-[340px] max-w-md px-3 py-1.5 rounded-lg h-[58px] gap-1'
        : 'w-[90%] max-w-xl px-3.5 py-2 rounded-xl gap-1.5'
    } shadow-2xl glass-panel text-slate-100 font-sans select-none flex flex-col border border-white/[0.1] bg-[#090d14]/95 backdrop-blur-md transition-all`}>
      {/* Top line: Header & Range Buttons */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-orange-400" />
          <span className="font-bold text-[10.5px] tracking-wider uppercase text-slate-200 font-mono">
            {is3DActive ? 'INSPECTION TIMELINE' : 'THERMAL ACTIVITY TIMELINE'}
          </span>
          <span className="text-[9.5px] text-slate-400 font-mono">
            ({filteredCount}/{totalEvents})
          </span>
        </div>

        {/* Time range selector buttons */}
        <div className="flex items-center gap-1 bg-white/[0.04] p-0.5 rounded border border-white/[0.08]">
          {ranges.map((r) => {
            const isActive = (timeRange === r.id) || (timeRange === r.num) || (numericRange === r.num);
            return (
              <button
                key={r.id}
                onClick={() => handleRangeSelect(r)}
                className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r.id.toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom line: Interactive Timeline Scrubber Slider */}
      <div className="flex items-center gap-3">
        <span className="text-[9.5px] font-mono text-slate-400 shrink-0">
          -{stringRange}
        </span>

        <input
          type="range"
          min="0.5"
          max={numericRange}
          step="0.5"
          value={currentHours}
          onChange={handleSliderChange}
          className="w-full h-1 bg-white/[0.1] rounded-lg appearance-none cursor-pointer accent-orange-500"
          title={`Observation window: last ${currentHours}h of ${stringRange}`}
        />

        <span className="text-[9.5px] font-mono font-bold text-orange-400 shrink-0">
          {currentHours >= numericRange ? 'NOW (NRT)' : `T-${(numericRange - currentHours).toFixed(1)}h`}
        </span>

        {/* Play / Pause if provided */}
        {typeof setIsPlaying === 'function' && (
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            title={isPlaying ? "Pause timeline scrub" : "Auto-advance timeline"}
          >
            {isPlaying ? <Pause className="w-3 h-3 text-amber-400" /> : <Play className="w-3 h-3" />}
          </button>
        )}

        {currentHours < numericRange && (
          <button
            onClick={handleReset}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            title="Reset to latest"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
