import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import { GlobalDataProvider } from './context/GlobalDataContext';
import ErrorBoundary from './components/ErrorBoundary';
import CustomCursor from './components/CustomCursor';
import { Toaster } from 'react-hot-toast';
import { AIProvider } from './context/AIContext';
import GlobalAssistantDrawer from './components/common/GlobalAssistantDrawer';

// Pages
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import ClinicalTrials from './pages/ClinicalTrials';
import Eligibility from './pages/Eligibility';
import Documents from './pages/Documents';
import HospitalRules from './pages/HospitalRules';
import Compliance from './pages/Compliance';
import Settings from './pages/Settings';
import SystemAdmin from './pages/SystemAdmin';
import Reports from './pages/Reports';
import Monitoring from './pages/Monitoring';
import ResearchAssistant from './pages/ResearchAssistant';
import AdminUsers from './pages/AdminUsers';
import AdminPatients from './pages/AdminPatients';
import SystemHealth from './pages/SystemHealth';
import AuditLog from './pages/AuditLog';
import AdminReports from './pages/AdminReports';
import TrialDetail from './pages/TrialDetail';
import LiveSimulation from './pages/LiveSimulation';
import DataGenerator from './pages/DataGenerator';

import './index.css';

const Placeholder = ({ title }) => (
  <div className="flex-center" style={{ height: '70vh', flexDirection: 'column', gap: '1rem' }}>
    <h2 style={{ color: 'var(--text-secondary)' }}>{title}</h2>
    <p style={{ color: 'var(--text-muted)' }}>This workspace is currently being populated...</p>
  </div>
);

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
};

const RoleBasedRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'SYSTEM_ADMIN') return <Navigate to="/admin" replace />;
  return <Navigate to="/dashboard" replace />;
};

function AppRoutes() {
  return (
    <>
      <CustomCursor />
      <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RoleBasedRedirect />} />
      <Route 
        path="/dashboard/*" 
        element={
          <ProtectedRoute allowedRoles={['RESEARCH_ANALYST']}>
            <Routes>
              <Route path="/" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
              <Route path="/patients" element={<ErrorBoundary><Patients /></ErrorBoundary>} />
              <Route path="/trials" element={<ErrorBoundary><ClinicalTrials /></ErrorBoundary>} />
              <Route path="/trials/:trialId" element={<ErrorBoundary><TrialDetail /></ErrorBoundary>} />
              <Route path="/trials/:trialId/eligibility" element={<ErrorBoundary><Eligibility /></ErrorBoundary>} />
              <Route path="/live-sim/:trialId" element={<ErrorBoundary><LiveSimulation /></ErrorBoundary>} />
              <Route path="/ingestion" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} /> {/* Ingestion flow is triggered via dashboard modal */}
              <Route path="/rules" element={<ErrorBoundary><HospitalRules /></ErrorBoundary>} />
              <Route path="/monitoring" element={<ErrorBoundary><Monitoring /></ErrorBoundary>} />
              <Route path="/documents" element={<ErrorBoundary><Documents /></ErrorBoundary>} />
              <Route path="/reports" element={<ErrorBoundary><Reports /></ErrorBoundary>} />
              <Route path="/assistant" element={<ErrorBoundary><ResearchAssistant /></ErrorBoundary>} />
              <Route path="/data-generator" element={<ErrorBoundary><DataGenerator /></ErrorBoundary>} />
              <Route path="/settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
              <Route path="/*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/*" 
        element={
          <ProtectedRoute allowedRoles={['SYSTEM_ADMIN']}>
            <Routes>
              <Route path="/" element={<ErrorBoundary><SystemAdmin /></ErrorBoundary>} />
              <Route path="/users" element={<ErrorBoundary><AdminUsers /></ErrorBoundary>} />
              <Route path="/trials" element={<ErrorBoundary><ClinicalTrials isAdmin={true} /></ErrorBoundary>} />
              <Route path="/trials/:trialId" element={<ErrorBoundary><TrialDetail /></ErrorBoundary>} />
              <Route path="/patients" element={<ErrorBoundary><AdminPatients /></ErrorBoundary>} />
              <Route path="/compliance" element={<ErrorBoundary><Compliance /></ErrorBoundary>} />
              <Route path="/monitoring" element={<ErrorBoundary><SystemHealth /></ErrorBoundary>} />
              <Route path="/logs" element={<ErrorBoundary><AuditLog /></ErrorBoundary>} />
              <Route path="/reports" element={<ErrorBoundary><AdminReports /></ErrorBoundary>} />
              <Route path="/settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
              <Route path="/assistant" element={<ErrorBoundary><ResearchAssistant /></ErrorBoundary>} />
              <Route path="/*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </ProtectedRoute>
        } 
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    <GlobalAssistantDrawer />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <GlobalDataProvider>
        <AIProvider>
          <Router>
            <AppRoutes />
          </Router>
        </AIProvider>
      </GlobalDataProvider>
    </AuthProvider>
  );
}

export default App;
