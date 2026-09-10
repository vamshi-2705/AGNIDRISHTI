import React, { useState, useRef, useEffect } from 'react';
import { Play, Volume2, VolumeX, SkipForward, Film, AlertCircle } from 'lucide-react';

export default function IntroVideoPlayer({ onComplete }) {
  const videoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef(null);

  // Transition to landing page with smooth fade
  const handleTransition = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      if (onComplete) onComplete();
    }, 600);
  };

  // Keyboard controls: ESC or Space to skip
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.code === 'Space') {
        e.preventDefault();
        handleTransition();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Controls auto-hide on inactivity
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 2800);
  };

  // Video time tracking
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const curr = videoRef.current.currentTime;
      const dur = videoRef.current.duration || 1;
      setProgress((curr / dur) * 100);
      setDuration(dur);
    }
  };

  // Auto-play on mount
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn('[AGNIDRISHTI] Autoplay blocked or video missing:', err);
          setIsPlaying(false);
        });
    }
  }, []);

  const toggleSound = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  return (
    <div 
      onMouseMove={handleMouseMove}
      className={`fixed inset-0 z-[9999] bg-black text-white flex flex-col items-center justify-center select-none transition-opacity duration-700 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Video Element */}
      {!hasError ? (
        <video
          ref={videoRef}
          src="/videos/intro.mp4"
          autoPlay
          playsInline
          muted={isMuted}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleTransition}
          onError={() => setHasError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        /* Graceful Fallback if user hasn't added intro.mp4 yet */
        <div className="flex flex-col items-center justify-center p-8 max-w-lg text-center font-sans">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-6 text-orange-400">
            <Film className="w-8 h-8" />
          </div>

          <div className="text-xl font-bold tracking-wider text-white mb-2 uppercase">
            INTRO VIDEO PIPELINE READY
          </div>

          <p className="text-sm text-slate-400 leading-relaxed mb-6">
            Place your video file in the dedicated folder to play before the landing page opens:
          </p>

          <div className="w-full p-3 rounded-lg bg-[#0d131d] border border-white/[0.08] text-xs font-mono text-orange-300 select-all break-all mb-6">
            frontend/public/videos/intro.mp4
          </div>

          <button
            onClick={handleTransition}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold tracking-wide transition-colors cursor-pointer shadow-lg shadow-orange-600/20"
          >
            <span>CONTINUE TO LANDING PAGE</span>
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header Watermark & Skip Button */}
      <div 
        className={`absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-10 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Brand Watermark */}
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-black tracking-widest text-orange-500">AGNI</span>
          <span className="text-sm font-light tracking-[0.2em] text-white">DRISHTI</span>
          <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/[0.08] text-slate-400 border border-white/[0.06]">
            INTRO
          </span>
        </div>

        {/* Skip Button */}
        <button
          onClick={handleTransition}
          className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.12] hover:bg-white/[0.22] backdrop-blur-md border border-white/[0.15] text-xs font-semibold text-white tracking-wider transition-all duration-200 cursor-pointer shadow-lg"
          title="Skip to landing page (ESC or Space)"
        >
          <span>SKIP INTRO</span>
          <SkipForward className="w-3.5 h-3.5 text-slate-300 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Bottom Bar: Sound Toggle & Progress */}
      {!hasError && (
        <div 
          className={`absolute bottom-0 left-0 right-0 p-6 flex flex-col gap-3 z-10 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="flex items-center justify-between">
            {/* Audio Toggle */}
            <button
              onClick={toggleSound}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/50 hover:bg-black/80 backdrop-blur-md border border-white/[0.1] text-xs text-slate-200 transition-colors cursor-pointer"
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-4 h-4 text-orange-400" />
                  <span className="text-[11px] font-mono">CLICK TO UNMUTE</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-[11px] font-mono">SOUND ON</span>
                </>
              )}
            </button>

            <span className="text-[10px] font-mono text-slate-400">
              PRESS ESC OR SPACE TO SKIP
            </span>
          </div>

          {/* Video Progress Line */}
          <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-orange-500 transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
