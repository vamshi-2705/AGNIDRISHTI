import React, { useState, useRef, useEffect } from 'react';
import { X, Film, Upload, RefreshCw, AlertCircle, Play, CheckCircle2 } from 'lucide-react';

export default function IntroVideoModal({ onClose }) {
  const [videoError, setVideoError] = useState(false);
  const [customVideoUrl, setCustomVideoUrl] = useState(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleVideoError = () => {
    // If not using a custom chosen file, set error state so user gets helpful guide
    if (!customVideoUrl) {
      setVideoError(true);
    }
  };

  const handleVideoCanPlay = () => {
    setVideoError(false);
    setVideoLoaded(true);
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
      className="fixed inset-0 bg-black/85 backdrop-blur-md z-[3000] flex items-center justify-center p-4 sm:p-6 select-none font-sans"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#0c1017] border border-white/[0.12] rounded-xl w-full max-w-4xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Top Bar */}
        <div className="px-5 py-3.5 border-b border-white/[0.08] bg-[#111620] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold font-mono text-slate-100 flex items-center gap-2">
                AGNIDRISHTI • SYSTEM BRIEFING & INTRO VIDEO
              </h2>
              <p className="text-[10px] font-mono text-slate-400">
                Source: {customVideoUrl ? 'Local Session Video' : '/videos/intro.mp4'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick File Select Button */}
            <input
              type="file"
              ref={fileInputRef}
              accept="video/mp4,video/webm,video/ogg,video/quicktime"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 rounded bg-[#18202c] hover:bg-[#222c3c] text-[11px] font-mono text-slate-300 border border-white/[0.08] flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Select video file directly from your computer"
            >
              <Upload className="w-3 h-3 text-slate-400" />
              <span>Choose File</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded text-slate-400 hover:text-slate-100 hover:bg-[#18202a] transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Player or Fallback Guidance Area */}
        <div className="relative bg-black flex-1 min-h-[380px] sm:min-h-[460px] flex items-center justify-center overflow-hidden">
          {videoError ? (
            /* Helpful staging placeholder if video not placed yet */
            <div className="max-w-lg p-6 text-center flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mb-4">
                <AlertCircle className="w-7 h-7" />
              </div>

              <h3 className="text-base font-semibold text-white mb-1.5">
                Ready for Your Intro Video
              </h3>
              <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                The video folder is ready at <code className="text-orange-300 font-mono bg-white/[0.05] px-1.5 py-0.5 rounded">frontend/public/videos/</code>. 
                Place your video file there as <code className="text-orange-300 font-mono bg-white/[0.05] px-1.5 py-0.5 rounded">intro.mp4</code>.
              </p>

              <div className="bg-[#121722] border border-white/[0.08] rounded-lg p-3 text-left w-full mb-5 text-[11px] font-mono text-slate-300 space-y-1.5">
                <div className="flex items-center gap-2 text-slate-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Folder Created: <strong>frontend/public/videos/</strong></span>
                </div>
                <div className="flex items-center gap-2 text-slate-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Target File Name: <strong>intro.mp4</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap justify-center">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-md bg-orange-600 hover:bg-orange-500 text-xs font-semibold text-white flex items-center gap-2 transition-colors cursor-pointer shadow-md"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Select Video File Now</span>
                </button>
                <button
                  onClick={handleRetry}
                  className="px-4 py-2 rounded-md bg-[#18202c] hover:bg-[#222c3c] text-xs font-medium text-slate-300 border border-white/[0.1] flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Check Again</span>
                </button>
              </div>
            </div>
          ) : (
            /* Live HTML5 Video Player */
            <video
              ref={videoRef}
              key={customVideoUrl || 'default-intro'}
              controls
              autoPlay
              playsInline
              className="w-full h-full max-h-[75vh] object-contain bg-black"
              onError={handleVideoError}
              onCanPlay={handleVideoCanPlay}
            >
              {customVideoUrl ? (
                <source src={customVideoUrl} />
              ) : (
                <>
                  <source src="/videos/intro.mp4" type="video/mp4" />
                  <source src="/videos/intro.webm" type="video/webm" />
                  <source src="/videos/demo.mp4" type="video/mp4" />
                </>
              )}
              Your browser does not support the video tag.
            </video>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-5 py-2.5 border-t border-white/[0.08] bg-[#111620] flex items-center justify-between text-[11px] font-mono text-slate-400 shrink-0">
          <div className="flex items-center gap-3">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>PRESS [ESC] TO EXIT FULLSCREEN PLAYER</span>
          </div>

          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-[#18202c] hover:bg-[#222c3c] text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
