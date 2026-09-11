import React, { useState, useRef, useEffect } from 'react';
import { X, AlertCircle, Upload, RefreshCw } from 'lucide-react';

export default function IntroVideoModal({ onClose }) {
  const [videoError, setVideoError] = useState(false);
  const [customVideoUrl, setCustomVideoUrl] = useState(null);
  const [showCloseBtn, setShowCloseBtn] = useState(true);
  
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const hideTimerRef = useRef(null);

  // Auto-hide the subtle top-right close button when mouse is still
  const handleMouseMove = () => {
    setShowCloseBtn(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setShowCloseBtn(false);
    }, 2500);
  };

  // Keyboard shortcut listener (Esc to exit, Space to toggle play/pause)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        onClose();
      } else if (e.key === ' ' && videoRef.current) {
        e.preventDefault();
        if (videoRef.current.paused) {
          videoRef.current.play();
        } else {
          videoRef.current.pause();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Initial timer to fade out close button
    hideTimerRef.current = setTimeout(() => {
      setShowCloseBtn(false);
    }, 3000);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [onClose]);

  const handleVideoError = () => {
    if (!customVideoUrl) {
      setVideoError(true);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomVideoUrl(url);
      setVideoError(false);
    }
  };

  const handleRetry = () => {
    setVideoError(false);
    if (videoRef.current) {
      videoRef.current.load();
    }
  };

  // Click on video to toggle play/pause
  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      className="fixed inset-0 z-[4000] w-screen h-screen bg-black flex items-center justify-center overflow-hidden font-sans select-none cursor-none hover:cursor-default"
    >
      {/* Subtle Floating Top-Right Exit Button (Fades out when mouse is idle) */}
      <button
        onClick={onClose}
        className={`absolute top-6 right-6 z-50 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white/70 hover:text-white border border-white/20 transition-all duration-300 backdrop-blur-md cursor-pointer ${
          showCloseBtn ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
        }`}
        title="Exit (Esc)"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Main Video Viewport - Zero Controls, Pure Video */}
      <div className="relative w-full h-full flex items-center justify-center bg-black">
        {videoError ? (
          /* Staging prompt if video fails to load */
          <div className="max-w-md p-8 text-center flex flex-col items-center z-20 bg-[#0c1017] border border-white/[0.1] rounded-2xl shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mb-4">
              <AlertCircle className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-semibold text-white mb-2">
              Ready for Fullscreen Video
            </h3>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Place your video in <code className="text-orange-300 font-mono bg-white/[0.06] px-1.5 py-0.5 rounded">frontend/public/videos/intro.mp4</code> or select it below.
            </p>

            <input
              type="file"
              ref={fileInputRef}
              accept="video/mp4,video/webm,video/ogg,video/quicktime"
              className="hidden"
              onChange={handleFileChange}
            />

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
          /* Pure Video Element - NO controls, NO scrubber, NO timeline bar */
          <video
            ref={videoRef}
            key={customVideoUrl || 'default-intro'}
            autoPlay
            playsInline
            preload="auto"
            onClick={togglePlayPause}
            onEnded={onClose}
            className="w-full h-full object-contain bg-black"
            style={{
              imageRendering: 'high-quality',
              WebkitBackfaceVisibility: 'hidden',
              maxHeight: '100vh',
              maxWidth: '100vw'
            }}
            onError={handleVideoError}
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
    </div>
  );
}
