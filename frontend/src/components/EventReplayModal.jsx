import React, { useState, useEffect } from 'react';
import { X, Play, Pause, RotateCcw, FastForward, Satellite, Flame, Clock, Compass } from 'lucide-react';

export default function EventReplayModal({ event, onClose }) {
  if (!event) return null;

  const history = (event.history && event.history.length > 0)
    ? event.history
    : [
        {
          time: event.first_detected || event.acq_time || "08:12 UTC",
          frp: event.frp || 40.0,
          brightness: event.brightness || 340.0,
          satellite_short: event.satellites_display || "SNPP",
          satellite: "VIIRS_SNPP"
        }
      ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1); // 1x, 2x, 4x

  useEffect(() => {
    let timer;
    if (isPlaying) {
      const intervalMs = Math.max(400, 1600 / speed);
      timer = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= history.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    }
    return () => clearInterval(timer);
  }, [isPlaying, speed, history.length]);

  const currentObs = history[currentIndex] || history[0];
  const progressPct = ((currentIndex + 1) / history.length) * 100;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[2500] flex items-center justify-center p-4">
      <div className="bg-[#0b0f17] border border-white/[0.12] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden font-sans text-slate-100 flex flex-col">
        {/* Header */}
        <div className="p-4 bg-[#101622] border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
            <div>
              <h3 className="text-xs font-bold font-mono text-slate-100 tracking-wider">
                TEMPORAL SATELLITE PASS REPLAY
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">
                {event.fire_id} • {event.location?.district || 'Sector'}, {event.location?.state || 'India'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10.5px] font-mono text-slate-400">
              <span>Pass {currentIndex + 1} of {history.length}</span>
              <span className="text-sky-300 font-semibold">{currentObs.time}</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-orange-500 to-red-500 h-full transition-all duration-300 rounded-full"
                style={{ width: `${progressPct}%` }}
              ></div>
            </div>
          </div>

          {/* Current Observation Card */}
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Satellite className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold font-mono text-white">
                  {currentObs.satellite_short || currentObs.satellite || 'VIIRS'}
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-sky-950/60 text-sky-300 border border-sky-700/40">
                  NASA 375m
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                <span>{currentObs.time}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center font-mono">
              <div className="p-3 rounded-lg bg-black/40 border border-white/[0.05]">
                <div className="text-[10px] text-slate-400 font-sans uppercase">FIRE RADIATIVE POWER</div>
                <div className="text-xl font-bold text-orange-400 mt-1 flex items-center justify-center gap-1">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span>{currentObs.frp} MW</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-black/40 border border-white/[0.05]">
                <div className="text-[10px] text-slate-400 font-sans uppercase">BRIGHTNESS TEMP</div>
                <div className="text-xl font-bold text-slate-200 mt-1">
                  {currentObs.brightness} K
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center text-[11px] text-slate-300 pt-1 border-t border-white/[0.05]">
              <span className="text-slate-400">Baseline Comparison:</span>
              <span className="font-mono font-semibold text-orange-300">
                {event.baseline_frp_mw ? `${(currentObs.frp / event.baseline_frp_mw).toFixed(2)}× Normal` : 'N/A'}
              </span>
            </div>
          </div>

          {/* Timeline points breakdown */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">
              MULTI-PASS CHRONOLOGY
            </span>
            <div className="grid grid-cols-4 gap-1.5 text-center font-mono">
              {history.map((obs, idx) => {
                const active = idx === currentIndex;
                const past = idx < currentIndex;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setIsPlaying(false);
                    }}
                    className={`p-1.5 rounded-lg border text-[10px] transition-all cursor-pointer ${
                      active
                        ? 'bg-orange-500/20 border-orange-500 text-orange-300 font-bold shadow-md'
                        : past
                        ? 'bg-white/[0.04] border-white/[0.08] text-slate-300'
                        : 'bg-black/20 border-white/[0.04] text-slate-500'
                    }`}
                  >
                    <div className="text-[9px] text-slate-400">{obs.satellite_short}</div>
                    <div className="font-bold">{obs.frp}M</div>
                    <div className="text-[8.5px] text-slate-400">{obs.time.replace(' UTC', '')}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Controls: Play/Pause, Rewind, Speeds */}
          <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (currentIndex >= history.length - 1) {
                    setCurrentIndex(0);
                  }
                  setIsPlaying(!isPlaying);
                }}
                className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md transition-colors"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
              </button>

              <button
                onClick={() => {
                  setCurrentIndex(0);
                  setIsPlaying(false);
                }}
                className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white cursor-pointer transition-colors"
                title="Rewind to start"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Speeds */}
            <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-lg border border-white/[0.06]">
              {[1, 2, 4].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2 py-0.5 rounded text-[10.5px] font-mono cursor-pointer transition-all ${
                    speed === s
                      ? 'bg-white/[0.15] text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
