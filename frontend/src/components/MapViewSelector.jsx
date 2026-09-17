import React, { useRef, useEffect } from 'react';
import { 
  ChevronDown, ChevronUp, Wind, MapPin, Eye, Layers
} from 'lucide-react';
import { BASE_MAP_PROVIDERS } from './GisMapViewer';

export default function MapViewSelector({
  mapViewMode = 'dark',
  onSelectMapViewMode = () => {},
  selectedFire = null,
  layersOpen = false,
  setLayersOpen = () => {},
  // Overlay visibility
  showThermalEvents = true,
  setShowThermalEvents = () => {},
  showFacilities = true,
  setShowFacilities = () => {},
  showPlume = true,
  setShowPlume = () => {},
  showExposure = true,
  setShowExposure = () => {},
  showOsmContext = true,
  setShowOsmContext = () => {},
  // Satellite evidence supporting layers (Section 7)
  showOpticalContext = false,
  setShowOpticalContext = () => {},
  showModisContext = false,
  setShowModisContext = () => {}
}) {
  const panelRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setLayersOpen(false);
      }
    }
    if (layersOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [layersOpen, setLayersOpen]);

  const activeLabel = BASE_MAP_PROVIDERS[mapViewMode]?.name?.split(' ')[0] || 'Dark';

  return (
    <div 
      ref={panelRef}
      id="map-view-selector-container"
      className={`absolute top-3 ${selectedFire ? 'right-3 md:right-[410px]' : 'right-3'} z-[950] font-sans select-none transition-all duration-300`}
    >
      {/* Mobile Compact Floating Button (When collapsed on mobile) */}
      {!layersOpen && (
        <button
          type="button"
          id="btn-open-map-layers-mobile"
          onClick={() => setLayersOpen(true)}
          className="sm:hidden w-10 h-10 rounded-xl glass-panel shadow-2xl flex items-center justify-center border border-white/[0.15] bg-[#090d14]/95 text-slate-100 hover:text-white cursor-pointer active:scale-95 transition-all"
          title="Open Map Views & Layers"
        >
          <span className="text-base leading-none">🗺</span>
        </button>
      )}

      {/* Main Panel Box */}
      <div className={`glass-panel rounded-xl shadow-2xl overflow-hidden border border-white/[0.12] bg-[#090d14]/95 backdrop-blur-md text-slate-100 w-[260px] sm:w-[280px] max-w-[calc(100vw-24px)] ${!layersOpen ? 'hidden sm:block' : 'block'}`}>
        {/* Toggle Bar */}
        <button
          type="button"
          id="btn-toggle-map-views"
          onClick={() => setLayersOpen(!layersOpen)}
          className="w-full px-3 py-2 flex items-center justify-between text-xs font-semibold text-slate-200 hover:text-white cursor-pointer transition-colors bg-white/[0.03] hover:bg-white/[0.06]"
          title="Toggle Map Views"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm leading-none">🗺</span>
            <span className="font-mono tracking-wider text-[11px] uppercase font-bold text-slate-200">
              Map Views
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border text-cyan-400 bg-cyan-950/60 border-cyan-800/50">
              {activeLabel}
            </span>
            {layersOpen ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </div>
        </button>

        {/* Dropdown Content */}
        {layersOpen && (
          <div className="p-3 border-t border-white/[0.08] space-y-3.5 text-[11px] max-h-[calc(100vh-140px)] overflow-y-auto">
            {/* 1. 2D BASEMAPS SECTION */}
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span className="text-slate-300 font-bold">2D Maps</span>
                <span className="text-[9px] text-slate-500 font-mono">Planar GIS</span>
              </div>
              <div className="space-y-1">
                {Object.values(BASE_MAP_PROVIDERS).map((p) => {
                  const isSelected = mapViewMode === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      id={p.id === 'dark' ? 'btn-basemap-dark' : p.id === 'satellite' ? 'btn-basemap-satellite' : p.id === 'streets' ? 'btn-basemap-streets' : p.id === 'topographic' ? 'btn-basemap-topographic' : `btn-basemap-${p.id}`}
                      onClick={() => {
                        onSelectMapViewMode(p.id);
                      }}
                      className={`w-full text-left p-2 rounded-lg transition-all flex items-start gap-2.5 cursor-pointer border ${
                        isSelected
                          ? 'bg-cyan-950/50 border-cyan-500/60 text-white shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                          : 'bg-white/[0.02] border-white/[0.05] text-slate-300 hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border transition-all ${
                          isSelected ? 'border-cyan-400 bg-cyan-500' : 'border-slate-600 bg-transparent'
                        }`}>
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-slate-950"></span>}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className={`font-medium ${isSelected ? 'text-cyan-300 font-semibold' : 'text-slate-200'}`}>
                            {p.name}
                          </span>
                          {isSelected && (
                            <span className="text-[8.5px] font-mono text-cyan-300 px-1 py-0.2 rounded bg-cyan-900/60 border border-cyan-700/60 shrink-0">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 leading-tight mt-0.5 truncate">
                          {p.tagline}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. ANALYSIS OVERLAYS SECTION */}
            <div className="pt-2.5 border-t border-white/[0.08]">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span className="text-orange-400 font-bold">Analysis Overlays</span>
                <span className="text-[9px] text-slate-500 font-mono">Independent</span>
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center justify-between p-1.5 rounded hover:bg-white/[0.04] cursor-pointer text-slate-300 hover:text-white transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.8)]"></span>
                    <span className="font-medium">Thermal Events</span>
                  </div>
                  <input
                    type="checkbox"
                    id="chk-overlay-thermal"
                    checked={showThermalEvents}
                    onChange={(e) => setShowThermalEvents(e.target.checked)}
                    className="rounded accent-orange-500 cursor-pointer w-3.5 h-3.5"
                  />
                </label>

                <label className="flex items-center justify-between p-1.5 rounded hover:bg-white/[0.04] cursor-pointer text-slate-300 hover:text-white transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm bg-sky-500 border border-sky-400/60"></span>
                    <span className="font-medium">Industrial Facilities</span>
                  </div>
                  <input
                    type="checkbox"
                    id="chk-overlay-facilities"
                    checked={showFacilities}
                    onChange={(e) => setShowFacilities(e.target.checked)}
                    className="rounded accent-sky-500 cursor-pointer w-3.5 h-3.5"
                  />
                </label>

                <label className="flex items-center justify-between p-1.5 rounded hover:bg-white/[0.04] cursor-pointer text-slate-300 hover:text-white transition-colors">
                  <div className="flex items-center gap-2">
                    <Wind className="w-3.5 h-3.5 text-red-400" />
                    <span className="font-medium">Estimated Dispersion</span>
                  </div>
                  <input
                    type="checkbox"
                    id="chk-overlay-plume"
                    checked={showPlume}
                    onChange={(e) => setShowPlume(e.target.checked)}
                    className="rounded accent-red-500 cursor-pointer w-3.5 h-3.5"
                  />
                </label>

                <label className="flex items-center justify-between p-1.5 rounded hover:bg-white/[0.04] cursor-pointer text-slate-300 hover:text-white transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]"></span>
                    <span className="font-medium">Community Exposure</span>
                  </div>
                  <input
                    type="checkbox"
                    id="chk-overlay-exposure"
                    checked={showExposure}
                    onChange={(e) => setShowExposure(e.target.checked)}
                    className="rounded accent-cyan-400 cursor-pointer w-3.5 h-3.5"
                  />
                </label>

                <label className="flex items-center justify-between p-1.5 rounded hover:bg-white/[0.04] cursor-pointer text-slate-300 hover:text-white transition-colors">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-medium">OSM Context</span>
                  </div>
                  <input
                    type="checkbox"
                    id="chk-overlay-osm"
                    checked={showOsmContext}
                    onChange={(e) => setShowOsmContext(e.target.checked)}
                    className="rounded accent-amber-400 cursor-pointer w-3.5 h-3.5"
                  />
                </label>
              </div>
            </div>

            {/* 3. SATELLITE EVIDENCE SECTION (Multi-Sensor Context) */}
            <div className="pt-2.5 border-t border-white/[0.08]">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span className="text-cyan-400 font-bold">Satellite Evidence</span>
                <span className="text-[9px] text-slate-500 font-mono">Multi-Sensor</span>
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center justify-between p-1.5 rounded hover:bg-white/[0.04] cursor-pointer text-slate-300 hover:text-white transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.8)]"></span>
                    <span className="font-medium">VIIRS Detection (Primary)</span>
                  </div>
                  <input
                    type="checkbox"
                    id="chk-overlay-viirs"
                    checked={showThermalEvents}
                    onChange={(e) => setShowThermalEvents(e.target.checked)}
                    className="rounded accent-orange-500 cursor-pointer w-3.5 h-3.5"
                  />
                </label>

                <label className="flex items-center justify-between p-1.5 rounded hover:bg-white/[0.04] cursor-pointer text-slate-300 hover:text-white transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 border border-emerald-300/60"></span>
                    <span className="font-medium">Landsat / Sentinel-2 Context</span>
                  </div>
                  <input
                    type="checkbox"
                    id="chk-overlay-optical-context"
                    checked={showOpticalContext}
                    onChange={(e) => setShowOpticalContext(e.target.checked)}
                    className="rounded accent-emerald-500 cursor-pointer w-3.5 h-3.5"
                  />
                </label>

                <label className="flex items-center justify-between p-1.5 rounded hover:bg-white/[0.04] cursor-pointer text-slate-300 hover:text-white transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-300/60"></span>
                    <span className="font-medium">MODIS Thermal Context</span>
                  </div>
                  <input
                    type="checkbox"
                    id="chk-overlay-modis-context"
                    checked={showModisContext}
                    onChange={(e) => setShowModisContext(e.target.checked)}
                    className="rounded accent-amber-500 cursor-pointer w-3.5 h-3.5"
                  />
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
