import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Monitor, Users, Activity, Database, FileText, CheckCircle } from 'lucide-react';
import { StatCard, SectionHeader } from '../components/common/UIComponents';
import { useGlobalData } from '../context/GlobalDataContext';
import { trialsData } from '../mockData';

const SystemAdmin = () => {
  const { metrics, docIntelligenceData } = useGlobalData();
  const navigate = useNavigate();
  
  // Calculate dynamic stats based on live metrics to keep everything synchronized
  const activeTrialsCount = trialsData.filter(t => t.status === 'Active').length;
  const totalUsers = Math.floor(metrics.total / 4.5).toLocaleString(); // Scales with patients
  const totalDocs = Math.floor(metrics.total * 6.5).toLocaleString(); // Scales with patients
  const activeNow = Math.floor(metrics.total / 100);

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <SectionHeader 
        title="Platform Command Center" 
        subtitle="Global platform overview, user management, and system health" 
        action={
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => navigate('/admin/logs')} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
              <Activity size={16} style={{ marginRight: '8px' }}/> View Activities
            </button>
            <button onClick={() => navigate('/admin/monitoring')} className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>
              <Monitor size={16} style={{ marginRight: '8px' }}/> View Live Topology
            </button>
          </div>
        }
      />

      {/* LAYER 3: Platform Overview */}
      <h3 style={{ marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-secondary)' }}>PLATFORM OVERVIEW</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard title="Total Users" value={totalUsers} subtext={`${activeNow} active now`} icon={Users} color="0, 102, 255" />
        <StatCard title="Active Trials" value={activeTrialsCount.toString()} subtext="Across 42 orgs" icon={Activity} color="157, 78, 221" />
        <StatCard title="Total Patients" value={metrics.total.toLocaleString()} subtext="Live synced pool" icon={Database} color="0, 230, 118" />
        <StatCard title="Total Documents" value={totalDocs} subtext="Continuously parsed" icon={FileText} color="255, 145, 0" />
        <StatCard title="System Uptime" value="99.98%" subtext="Last 30 days" icon={CheckCircle} color="0, 230, 118" />
      </div>

    </div>
  );
};

export default SystemAdmin;
