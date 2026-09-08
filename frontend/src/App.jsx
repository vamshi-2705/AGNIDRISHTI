import React, { useState, useEffect, useCallback } from 'react';
import TacticalNavbar from './components/TacticalNavbar';
import OperationsSidebar from './components/OperationsSidebar';
import GisMapViewer from './components/GisMapViewer';
import IncidentInspector from './components/IncidentInspector';
import NdrfDossierModal from './components/NdrfDossierModal';
import {
  getAnalyticsSummary,
  getFires,
  getFacilities,
  getPlume,
  getIncidentReport
} from './services/api';

export default function App() {
  const [summary, setSummary] = useState(null);
  const [fires, setFires] = useState([]);
  const [facilities, setFacilities] = useState(null);
  const [filterMode, setFilterMode] = useState('all');
  const [selectedFire, setSelectedFire] = useState(null);
  const [activePlume, setActivePlume] = useState(null);
  const [reportModalData, setReportModalData] = useState(null);
  const [isLive, setIsLive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [plumeLoading, setPlumeLoading] = useState(false);

  // 1. Initial Data Fetch
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, facRes, firesRes] = await Promise.all([
        getAnalyticsSummary(),
        getFacilities(),
        getFires(filterMode)
      ]);

      setSummary(sumRes.data);
      setFacilities(facRes.data);
      setFires(firesRes.data);
      setIsLive(firesRes.isLive);
    } catch (err) {
      console.error('[ASTRAFIRE] Initialization error:', err);
    } finally {
      setLoading(false);
    }
  }, [filterMode]);

  useEffect(() => {
    loadInitialData();
  }, []);

  // 2. Refetch fires when filterMode changes (skip on initial mount to avoid duplicate fetch)
  const isInitialMount = React.useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    let isMounted = true;
    async function updateFires() {
      setLoading(true);
      const res = await getFires(filterMode);
      if (isMounted) {
        setFires(res.data);
        setIsLive(res.isLive);
        setLoading(false);
      }
    }
    updateFires();
    return () => { isMounted = false; };
  }, [filterMode]);

  // 3. Handle fire selection from sidebar or map
  const handleSelectFire = async (fire) => {
    setSelectedFire(fire);
    setActivePlume(null); // Reset active plume on new fire selection
  };

  // 4. Handle plume dispersion render toggle
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
      console.error('[ASTRAFIRE] Plume error:', err);
    } finally {
      setPlumeLoading(false);
    }
  };

  // 5. Handle NDRF Dossier Report Open
  const handleOpenReport = async () => {
    if (!selectedFire) return;
    try {
      const res = await getIncidentReport(selectedFire.fire_id);
      setReportModalData(res.data);
    } catch (err) {
      console.error('[ASTRAFIRE] Report error:', err);
    }
  };

  const activeEmergencies = fires.filter(f => f.is_emergency).length;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#080c14] text-slate-100 select-none">
      {/* 1. Tactical Navigation Header */}
      <TacticalNavbar
        summary={summary}
        isLive={isLive}
        activeEmergencyCount={activeEmergencies}
      />

      {/* 2. Main Body (Sidebar + GIS Map) */}
      <div className="flex flex-1 relative overflow-hidden">
        {/* Left Intelligence Operations Sidebar */}
        <OperationsSidebar
          fires={fires}
          filterMode={filterMode}
          setFilterMode={setFilterMode}
          selectedFire={selectedFire}
          onSelectFire={handleSelectFire}
          isLive={isLive}
          loading={loading}
        />

        {/* Main Center GIS Satellite Viewport */}
        <main className="flex-1 relative h-full">
          <GisMapViewer
            fires={fires}
            facilities={facilities}
            selectedFire={selectedFire}
            onSelectFire={handleSelectFire}
            activePlume={activePlume}
          />

          {/* Floating Incident Inspector Drawer */}
          {selectedFire && (
            <IncidentInspector
              fire={selectedFire}
              onClose={() => {
                setSelectedFire(null);
                setActivePlume(null);
              }}
              onTogglePlume={handleTogglePlume}
              isPlumeActive={!!activePlume}
              onOpenReport={handleOpenReport}
              plumeLoading={plumeLoading}
            />
          )}
        </main>
      </div>

      {/* 3. Executive NDRF Dossier Modal */}
      {reportModalData && (
        <NdrfDossierModal
          report={reportModalData}
          onClose={() => setReportModalData(null)}
        />
      )}
    </div>
  );
}
