import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  getAnalyticsSummary,
  getFires,
  getFacilities,
  getSensitiveLocations,
  getPlume,
  getIncidentReport
} from '../services/api';

/**
 * PlatformPage — The Original Real AGNIDRISHTI Platform (/platform)
 * 
 * Strictly uses authentic NASA FIRMS / VIIRS satellite detections,
 * real backend APIs, real temporal persistence analysis, and live telemetry.
 * 
 * NEVER loads demo data.
 * NEVER falls back to demo data.
 */
export default function PlatformPage({
  onBackToLanding,
  onOpenDemo
}) {
  const [summary, setSummary] = useState(null);
  const [fires, setFires] = useState([]);
  const [facilities, setFacilities] = useState(null);
  const [sensitiveLocations, setSensitiveLocations] = useState(null);
  const [filterMode, setFilterMode] = useState('all');
  const [selectedFire, setSelectedFire] = useState(null);
  const [activePlume, setActivePlume] = useState(null);
  const [reportModalData, setReportModalData] = useState(null);
  const [replayEvent, setReplayEvent] = useState(null);
  const [isLive, setIsLive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [plumeLoading, setPlumeLoading] = useState(false);

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

  // Synchronization & Polling State
  const [syncStatus, setSyncStatus] = useState('LIVE');
  const [syncMetadata, setSyncMetadata] = useState({});
  const [newEventsCount, setNewEventsCount] = useState(0);
  const [secondsToNextSync, setSecondsToNextSync] = useState(300);
  const isSyncingRef = useRef(false);

  // Timeline & Scrubber State
  const [timeRange, setTimeRange] = useState(24);
  const [scrubberHours, setScrubberHours] = useState(24);
  const [isTimelinePlaying, setIsTimelinePlaying] = useState(false);

  // 1. Initial Data Fetch: Render UI immediately and stream context asynchronously
  const loadInitialData = useCallback(async () => {
    setSyncStatus('SYNCING');
    try {
      getFacilities().then(res => setFacilities(res.data)).catch(() => {});
      getSensitiveLocations().then(res => setSensitiveLocations(res.data)).catch(() => {});

      const [sumRes, firesRes] = await Promise.all([
        getAnalyticsSummary(),
        getFires(filterMode)
      ]);

      if (sumRes?.data) setSummary(sumRes.data);
      if (firesRes?.data && firesRes.data.length > 0) {
        setFires(firesRes.data);
        setIsLive(firesRes.isLive);
        setSyncMetadata(firesRes.syncMetadata || sumRes?.data?.sync_metadata || {});
        setNewEventsCount(firesRes.syncMetadata?.new_events_detected || 0);
        setSyncStatus(firesRes.isLive ? 'LIVE' : 'UNAVAILABLE');
      } else if (firesRes?.data) {
        setFires(firesRes.data);
        setIsLive(firesRes.isLive);
        setSyncStatus(firesRes.isLive ? 'LIVE' : 'UNAVAILABLE');
      }
      setSecondsToNextSync(300);
    } catch (err) {
      console.error('[AGNIDRISHTI-REAL] Initialization error:', err);
      setSyncStatus('UNAVAILABLE');
    } finally {
      setLoading(false);
    }
  }, [filterMode]);

  useEffect(() => {
    loadInitialData();
  }, []);

  // 2. Continuous 5-Minute Backend Synchronization Cycle (300 seconds)
  const performSync = useCallback(async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setSyncStatus('SYNCING');

    try {
      const [sumRes, firesRes] = await Promise.all([
        getAnalyticsSummary(),
        getFires(filterMode)
      ]);

      if (sumRes?.data) setSummary(sumRes.data);
      if (firesRes?.data && firesRes.data.length > 0) {
        setFires(firesRes.data);
        setIsLive(firesRes.isLive);
        setSyncMetadata(firesRes.syncMetadata || sumRes?.data?.sync_metadata || {});
        setNewEventsCount(firesRes.syncMetadata?.new_events_detected || 0);
        setSyncStatus(firesRes.isLive ? 'LIVE' : 'UNAVAILABLE');
      } else if (!firesRes?.isLive) {
        setSyncStatus('UNAVAILABLE');
      }
      setSecondsToNextSync(300);

      if (selectedFire && firesRes?.data) {
        const updated = firesRes.data.find(f => f.fire_id === selectedFire.fire_id);
        if (updated) setSelectedFire(updated);
      }
    } catch (err) {
      console.warn('[AGNIDRISHTI-REAL] Background 5m sync error:', err);
      setSyncStatus('UNAVAILABLE');
    } finally {
      isSyncingRef.current = false;
    }
  }, [filterMode, selectedFire]);

  useEffect(() => {
    const syncInterval = setInterval(() => {
      performSync();
    }, 300000);
    return () => clearInterval(syncInterval);
  }, [performSync]);

  useEffect(() => {
    const countdown = setInterval(() => {
      setSecondsToNextSync((prev) => (prev > 1 ? prev - 1 : 300));
    }, 1000);
    return () => clearInterval(countdown);
  }, []);

  // Filter updates in real mode
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    let isMounted = true;
    async function updateFires() {
      try {
        const res = await getFires(filterMode);
        if (isMounted && res?.data) {
          setFires(res.data);
          setIsLive(res.isLive);
        }
      } catch (err) {
        console.error('[AGNIDRISHTI-REAL] Filter update error:', err);
      }
    }
    updateFires();
    return () => { isMounted = false; };
  }, [filterMode]);

  // Timeline auto-play timer
  useEffect(() => {
    let playTimer;
    if (isTimelinePlaying) {
      playTimer = setInterval(() => {
        setScrubberHours((prev) => {
          if (prev >= timeRange) {
            setIsTimelinePlaying(false);
            return timeRange;
          }
          return Math.min(timeRange, Number((prev + 1).toFixed(1)));
        });
      }, 1000);
    }
    return () => clearInterval(playTimer);
  }, [isTimelinePlaying, timeRange]);

  const activeEmergencies = useMemo(() => {
    return fires.filter(f => f.is_emergency).length;
  }, [fires]);

  // Timeline-filtered events
  const timelineFilteredFires = useMemo(() => {
    if (scrubberHours >= timeRange) return fires;
    return fires.slice(0, Math.max(1, Math.ceil((scrubberHours / timeRange) * fires.length)));
  }, [fires, scrubberHours, timeRange]);

  // Handle fire selection from sidebar or map: reset dispersion until user clicks Estimate
  const handleSelectFire = (fire) => {
    setSelectedFire(fire);
    setActivePlume(null); // Reset when event changes
    if (!fire) return;

    if (fire.is_emergency) {
      alertSound.playEmergencySiren();
    }
  };

  const handleTogglePlume = async (explicitState) => {
    if (explicitState === false) {
      setActivePlume(null);
      return;
    }

    if (explicitState === true || !activePlume) {
      if (selectedFire) {
        setPlumeLoading(true);
        try {
          const res = await getPlume(selectedFire.fire_id);
          if (res.data) setActivePlume(res.data);
        } catch (err) {
          console.warn('[AGNIDRISHTI-REAL] Failed to estimate plume:', err);
        } finally {
          setPlumeLoading(false);
        }
      }
    } else {
      setActivePlume(null);
    }
  };

  const handleOpenReport = async (fire) => {
    try {
      const res = await getIncidentReport(fire.fire_id);
      if (res.data) setReportModalData(res.data);
    } catch (err) {
      console.error('[AGNIDRISHTI-REAL] Failed to fetch incident report:', err);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#080b10] text-slate-100 select-none">
      {/* 1. Primary Navigation Header (REAL MODE) */}
      <TacticalNavbar
        summary={summary}
        isLive={isLive}
        activeEmergencyCount={activeEmergencies}
        totalEventsCount={fires.length}
        criticalCount={activeEmergencies}
        onBackToLanding={onBackToLanding}
        onOpenDemo={onOpenDemo}
        syncStatus={syncStatus}
        syncMetadata={syncMetadata}
        newEventsCount={newEventsCount}
        secondsToNextSync={secondsToNextSync}
        onTriggerSync={performSync}
        isDemoMode={false}
      />

      {/* Operational Intelligence Pipeline (Real Mode: 6-stage operational pipeline) */}
      <IntelligencePipelineStrip
        isLive={isLive}
        totalHotspots={fires.length}
        isDemoMode={false}
      />

      {/* 2. Platform Viewport (2D Leaflet or 3D Cesium) */}
      <div className="flex-1 relative overflow-hidden">
        {/* Full-bleed Map Viewport: 3D Cesium or 2D Leaflet */}
        <div className="absolute inset-0">
          {mapViewMode === '3d' ? (
            <Cesium3DViewer
              fires={timelineFilteredFires}
              selectedFire={selectedFire}
              onSelectFire={handleSelectFire}
              facilities={facilities}
              sensitiveLocations={sensitiveLocations}
              activePlume={activePlume}
              onExit3D={() => handleSelectMapViewMode(last2dBasemap || 'dark')}
              onReturnTo2D={() => handleSelectMapViewMode(last2dBasemap || 'dark')}
              onTogglePlume={handleTogglePlume}
              isPlumeActive={!!activePlume}
              plumeLoading={plumeLoading}
              locateTrigger={locateTrigger}
              onOpenReport={handleOpenReport}
              showThermal={showThermalEvents}
              showFacility={showFacilities}
              showPlume={showPlume}
              showReceptors={showExposure}
            />
          ) : (
            <GisMapViewer
              fires={timelineFilteredFires}
              facilities={facilities}
              sensitiveLocations={sensitiveLocations}
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
          fires={timelineFilteredFires}
          filterMode={filterMode}
          setFilterMode={setFilterMode}
          selectedFire={selectedFire}
          onSelectFire={handleSelectFire}
          isLive={isLive}
          loading={loading}
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
          totalEvents={fires.length}
          filteredCount={timelineFilteredFires.length}
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
            plumeLoading={plumeLoading}
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
