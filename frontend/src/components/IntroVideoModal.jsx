import React, { useState, useRef, useEffect } from 'react';
import { X, Film, Upload, RefreshCw, AlertCircle, Maximize, Minimize, CheckCircle2, Sparkles } from 'lucide-react';

export default function IntroVideoModal({ onClose }) {
  const [videoError, setVideoError] = useState(false);
  const [customVideoUrl, setCustomVideoUrl] = useState(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  // Auto-hide HUD controls after 3 seconds of mouse inactivity
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  // Keyboard shortcut listener (Esc to close, F to toggle native fullscreen, Space to play/pause)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          onClose();
        }
      } else if (e.key === 'f' || e.key === 'F') {
        toggleNativeFullscreen();
      } else if (e.key === ' ' && videoRef.current) {
        e.preventDefault();
        if (videoRef.current.paused) {
          videoRef.current.play();
        } else {
          videoRef.current.pause();
        }
      }
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Initial timeout to hide controls
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3500);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [onClose]);

  // Request or exit native browser fullscreen
  const toggleNativeFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch((err) => {
        console.warn('Native fullscreen request declined:', err);
      });
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const handleVideoError = () => {
    if (!customVideoUrl) {
      setVideoError(true);
    }
  };

  const handleVideoCanPlay = () => {
    setVideoError(false);
    setVideoLoaded(true);
    // Ensure highest playback quality and play
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay with audio might be blocked by browser policy until interaction
      });
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomVideoUrl(url);
      setVideoError(false);
      setVideoLoaded(false);
    }
  };

  const handleRetry = () => {
    setVideoError(false);
    setVideoLoaded(false);
    if (videoRef.current) {
      videoRef.current.load();
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="fixed inset-0 z-[4000] w-screen h-screen bg-black flex flex-col justify-center items-center overflow-hidden font-sans select-none cursor-default"
    >
      {/* 1. Cinematic Top HUD Overlay (Fades out when mouse is idle) */}
      <div
        className={`absolute top-0 inset-x-0 z-50 px-6 py-5 bg-gradient-to-b from-black/90 via-black/50 to-transparent flex items-center justify-between transition-opacity duration-500 ${
          showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Left: Branding & High-Def Spec */}
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 shadow-inner">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm md:text-base font-bold text-white tracking-wide font-mono">
                AGNIDRISHTI • SYSTEM BRIEFING
              </h1>
              {/* HD Quality Badge */}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 tracking-wider">
                <Sparkles className="w-3 h-3" />
                1080p FULL HD
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Source: {customVideoUrl ? 'Local High-Def Session Video' : 'intro.mp4 (High-Def Native Stream)'}
            </p>
          </div>
        </div>

        {/* Right: Actions & Window Controls */}
        <div className="flex items-center gap-2.5">
          {/* File Selector for custom video */}
          <input
            type="file"
            ref={fileInputRef}
            accept="video/mp4,video/webm,video/ogg,video/quicktime"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-md bg-white/[0.08] hover:bg-white/[0.15] text-xs font-mono text-slate-200 border border-white/[0.12] flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-sm"
            title="Load custom HD video file"
          >
            <Upload className="w-3.5 h-3.5 text-slate-300" />
            <span>Choose HD File</span>
          </button>

          {/* Fullscreen Toggle Button */}
          <button
            onClick={toggleNativeFullscreen}
            className="p-2 rounded-md bg-white/[0.08] hover:bg-white/[0.15] text-slate-200 border border-white/[0.12] transition-all cursor-pointer backdrop-blur-sm"
            title={isFullscreen ? 'Exit Fullscreen (F)' : 'Enter Fullscreen (F)'}
          >
            {isFullscreen ? (
              <Minimize className="w-4 h-4 text-slate-200" />
            ) : (
              <Maximize className="w-4 h-4 text-slate-200" />
            )}
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30 transition-all cursor-pointer backdrop-blur-sm"
            title="Close Player (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Main Fullscreen Video Viewport */}
      <div className="relative w-full h-full flex items-center justify-center bg-black">
        {videoError ? (
          /* Staging prompt if video fails to load */
          <div className="max-w-md p-8 text-center flex flex-col items-center z-20 bg-[#0c1017] border border-white/[0.1] rounded-2xl shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mb-4">
              <AlertCircle className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-semibold text-white mb-2">
              Ready for Fullscreen HD Video
            </h3>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Place your high-definition video in <code className="text-orange-300 font-mono bg-white/[0.06] px-1.5 py-0.5 rounded">frontend/public/videos/intro.mp4</code> or select it directly below.
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-md bg-orange-600 hover:bg-orange-500 text-xs font-semibold text-white flex items-center gap-2 transition-colors cursor-pointer shadow-md"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Select Video File</span>
              </button>
              <button
                onClick={handleRetry}
                className="px-4 py-2 rounded-md bg-white/[0.08] hover:bg-white/[0.12] text-xs font-medium text-slate-300 border border-white/[0.1] flex items-center gap-2 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          </div>
        ) : (
          /* Fullscreen Video Element with High-Quality Rendering */
          <video
            ref={videoRef}
            key={customVideoUrl || 'default-intro'}
            controls
            autoPlay
            playsInline
            preload="auto"
            className="w-full h-full object-contain bg-black shadow-2xl"
            style={{
              imageRendering: 'high-quality',
              WebkitBackfaceVisibility: 'hidden',
              maxHeight: '100vh',
              maxWidth: '100vw'
            }}
            onError={handleVideoError}
            onCanPlay={handleVideoCanPlay}
          >
            {customVideoUrl ? (
              <source src={customVideoUrl} />
            ) : (
              <>
                <source src="/videos/intro.mp4" type="video/mp4" />
                <source src="/videos/Create_a_second_cinematic_p.mp4" type="video/mp4" />
                <source src="/videos/intro.webm" type="video/webm" />
                <source src="/videos/demo.mp4" type="video/mp4" />
              </>
            )}
            Your browser does not support high-definition video streaming.
          </video>
        )}
      </div>

      {/* 3. Subtle Bottom Hint Bar (Auto-hides with controls) */}
      <div
        className={`absolute bottom-0 inset-x-0 z-50 px-6 py-3 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-center justify-between text-[11px] font-mono text-slate-400 transition-opacity duration-500 ${
          showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>PRESS [F] FOR NATIVE FULLSCREEN • [SPACE] TO PLAY/PAUSE • [ESC] TO EXIT</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">MAX BITRATE HARDWARE ACCELERATED</span>
        </div>
      </div>
    </div>
  );
}
