import React, { useState, useEffect, useRef, useMemo } from 'react';
import TacticalNavbar from '../components/TacticalNavbar';
import IntelligencePipelineStrip from '../components/IntelligencePipelineStrip';
import OperationsSidebar from '../components/OperationsSidebar';
import GisMapViewer, { BASE_MAP_STORAGE_KEY, BASE_MAP_PROVIDERS } from '../components/GisMapViewer';
import IncidentInspector from '../components/IncidentInspector';
import NdrfDossierModal from '../components/NdrfDossierModal';
import ThermalTimeline from '../components/ThermalTimeline';
import EventReplayModal from '../components/EventReplayModal';
import Cesium3DViewer from '../components/Cesium3DViewer';
import MapViewSelector from '../components/MapViewSelector';
import { alertSound } from '../services/alertSound';
import {
  DEMO_FIRES,
  DEMO_FACILITIES,
  DEMO_SENSITIVE_LOCATIONS,
  DEMO_ANALYTICS_SUMMARY,
  DEMO_INCIDENT_REPORT
} from '../data/demoScenario';

/**
 * DemoPage — Controlled Presentation Platform (/demo)
 * 
 * Demonstrates the complete 10-stage AGNIDRISHTI intelligence story:
 * 1 DETECT -> 2 VERIFY -> 3 CONTEXT -> 4 ANALYZE -> 5 CLASSIFY ->
 * 6 ASSESS -> 7 EXPOSURE -> 8 3D INSPECT -> 9 RESPOND -> 10 SUMMARY
 * 
 * Auto-selects AGNI-DEMO-001 (Surat, Gujarat, Industrial Fire, 290 MW, 3.41x baseline).
 */
export default function DemoPage({
  onBackToLanding,
  onBackToPlatform
}) {
  const [filterMode, setFilterMode] = useState('all');
  const [selectedFire, setSelectedFire] = useState(DEMO_FIRES[0]);
  const [activePlume, setActivePlume] = useState(null);
  const [reportModalData, setReportModalData] = useState(null);
  const [replayEvent, setReplayEvent] = useState(null);

  // 10-Stage Sequential Presentation Demo State
  const [demoStage, setDemoStage] = useState(1); // 1 to 10
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);

  // Unified Map View Mode: 'dark' | 'satellite' | 'streets' | 'topographic' | '3d'
  const [mapViewMode, setMapViewMode] = useState(() => {
    try {
      const saved = localStorage.getItem(BASE_MAP_STORAGE_KEY);
      if (saved && BASE_MAP_PROVIDERS[saved]) {
        return saved;
      }
    } catch (e) {}
    return 'dark';
  });

  const [last2dBasemap, setLast2dBasemap] = useState(() => {
    try {
      const saved = localStorage.getItem(BASE_MAP_STORAGE_KEY);
      if (saved && BASE_MAP_PROVIDERS[saved]) {
        return saved;
      }
    } catch (e) {}
    return 'dark';
  });

  const handleSelectMapViewMode = (mode) => {
    if (mode !== '3d' && BASE_MAP_PROVIDERS[mode]) {
      setLast2dBasemap(mode);
    }
    setMapViewMode(mode);
    try {
      if (mode !== '3d') {
        localStorage.setItem(BASE_MAP_STORAGE_KEY, mode);
      }
    } catch (e) {}
  };

  // Overlay Visibility States (Shared between 2D and 3D map modes)
  const [layersOpen, setLayersOpen] = useState(false);
  const [showThermalEvents, setShowThermalEvents] = useState(true);
  const [showFacilities, setShowFacilities] = useState(true);
  const [showPlume, setShowPlume] = useState(true);
  const [showExposure, setShowExposure] = useState(true);
  const [showOsmContext, setShowOsmContext] = useState(true);
  const [showOpticalContext, setShowOpticalContext] = useState(false);
  const [showModisContext, setShowModisContext] = useState(false);
  const [locateTrigger, setLocateTrigger] = useState(0);

  // Timeline & Scrubber State
  const [timeRange, setTimeRange] = useState(24);
  const [scrubberHours, setScrubberHours] = useState(24);
  const [isTimelinePlaying, setIsTimelinePlaying] = useState(false);

  // Dynamic filter derivation
  const activeFires = useMemo(() => {
    if (filterMode === 'industrial') {
      return DEMO_FIRES.filter(f => f.is_industrial);
    }
    if (filterMode === 'critical') {
      return DEMO_FIRES.filter(f => f.is_emergency);
    }
    return DEMO_FIRES;
  }, [filterMode]);

  const activeEmergencies = useMemo(() => {
    return activeFires.filter(f => f.is_emergency).length;
  }, [activeFires]);

  // Initial selection of primary event on mount (dispersion initially hidden)
  useEffect(() => {
    const primary = DEMO_FIRES[0];
    setSelectedFire(primary);
    setActivePlume(null);
  }, []);

  // Handle stage selection in the 10-step demo presentation sequence
  const handleSelectDemoStage = (stageNum) => {
    setDemoStage(stageNum);
    const primary = DEMO_FIRES[0];
    setSelectedFire(primary);

    // During ASSESS (stage 6): Do NOT automatically reveal dispersion. Presenter clicks the button!
    // At EXPOSURE (stage 7), if advancing automatically, reveal plume and exposure
    if (stageNum >= 7 && stageNum <= 8) {
      setShowPlume(true);
      setShowExposure(true);
      setActivePlume({
        type: 'Feature',
        properties: {
          downwind_azimuth_deg: 135.0,
          hazard_length_km: 2.8,
          risk_level: 'HIGH',
          community_exposure: primary.community_exposure
        }
      });
    } else if (stageNum < 6) {
      setActivePlume(null);
    }

    if (stageNum === 8) {
      handleSelectMapViewMode('3d');
    } else if (mapViewMode === '3d') {
      handleSelectMapViewMode(last2dBasemap || 'dark');
    }

    if (stageNum === 10) {
      setReportModalData(DEMO_INCIDENT_REPORT);
    }
  };

  // Demo auto-play playback timer (~3.5 seconds per stage)
  useEffect(() => {
    let timer;
    if (isPlayingDemo) {
      timer = setInterval(() => {
        setDemoStage((current) => {
          if (current >= 10) {
            setIsPlayingDemo(false);
            return 10;
          }
          const next = current + 1;
          handleSelectDemoStage(next);
          return next;
        });
      }, 3500);
    }
    return () => clearInterval(timer);
  }, [isPlayingDemo]);

  // Handle fire selection from sidebar or map: reset dispersion until user clicks Estimate
  const handleSelectFire = (fire) => {
    setSelectedFire(fire);
    setActivePlume(null); // Reset when event changes
    if (!fire) return;

    if (fire.is_emergency) {
      alertSound.playEmergencySiren();
    }
  };

  const handleTogglePlume = (explicitState) => {
    if (explicitState === false) {
      setActivePlume(null);
      return;
    }
    if (explicitState === true || !activePlume) {
      const exposure = selectedFire?.community_exposure || DEMO_FIRES[0].community_exposure;
      setActivePlume({
        type: 'Feature',
        properties: {
          downwind_azimuth_deg: 135.0,
          hazard_length_km: 2.8,
          risk_level: 'HIGH',
          community_exposure: exposure
        }
      });
    } else {
      setActivePlume(null);
    }
  };

  const handleOpenReport = (fire) => {
    if (fire?.fire_id === 'AGNI-DEMO-001') {
      setReportModalData(DEMO_INCIDENT_REPORT);
    } else {
      setReportModalData({
        fire_id: fire.fire_id,
        summary: `Demographic and spatial dispersion report for incident ${fire.fire_id}.`,
        classification: fire.category,
        threat_level: fire.threat_level,
        coordinates: { lat: fire.latitude, lon: fire.longitude }
      });
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#080b10] text-slate-100 select-none">
      {/* 1. Primary Navigation Header (DEMO MODE) */}
      <TacticalNavbar
        summary={DEMO_ANALYTICS_SUMMARY}
        isLive={true}
        activeEmergencyCount={activeEmergencies}
        totalEventsCount={activeFires.length}
        criticalCount={activeEmergencies}
        onBackToLanding={onBackToLanding}
        onBackToPlatform={onBackToPlatform}
        syncStatus="LIVE"
        syncMetadata={DEMO_ANALYTICS_SUMMARY.sync_metadata}
        newEventsCount={0}
        secondsToNextSync={300}
        onTriggerSync={() => {}}
        isDemoMode={true}
      />

      {/* 10-Stage Sequential Presentation Sequence */}
      <IntelligencePipelineStrip
        isLive={true}
        totalHotspots={activeFires.length}
        isDemoMode={true}
        demoStage={demoStage}
        onSelectStage={handleSelectDemoStage}
        isPlayingDemo={isPlayingDemo}
        onTogglePlayDemo={() => setIsPlayingDemo(prev => !prev)}
        onResetDemo={() => handleSelectDemoStage(1)}
      />

      {/* 2. Platform Viewport (2D Leaflet or 3D Cesium) */}
      <div className="flex-1 relative overflow-hidden">
        {/* Full-bleed Map Viewport: 3D Cesium or 2D Leaflet */}
        <div className="absolute inset-0">
          {mapViewMode === '3d' ? (
            <Cesium3DViewer
              fires={activeFires}
              selectedFire={selectedFire}
              onSelectFire={handleSelectFire}
              facilities={DEMO_FACILITIES}
              sensitiveLocations={DEMO_SENSITIVE_LOCATIONS}
              activePlume={activePlume}
              onExit3D={() => handleSelectMapViewMode(last2dBasemap || 'dark')}
              onReturnTo2D={() => handleSelectMapViewMode(last2dBasemap || 'dark')}
              onTogglePlume={handleTogglePlume}
              isPlumeActive={!!activePlume}
              plumeLoading={false}
              locateTrigger={locateTrigger}
              onOpenReport={handleOpenReport}
              showThermal={showThermalEvents}
              showFacility={showFacilities}
              showPlume={showPlume}
              showReceptors={showExposure}
            />
          ) : (
            <GisMapViewer
              fires={activeFires}
              facilities={DEMO_FACILITIES}
              sensitiveLocations={DEMO_SENSITIVE_LOCATIONS}
              selectedFire={selectedFire}
              onSelectFire={handleSelectFire}
              activePlume={activePlume}
              baseMap={mapViewMode === '3d' ? (last2dBasemap || 'dark') : mapViewMode}
              onSelectBaseMap={handleSelectMapViewMode}
              hideFloatingSelector={true}
              showThermalEvents={showThermalEvents}
              showFacilities={showFacilities}
              showPlume={showPlume}
              showExposure={showExposure}
              showOsmContext={showOsmContext}
              showOpticalContext={showOpticalContext}
              showModisContext={showModisContext}
            />
          )}
        </div>

        {/* Floating Left Operations Sidebar */}
        <OperationsSidebar
          fires={activeFires}
          filterMode={filterMode}
          setFilterMode={setFilterMode}
          selectedFire={selectedFire}
          onSelectFire={handleSelectFire}
          isLive={false}
          loading={false}
          is3DActive={mapViewMode === '3d'}
        />

        {/* Floating Map View Selector: 2D BASEMAPS & OVERLAYS ONLY (NO 3D) */}
        {mapViewMode !== '3d' && (
          <MapViewSelector
            mapViewMode={mapViewMode}
            onSelectMapViewMode={handleSelectMapViewMode}
            selectedFire={selectedFire}
            layersOpen={layersOpen}
            setLayersOpen={setLayersOpen}
            showThermalEvents={showThermalEvents}
            setShowThermalEvents={setShowThermalEvents}
            showFacilities={showFacilities}
            setShowFacilities={setShowFacilities}
            showPlume={showPlume}
            setShowPlume={setShowPlume}
            showExposure={showExposure}
            setShowExposure={setShowExposure}
            showOsmContext={showOsmContext}
            setShowOsmContext={setShowOsmContext}
            showOpticalContext={showOpticalContext}
            setShowOpticalContext={setShowOpticalContext}
            showModisContext={showModisContext}
            setShowModisContext={setShowModisContext}
          />
        )}

        {/* Bottom Centered Observation Timeline Scrubber */}
        <ThermalTimeline
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          scrubberHours={scrubberHours}
          setScrubberHours={setScrubberHours}
          isPlaying={isTimelinePlaying}
          setIsPlaying={setIsTimelinePlaying}
          totalEvents={activeFires.length}
          filteredCount={activeFires.length}
          is3DActive={mapViewMode === '3d'}
        />

        {/* Floating Incident Inspector Drawer */}
        {selectedFire && (
          <IncidentInspector
            fire={selectedFire}
            activePlume={activePlume}
            onClose={() => {
              alertSound.stopEmergencySiren();
              setSelectedFire(null);
              setActivePlume(null);
            }}
            onTogglePlume={handleTogglePlume}
            isPlumeActive={!!activePlume}
            onOpenReport={handleOpenReport}
            plumeLoading={false}
            onReplayEvent={(fire) => setReplayEvent(fire)}
            onEnter3D={() => handleSelectMapViewMode('3d')}
            is3DActive={mapViewMode === '3d'}
            onReturnTo2D={() => handleSelectMapViewMode(last2dBasemap || 'dark')}
          />
        )}
      </div>

      {/* 3. Executive Incident Report Modal */}
      {reportModalData && (
        <NdrfDossierModal
          report={reportModalData}
          onClose={() => setReportModalData(null)}
        />
      )}

      {/* 4. Temporal Satellite Pass Replay Modal */}
      {replayEvent && (
        <EventReplayModal
          event={replayEvent}
          onClose={() => setReplayEvent(null)}
        />
      )}
    </div>
  );
}
