import React, { createContext, useContext, useState, useEffect } from 'react';
import { initialMetrics, initialMonitoringStats, aiPatientTrialMatchingMock, researchDocumentIntelligenceMock } from './GlobalDataContext_mock_data';
import { fetchSummary } from '../services/api';

const GlobalDataContext = createContext();

export const useGlobalData = () => {
  const context = useContext(GlobalDataContext);
  if (!context) {
    throw new Error('useGlobalData must be used within a GlobalDataProvider');
  }
  return context;
};

export const GlobalDataProvider = ({ children }) => {
  // Core metrics used across StatCards
  const [metrics, setMetrics] = useState(initialMetrics);
  const [isLive, setIsLive] = useState(false);

  const [monitoringStats, setMonitoringStats] = useState(initialMonitoringStats);
  const [matchingData, setMatchingData] = useState(aiPatientTrialMatchingMock);
  const [docIntelligenceData, setDocIntelligenceData] = useState(researchDocumentIntelligenceMock);
  const [activePatient, setActivePatient] = useState(null);

  // Persistent simulation state keyed by trialId
  const [simState, setSimState] = useState({});

  const refreshGlobalMetrics = async () => {
    try {
      const summary = await fetchSummary();
      setMetrics({
        total: summary.funnel.initial_pool,
        eligible: summary.funnel.enrolled,
        review: summary.funnel.under_review,
        notEligible: summary.funnel.not_eligible,
        unprocessed: summary.funnel.unprocessed,
        activeTrials: summary.funnel.active_trials
      });
      setIsLive(true);
    } catch (err) {
      console.error("Failed to load real summary, falling back to mock.", err);
    }
  };

  useEffect(() => {
    refreshGlobalMetrics();
  }, []);

  return (
    <GlobalDataContext.Provider value={{ metrics, setMetrics, matchingData, docIntelligenceData, monitoringStats, activePatient, setActivePatient, isLive, simState, setSimState, refreshGlobalMetrics }}>
      {children}
    </GlobalDataContext.Provider>
  );
};
