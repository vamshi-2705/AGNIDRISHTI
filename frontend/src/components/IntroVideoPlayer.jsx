import React, { useState, useRef, useEffect } from 'react';
import logoImg from '../assets/logo.jpg';

export default function IntroVideoPlayer({ onComplete }) {
  const videoRef = useRef(null);
  const [hasError, setHasError] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

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

  // Auto-play on mount
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play()
        .catch((err) => {
          console.warn('[AGNIDRISHTI] Autoplay blocked or video missing:', err);
        });
    }
  }, []);

  return (
    <div 
      onClick={handleTransition}
      title="Click anywhere to skip to landing page"
      className={`fixed inset-0 z-[9999] bg-[#05070a] text-white flex flex-col items-center justify-between p-6 select-none transition-opacity duration-700 cursor-pointer ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* 1. Top Header: ONLY Logo */}
      <div className="w-full flex items-center justify-center pt-2 shrink-0 z-20">
        <div className="flex items-center gap-3.5">
          {/* Circular Badge Logo */}
          <div className="relative w-10 h-10 md:w-11 md:h-11 rounded-full overflow-hidden border border-white/[0.12] bg-black flex items-center justify-center p-0.5 shadow-md">
            <img 
              src={logoImg} 
              alt="AGNI DRISHTI Logo" 
              className="w-full h-full object-cover rounded-full"
            />
          </div>

          {/* Title and Sub-title Text */}
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1.5 leading-none">
              <span className="text-xl md:text-2xl font-black tracking-wider text-orange-500">
                AGNI
              </span>
              <span className="text-xl md:text-2xl font-light tracking-[0.2em] text-white">
                DRISHTI
              </span>
            </div>
            <span className="text-[8px] md:text-[9px] font-medium tracking-[0.2em] text-slate-400 uppercase mt-1">
              GEOSPATIAL THERMAL SURVEILLANCE
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main HD Video Presentation Viewport */}
      <div className="relative flex-1 w-full flex items-center justify-center my-auto overflow-hidden">
        {/* Soft Ambient Cinematic Backlight Glow */}
        <div className="absolute inset-0 bg-gradient-radial from-orange-500/[0.04] via-transparent to-transparent pointer-events-none" />

        {!hasError ? (
          <div className="relative rounded-2xl overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.95),0_0_40px_rgba(249,115,22,0.12)] border border-white/[0.1] bg-black flex items-center justify-center">
            <video
              ref={videoRef}
              src="/videos/intro.mp4"
              autoPlay
              playsInline
              muted
              onEnded={handleTransition}
              onError={() => setHasError(true)}
              className="max-w-[88vw] max-h-[78vh] w-auto h-auto object-contain rounded-2xl"
              style={{
                filter: 'contrast(1.10) brightness(1.04) saturate(1.08)',
                imageRendering: '-webkit-optimize-contrast',
                transform: 'translateZ(0)'
              }}
            >
              <source src="/videos/intro.mp4" type="video/mp4" />
              <source src="/videos/intro.mp4.mp4" type="video/mp4" />
            </video>
          </div>
        ) : (
          /* Fallback screen */
          <div className="flex flex-col items-center justify-center p-8 max-w-lg text-center font-sans">
            <div className="text-xl font-bold tracking-wider text-white mb-2 uppercase">
              INTRO VIDEO PIPELINE READY
            </div>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              Insert your video file into frontend/public/videos/intro.mp4
            </p>
          </div>
        )}
      </div>

      {/* 3. Bottom Spacer (keeps logo perfectly balanced, no buttons or lines) */}
      <div className="h-6 shrink-0" />
    </div>
  );
}
