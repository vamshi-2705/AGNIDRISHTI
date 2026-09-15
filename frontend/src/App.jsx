import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import TacticalNavbar from './components/TacticalNavbar';
import IntelligencePipelineStrip from './components/IntelligencePipelineStrip';
import OperationsSidebar from './components/OperationsSidebar';
import GisMapViewer from './components/GisMapViewer';
import IncidentInspector from './components/IncidentInspector';
import NdrfDossierModal from './components/NdrfDossierModal';
import IntroVideoModal from './components/IntroVideoModal';
import ThermalTimeline from './components/ThermalTimeline';
import EventReplayModal from './components/EventReplayModal';
import Cesium3DViewer from './components/Cesium3DViewer';
import Cesium3DInspector from './components/Cesium3DInspector';
import LandingPage from './LandingPage';
import InteractiveDemoPage from './components/InteractiveDemoPage';
import { alertSound } from './services/alertSound';
import {
  getAnalyticsSummary,
  getFires,
  getFacilities,
  getSensitiveLocations,
  getPlume,
  getIncidentReport
} from './services/api';

export default function App() {
  const [currentView, setCurrentView] = useState('landing'); // 'landing' | 'platform'
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
  const [showIntroVideo, setShowIntroVideo] = useState(false);
  const [inspectionMode, setInspectionMode] = useState('2D'); // '2D' | '3D'
  const [locateTrigger, setLocateTrigger] = useState(0);

  // Synchronization & Polling State
  const [syncStatus, setSyncStatus] = useState('LIVE'); // 'LIVE' | 'SYNCING' | 'STALE' | 'ERROR'
  const [syncMetadata, setSyncMetadata] = useState({});
  const [newEventsCount, setNewEventsCount] = useState(0);
  const [secondsToNextSync, setSecondsToNextSync] = useState(300);
  const isSyncingRef = useRef(false);

  // Timeline & Scrubber State
  const [timeRange, setTimeRange] = useState(24); // hours: 1, 3, 6, 12, 24
  const [scrubberHours, setScrubberHours] = useState(24);
  const [isTimelinePlaying, setIsTimelinePlaying] = useState(false);

  // Synchronize view with URL hash and browser history
  useEffect(() => {
    const syncViewWithHash = () => {
      const hash = window.location.hash;
      const path = window.location.pathname;
      if (hash === '#platform' || path === '/platform') {
        setCurrentView('platform');
      } else if (hash === '#demo' || path === '/demo') {
        setCurrentView('demo');
      } else {
        setCurrentView('landing');
      }
    };

    syncViewWithHash();

    window.addEventListener('popstate', syncViewWithHash);
    window.addEventListener('hashchange', syncViewWithHash);

    return () => {
      window.removeEventListener('popstate', syncViewWithHash);
      window.removeEventListener('hashchange', syncViewWithHash);
    };
  }, []);

  const handleOpenPlatform = () => {
    setCurrentView('platform');
    window.location.hash = 'platform';
  };

  const handleOpenDemo = () => {
    setCurrentView('demo');
    window.location.hash = 'demo';
  };

  const handleBackToLanding = () => {
    setCurrentView('landing');
    window.location.hash = '';
  };

  // 1. Initial Data Fetch: Render UI immediately and stream context asynchronously
  const loadInitialData = useCallback(async () => {
    setSyncStatus('SYNCING');
    try {
      // Fetch relatively static context asynchronously in background (do not block initial live FIRMS events)
      getFacilities().then(res => setFacilities(res.data)).catch(() => {});
      getSensitiveLocations().then(res => setSensitiveLocations(res.data)).catch(() => {});

      // Fetch authentic live NASA FIRMS detections
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
      console.error('[AGNIDRISHTI] Initialization error:', err);
      setSyncStatus('UNAVAILABLE');
    } finally {
      setLoading(false);
    }
  }, [filterMode]);

  useEffect(() => {
    loadInitialData();
  }, []);

  // 2. Continuous 5-Minute Non-Blocking Backend Synchronization Cycle (300 seconds)
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
        // Seamlessly update map and sidebar without flickering or clearing
        setFires(firesRes.data);
        setIsLive(firesRes.isLive);
        setSyncMetadata(firesRes.syncMetadata || sumRes?.data?.sync_metadata || {});
        setNewEventsCount(firesRes.syncMetadata?.new_events_detected || 0);
        setSyncStatus(firesRes.isLive ? 'LIVE' : 'UNAVAILABLE');
      } else if (!firesRes?.isLive) {
        // Requirement 18: Preserve last successful real data during temporary outage
        setSyncStatus('UNAVAILABLE');
      }
      setSecondsToNextSync(300);

      // If an event was selected, refresh its reference from new data
      if (selectedFire && firesRes?.data) {
        const updated = firesRes.data.find(f => f.fire_id === selectedFire.fire_id);
        if (updated) {
          setSelectedFire(updated);
        }
      }
    } catch (err) {
      console.warn('[AGNIDRISHTI] Background 5m sync error:', err);
      // Preserve existing real data and signal status
      setSyncStatus('UNAVAILABLE');
    } finally {
      isSyncingRef.current = false;
    }
  }, [filterMode, selectedFire]);

  // 5-minute synchronization interval
  useEffect(() => {
    const syncInterval = setInterval(() => {
      performSync();
    }, 300000); // 5 minutes = 300,000 ms

    return () => clearInterval(syncInterval);
  }, [performSync]);

  // 1-second countdown timer for next synchronization
  useEffect(() => {
    const countdown = setInterval(() => {
      setSecondsToNextSync((prev) => (prev > 1 ? prev - 1 : 300));
    }, 1000);

    return () => clearInterval(countdown);
  }, []);

  // 3. Refetch fires when filterMode changes (seamless transition without blanking)
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
        console.error('[AGNIDRISHTI] Filter update error:', err);
      }
    }
    updateFires();
    return () => { isMounted = false; };
  }, [filterMode]);

  // 4. Timeline auto-play timer
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

  // 5. Timeline-filtered events
  const timelineFilteredFires = useMemo(() => {
    if (scrubberHours >= timeRange) return fires;
    // Keep events whose age is within scrubberHours relative to newest
    return fires.slice(0, Math.max(1, Math.ceil((scrubberHours / timeRange) * fires.length)));
  }, [fires, scrubberHours, timeRange]);

  // 6. Handle fire selection from sidebar or map
  const handleSelectFire = async (fire) => {
    setSelectedFire(fire);
    setActivePlume(null);
    if (!fire) return;

    setPlumeLoading(true);
    try {
      const res = await getPlume(fire.fire_id);
      setActivePlume(res.data);
    } catch (err) {
      console.error('[AGNIDRISHTI] Auto plume fetch error:', err);
    } finally {
      setPlumeLoading(false);
    }
  };

  // 7. Handle plume dispersion render toggle
  const handleTogglePlume = async () => {
    if (activePlume) {
      setActivePlume(null);
      return;
    }

    if (!selectedFire) return;

    setPlumeLoading(true);
    try {
      const res = await getPlume(selectedFire.fire_id);
      setActivePlume(res.data);
    } catch (err) {
      console.error('[AGNIDRISHTI] Plume error:', err);
    } finally {
      setPlumeLoading(false);
    }
  };

  // 8. Handle NDRF Dossier Report Open
  const handleOpenReport = async () => {
    if (!selectedFire) return;
    try {
      const res = await getIncidentReport(selectedFire.fire_id);
      setReportModalData(res.data);
    } catch (err) {
      console.error('[AGNIDRISHTI] Report error:', err);
    }
  };

  const activeEmergencies = fires.filter(f => f.is_emergency).length;

  if (currentView === 'landing') {
    return (
      <>
        <LandingPage 
          onOpenPlatform={handleOpenPlatform} 
          onOpenDemo={handleOpenDemo}
          onPlayIntro={() => setShowIntroVideo(true)}
        />
        {showIntroVideo && (
          <IntroVideoModal onClose={() => setShowIntroVideo(false)} />
        )}
      </>
    );
  }

  if (currentView === 'demo') {
    return (
      <>
        <InteractiveDemoPage
          fires={fires}
          facilities={facilities}
          sensitiveLocations={sensitiveLocations}
          onOpenPlatform={handleOpenPlatform}
          onBackToLanding={handleBackToLanding}
          onOpenReport={async (targetFire) => {
            const fireObj = targetFire || selectedFire;
            if (!fireObj) return;
            try {
              const res = await getIncidentReport(fireObj.fire_id);
              setReportModalData(res.data);
            } catch (err) {
              console.error('[AGNIDRISHTI] Report error:', err);
            }
          }}
        />
        {reportModalData && (
          <NdrfDossierModal
            report={reportModalData}
            onClose={() => setReportModalData(null)}
          />
        )}
      </>
    );
  }

  // Dedicated 3D Geospatial Incident Inspection Mode
  if (inspectionMode === '3D') {
    return (
      <div className="h-screen w-screen overflow-hidden bg-[#080b10] text-slate-100 select-none relative">
        <Cesium3DViewer
          selectedFire={selectedFire}
          facilities={facilities}
          sensitiveLocations={sensitiveLocations}
          activePlume={activePlume}
          onExit3D={() => setInspectionMode('2D')}
          onTogglePlume={handleTogglePlume}
          isPlumeActive={!!activePlume}
          plumeLoading={plumeLoading}
          locateTrigger={locateTrigger}
          onOpenReport={handleOpenReport}
          onLocateEvent={() => setLocateTrigger(prev => prev + 1)}
        />
        {reportModalData && (
          <NdrfDossierModal
            report={reportModalData}
            onClose={() => setReportModalData(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#080b10] text-slate-100 select-none">
      {/* 1. Primary Navigation Header */}
      <TacticalNavbar
        summary={summary}
        isLive={isLive}
        activeEmergencyCount={activeEmergencies}
        onBackToLanding={handleBackToLanding}
        onOpenDemo={handleOpenDemo}
        syncStatus={syncStatus}
        syncMetadata={syncMetadata}
        newEventsCount={newEventsCount}
        secondsToNextSync={secondsToNextSync}
        onTriggerSync={performSync}
      />

      {/* Operational Intelligence Pipeline & Data Sources Strip */}
      <IntelligencePipelineStrip
        isLive={isLive}
        totalHotspots={fires.length}
      />

      {/* 2. 2D Platform Viewport */}
      <div className="flex-1 relative overflow-hidden">
          {/* Full-bleed GIS Satellite Viewport */}
          <div className="absolute inset-0">
            <GisMapViewer
              fires={timelineFilteredFires}
              facilities={facilities}
              sensitiveLocations={sensitiveLocations}
              selectedFire={selectedFire}
              onSelectFire={handleSelectFire}
              activePlume={activePlume}
            />
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
          />

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
          />

          {/* Floating Incident Inspector Drawer */}
          {selectedFire && (
            <IncidentInspector
              fire={selectedFire}
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
              onEnter3D={() => setInspectionMode('3D')}
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
