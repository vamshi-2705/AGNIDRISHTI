import React from 'react';
import { ArrowRight } from 'lucide-react';
import logoImg from './assets/logo.jpg';
import heroBgImg from './assets/hero-bg.jpg';

export default function LandingPage({ onOpenPlatform, onReplayIntro }) {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#070a0e] text-white flex flex-col select-none font-sans">
      {/* 1. Top Navbar */}
      <header className="relative z-30 w-full px-6 sm:px-10 md:px-14 py-3.5 bg-[#0b0f14] border-b border-white/[0.08] flex items-center justify-between shrink-0 shadow-sm">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3.5 group cursor-pointer" onClick={onOpenPlatform}>
          {/* Circular Badge Logo */}
          <div className="relative w-10 h-10 md:w-11 md:h-11 rounded-full overflow-hidden border border-white/[0.1] bg-black flex items-center justify-center p-0.5 transition-transform duration-300 group-hover:scale-105 shadow-sm">
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

        {/* Top Right Action Buttons */}
        <div className="flex items-center gap-2.5">
          {onReplayIntro && (
            <button
              onClick={onReplayIntro}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-transparent hover:bg-white/[0.05] border border-transparent hover:border-white/[0.1] text-xs font-medium text-slate-400 hover:text-white transition-all cursor-pointer"
              title="Replay Video Intro"
            >
              <span>Play Intro</span>
            </button>
          )}
          <button
            onClick={onOpenPlatform}
          className="group relative inline-flex items-center gap-2.5 px-4 py-2 rounded-md bg-[#141920] hover:bg-[#1a222c] border border-white/[0.1] hover:border-slate-400 text-xs md:text-sm font-medium text-slate-200 hover:text-white transition-all duration-200 cursor-pointer shadow-sm"
        >
          <span>Open Platform</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-transform" />
        </button>
        </div>
      </header>

      {/* 2. Main Hero Viewport */}
      <div className="relative flex-1 flex flex-col justify-between overflow-hidden">
        {/* Background Satellite & Earth Image - Natural Earth Grading */}
        <div 
          className="absolute inset-0 z-0 bg-no-repeat bg-right filter brightness-[1.05] contrast-[1.04]"
          style={{ 
            backgroundImage: `url(${heroBgImg})`,
            backgroundSize: 'auto 100%',
            backgroundPosition: 'right center'
          }}
        >
          {/* Subtle Left-Side Soft Gradient for Text Readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#070a0e] via-[#070a0e]/60 md:via-[#070a0e]/25 to-transparent pointer-events-none" />
          {/* Subtle Bottom Blend */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#070a0e]/80 to-transparent pointer-events-none" />
        </div>

        {/* Geospatial Map Overlay Labels */}
        <div className="absolute right-0 top-0 bottom-0 h-full aspect-[16/9] z-10 pointer-events-none hidden md:block">
          <div className="absolute top-[27%] left-[78%] -translate-x-1/2 -translate-y-1/2">
            <span className="text-[10px] tracking-[0.25em] text-slate-400/80 font-mono font-medium drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
              CHINA
            </span>
          </div>

          <div className="absolute top-[48.5%] left-[66%] -translate-x-1/2 -translate-y-1/2">
            <span className="text-xs tracking-[0.3em] text-slate-200 font-mono font-semibold drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
              INDIA
            </span>
          </div>

          <div className="absolute top-[61%] left-[51.2%] -translate-x-1/2 -translate-y-1/2">
            <span className="text-[10px] tracking-[0.25em] text-slate-400/80 font-mono font-medium drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
              ARABIAN SEA
            </span>
          </div>

          <div className="absolute top-[62%] left-[81%] -translate-x-1/2 -translate-y-1/2">
            <span className="text-[10px] tracking-[0.25em] text-slate-400/80 font-mono font-medium drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
              BAY OF BENGAL
            </span>
          </div>

          <div className="absolute top-[82%] left-[74.7%] -translate-x-1/2 -translate-y-1/2">
            <span className="text-[10px] tracking-[0.25em] text-slate-400/80 font-mono font-medium drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
              INDIAN OCEAN
            </span>
          </div>
        </div>

        {/* Hero Section */}
        <main className="relative z-20 px-6 sm:px-10 md:px-14 my-auto max-w-2xl py-4 flex flex-col justify-center">
          {/* Eyebrow / Overline */}
          <div className="text-slate-400 text-xs md:text-sm font-semibold tracking-[0.2em] uppercase mb-3">
            GEOSPATIAL THERMAL MONITORING
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.12] mb-4">
            See the Heat. <br />
            Understand the <span className="text-orange-400">Risk.</span>
          </h1>

          {/* Description */}
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-lg mb-7 font-normal drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
            Satellite-driven observations for detecting industrial fires, persistent thermal sources, and anomalous heat signatures across the Indian subcontinent.
          </p>

          {/* Hero CTA Button */}
          <div>
            <button
              onClick={onOpenPlatform}
              className="group relative inline-flex items-center gap-2.5 px-6 py-3 rounded-md bg-[#131922] hover:bg-[#1a2330] border border-white/[0.1] hover:border-slate-400 text-sm md:text-base font-medium text-white transition-all duration-200 cursor-pointer shadow-md"
            >
              <span>Explore AGNIDRISHTI</span>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-white group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </main>

        {/* 3. Bottom Capability Strip */}
        <footer className="relative z-20 w-full border-t border-white/[0.08] bg-[#090d12]/95 px-6 sm:px-10 md:px-14 py-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 items-center">
            {/* 1. SATELLITE OBSERVATIONS */}
            <div className="flex items-center gap-3">
              <div className="shrink-0 text-slate-400">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 7l-6 6" />
                  <path d="M5 9l8 8" />
                  <path d="M8 6l2-2 4 4-2 2" />
                  <path d="M16 14l2-2 4 4-2 2" />
                  <path d="M4 14l-2 2 4 4 2-2" />
                  <path d="M12 2v2" />
                  <circle cx="5" cy="19" r="1" />
                </svg>
              </div>
              <div>
                <div className="text-white font-semibold text-[11px] md:text-xs tracking-wide uppercase">
                  SATELLITE OBSERVATIONS
                </div>
                <div className="text-slate-400 text-[9.5px] md:text-[10px] tracking-wider uppercase font-mono mt-0.5">
                  NASA FIRMS / VIIRS 375m
                </div>
              </div>
            </div>

            {/* 2. INDUSTRIAL CONTEXT */}
            <div className="flex items-center gap-3">
              <div className="shrink-0 text-slate-400">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
              </div>
              <div>
                <div className="text-white font-semibold text-[11px] md:text-xs tracking-wide uppercase">
                  INDUSTRIAL CONTEXT
                </div>
                <div className="text-slate-400 text-[9.5px] md:text-[10px] tracking-wider uppercase font-mono mt-0.5">
                  GIS • OSM • FACILITY DATA
                </div>
              </div>
            </div>

            {/* 3. THERMAL ANALYSIS */}
            <div className="flex items-center gap-3">
              <div className="shrink-0 text-slate-400">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                  <line x1="3" y1="20" x2="21" y2="20" />
                </svg>
              </div>
              <div>
                <div className="text-white font-semibold text-[11px] md:text-xs tracking-wide uppercase">
                  THERMAL ANALYSIS
                </div>
                <div className="text-slate-400 text-[9.5px] md:text-[10px] tracking-wider uppercase font-mono mt-0.5">
                  BASELINE ANOMALY DETECTION
                </div>
              </div>
            </div>

            {/* 4. ATMOSPHERIC INSIGHTS */}
            <div className="flex items-center gap-3">
              <div className="shrink-0 text-slate-400">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
                </svg>
              </div>
              <div>
                <div className="text-white font-semibold text-[11px] md:text-xs tracking-wide uppercase">
                  ATMOSPHERIC INSIGHTS
                </div>
                <div className="text-slate-400 text-[9.5px] md:text-[10px] tracking-wider uppercase font-mono mt-0.5">
                  ESTIMATED DISPERSION MODEL
                </div>
              </div>
            </div>

            {/* 5. RESILIENCE MISSION TAGLINE */}
            <div className="col-span-2 md:col-span-1 lg:col-span-1 flex items-center justify-start lg:justify-end gap-3 pl-2 border-t md:border-t-0 md:border-l border-white/[0.08] pt-2 md:pt-0">
              <div className="hidden lg:block w-4 h-[1px] bg-slate-600 shrink-0" />
              <div className="flex flex-col text-slate-400 text-[9.5px] md:text-[10px] font-medium tracking-[0.14em] leading-[1.4] uppercase">
                <span>CLEANER INDUSTRIES</span>
                <span>SAFER COMMUNITIES</span>
                <span>A MORE RESILIENT INDIA</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
