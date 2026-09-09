import React from 'react';
import { ArrowRight } from 'lucide-react';
import logoImg from './assets/logo.jpg';
import heroBgImg from './assets/hero-bg.jpg';

export default function LandingPage({ onOpenPlatform }) {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#020617] text-white flex flex-col select-none font-sans">
      {/* 1. Top Navbar */}
      <header className="relative z-30 w-full px-6 sm:px-10 md:px-14 py-3.5 bg-[#080d1a] border-b border-slate-800/90 flex items-center justify-between shrink-0 shadow-lg">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3.5 group cursor-pointer" onClick={onOpenPlatform}>
          {/* Circular Badge Logo */}
          <div className="relative w-11 h-11 md:w-12 md:h-12 rounded-full overflow-hidden border border-slate-700/80 bg-black/80 flex items-center justify-center p-0.5 transition-transform duration-300 group-hover:scale-105 shadow-md">
            <img 
              src={logoImg} 
              alt="AGNI DRISHTI Logo" 
              className="w-full h-full object-cover rounded-full"
            />
          </div>

          {/* Title and Sub-title Text */}
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1.5 leading-none">
              <span className="text-xl md:text-2xl font-black tracking-wider bg-gradient-to-r from-[#ff4500] via-[#ff8800] to-[#ffa800] bg-clip-text text-transparent">
                AGNI
              </span>
              <span className="text-xl md:text-2xl font-light tracking-[0.22em] text-white">
                DRISHTI
              </span>
            </div>
            <span className="text-[8px] md:text-[9.5px] font-semibold tracking-[0.26em] text-slate-300/80 uppercase mt-1">
              SEE THE HEAT. SECURE TOMORROW.
            </span>
          </div>
        </div>

        {/* Top Right Action Button */}
        <button
          onClick={onOpenPlatform}
          className="group relative inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-[#0d1627] hover:bg-[#132038] border border-slate-700 hover:border-slate-500 text-xs md:text-sm font-medium text-slate-100 hover:text-white transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md"
        >
          <span>Open  Platform</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
        </button>
      </header>

      {/* 2. Main Hero Viewport - Background image starts strictly from the bottom of the navbar */}
      <div className="relative flex-1 flex flex-col justify-between overflow-hidden">
        {/* Background Satellite & Earth Image - High-Definition (HD) 2K with Subtle Scanning Beam */}
        <div 
          className="absolute inset-0 z-0 bg-no-repeat bg-right filter brightness-[1.18] contrast-[1.1] saturate-[1.15]"
          style={{ 
            backgroundImage: `url(${heroBgImg})`,
            backgroundSize: 'auto 100%',
            backgroundPosition: 'right center'
          }}
        >
          {/* Subtle Left-Side Soft Gradient for Text Readability without Dulling Background */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#020617] via-[#020617]/50 md:via-[#020617]/15 to-transparent pointer-events-none" />
          {/* Subtle Bottom Blend */}
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#020617]/70 to-transparent pointer-events-none" />
        </div>

        {/* Geospatial Map Overlay Labels - Precisely locked to the 16:9 satellite background image */}
        <div className="absolute right-0 top-0 bottom-0 h-full aspect-[16/9] z-10 pointer-events-none hidden md:block">
          {/* CHINA */}
          <div className="absolute top-[27%] left-[78%] -translate-x-1/2 -translate-y-1/2">
            <span className="text-[10px] tracking-[0.25em] text-slate-300/70 font-mono font-medium drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
              CHINA
            </span>
          </div>

          {/* INDIA */}
          <div className="absolute top-[48.5%] left-[66%] -translate-x-1/2 -translate-y-1/2">
            <span className="text-xs tracking-[0.35em] text-slate-200/90 font-mono font-bold drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
              INDIA
            </span>
          </div>

          {/* ARABIAN SEA */}
          <div className="absolute top-[61%] left-[51.2%] -translate-x-1/2 -translate-y-1/2">
            <span className="text-[10px] tracking-[0.25em] text-slate-300/70 font-mono font-medium drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
              ARABIAN SEA
            </span>
          </div>

          {/* BAY OF BENGAL */}
          <div className="absolute top-[62%] left-[81%] -translate-x-1/2 -translate-y-1/2">
            <span className="text-[10px] tracking-[0.25em] text-slate-300/70 font-mono font-medium drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
              BAY OF BENGAL
            </span>
          </div>

          {/* INDIAN OCEAN */}
          <div className="absolute top-[82%] left-[74.7%] -translate-x-1/2 -translate-y-1/2">
            <span className="text-[10px] tracking-[0.25em] text-slate-300/70 font-mono font-medium drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
              INDIAN OCEAN
            </span>
          </div>
        </div>

        {/* Hero Section (Left Aligned) */}
        <main className="relative z-20 px-6 sm:px-10 md:px-14 my-auto max-w-2xl py-4 flex flex-col justify-center">
          {/* Eyebrow / Overline */}
          <div className="text-[#00d2ff] text-xs md:text-sm font-bold tracking-[0.22em] uppercase mb-4">
            GEOSPATIAL THERMAL MONITORING
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.12] mb-5">
            See the Heat. <br />
            Understand the <span className="text-[#00d2ff]">Risk.</span>
          </h1>

          {/* Description */}
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-lg mb-8 font-normal drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
            Satellite-driven insights for detecting industrial fires, persistent thermal sources, and emerging hazards across India.
          </p>

          {/* Hero CTA Button */}
          <div>
            <button
              onClick={onOpenPlatform}
              className="group relative inline-flex items-center gap-3 px-7 py-3.5 rounded-full bg-[#040c1a]/85 hover:bg-[#0a162c] border border-slate-700 hover:border-slate-500 text-sm md:text-base font-medium text-white backdrop-blur-lg transition-all duration-300 cursor-pointer shadow-md hover:shadow-lg"
            >
              <span>Explore AGNIDRISHTI</span>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-white group-hover:translate-x-1.5 transition-all duration-300" />
            </button>
          </div>
        </main>

        {/* 3. Bottom Tactical Dock / Capabilities Bar */}
        <footer className="relative z-20 w-full border-t border-slate-800/80 bg-[#020712]/90 backdrop-blur-xl px-6 sm:px-10 md:px-14 py-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 items-center">
            {/* 1. SATELLITE OBSERVATIONS */}
            <div className="flex items-center gap-3">
              <div className="shrink-0 text-[#00d2ff]">
                {/* Satellite Scan Icon */}
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
                <div className="text-white font-bold text-[11px] md:text-xs tracking-wider uppercase">
                  SATELLITE OBSERVATIONS
                </div>
                <div className="text-[#00d2ff] text-[9.5px] md:text-[10px] tracking-wider uppercase font-mono font-medium mt-0.5">
                  NASA FIRMS / VIIRS
                </div>
              </div>
            </div>

            {/* 2. INDUSTRIAL CONTEXT */}
            <div className="flex items-center gap-3">
              <div className="shrink-0 text-[#00d2ff]">
                {/* Stacked Layers Icon */}
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
              </div>
              <div>
                <div className="text-white font-bold text-[11px] md:text-xs tracking-wider uppercase">
                  INDUSTRIAL CONTEXT
                </div>
                <div className="text-[#00d2ff] text-[9.5px] md:text-[10px] tracking-wider uppercase font-mono font-medium mt-0.5">
                  GIS • OSM • FACILITY DATA
                </div>
              </div>
            </div>

            {/* 3. THERMAL-BASED ANALYSIS */}
            <div className="flex items-center gap-3">
              <div className="shrink-0 text-[#00d2ff]">
                {/* Analytics Chart Icon */}
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                  <line x1="3" y1="20" x2="21" y2="20" />
                </svg>
              </div>
              <div>
                <div className="text-white font-bold text-[11px] md:text-xs tracking-wider uppercase">
                  THERMAL  ANALYSIS
                </div>
                <div className="text-[#00d2ff] text-[9.5px] md:text-[10px] tracking-wider uppercase font-mono font-medium mt-0.5">
                  DETECTION & CLASSIFICATION
                </div>
              </div>
            </div>

            {/* 4. ATMOSPHERIC INSIGHTS */}
            <div className="flex items-center gap-3">
              <div className="shrink-0 text-[#00d2ff]">
                {/* Atmospheric Wind Waves Icon */}
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
                </svg>
              </div>
              <div>
                <div className="text-white font-bold text-[11px] md:text-xs tracking-wider uppercase">
                  ATMOSPHERIC INSIGHTS
                </div>
                <div className="text-[#00d2ff] text-[9.5px] md:text-[10px] tracking-wider uppercase font-mono font-medium mt-0.5">
                  DISPERSION & RISK ASSESSMENT
                </div>
              </div>
            </div>

            {/* 5. RESILIENCE MISSION TAGLINE (Far Right) */}
            <div className="col-span-2 md:col-span-1 lg:col-span-1 flex items-center justify-start lg:justify-end gap-3 pl-2 border-t md:border-t-0 md:border-l border-slate-800 pt-2 md:pt-0">
              <div className="hidden lg:block w-5 h-[2px] bg-slate-500 shrink-0" />
              <div className="flex flex-col text-[#00d2ff] text-[9.5px] md:text-[10px] font-semibold tracking-[0.16em] leading-[1.4] uppercase">
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
