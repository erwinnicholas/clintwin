import React, { useState, useEffect, useRef } from 'react';
import { Users, FileCheck, AlertCircle, FileX, Activity, Send, AlertTriangle, Info, Bot, Loader2, Database, UploadCloud, CheckCircle, FileText, Table, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { StatCard, StatusBadge, SectionHeader, AnimatedNumber } from '../components/common/UIComponents';
import PopulationTwin from '../components/PopulationTwin';
import GenomicProfile from '../components/GenomicProfile';
import { useGlobalData } from '../context/GlobalDataContext';
import { useAI } from '../context/AIContext';
import { fetchTrials, fetchPatients } from '../services/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const { metrics, activePatient, setActivePatient } = useGlobalData();
  const { toggleAssistant } = useAI();
  const [activePatientTab, setActivePatientTab] = useState('Overview');
  
  // Live API States
  const [trials, setTrials] = useState([]);
  const [patients, setPatients] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [liveTrials, livePatients] = await Promise.all([
          fetchTrials(),
          fetchPatients()
        ]);
        if (liveTrials) setTrials(liveTrials);
        else setTrials([]);
        
        if (livePatients) setPatients(livePatients);
        else setPatients([]);
      } catch (err) {
        import('react-hot-toast').then(({ default: toast }) => toast.error("Failed to load dashboard data."));
        console.error(err);
        setTrials([]);
        setPatients([]);
      }
    };
    loadData();
  }, []);
  
  const eligibilityData = [
    { name: 'Eligible', value: metrics.eligible, color: '#00e676' },
    { name: 'Under Review', value: metrics.review, color: '#ffd600' },
    { name: 'Not Eligible', value: metrics.notEligible, color: '#333333' }
  ];


  return (
    <div style={{ paddingBottom: '2rem' }}>
      {/* LAYER 3: KPI Overview */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <StatCard title="Total Patients (Twin)" value={metrics.total.toLocaleString()} subtext="Real-time population" trend="+1" icon={Users} color="0, 102, 255" />
        <StatCard title="Eligible for Trials" value={metrics.eligible.toLocaleString()} subtext="13.5% of total" trend="+1" icon={FileCheck} color="0, 230, 118" />
        <StatCard title="Under Review" value={metrics.review.toLocaleString()} subtext="5.8% of total" icon={AlertCircle} color="255, 214, 0" />
        <StatCard title="Not Eligible" value={metrics.notEligible.toLocaleString()} subtext="80.8% of total" icon={FileX} color="100, 100, 100" />
        <StatCard title="Active Trials" value={trials.length.toString()} subtext="Recruiting now" icon={Activity} color="157, 78, 221" />
      </div>

      {/* LAYER 4 & 5: Main Content Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* TOP ROW: 3D Twin & Side Panel */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem' }}>
          
          {/* Main Visualization */}
          <div className="glass-panel" style={{ padding: '1.5rem', minHeight: '520px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="flex-between" style={{ marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem' }}>Digital Twin Population</h3>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', background: 'var(--accent-green)', borderRadius: '50%' }}></div> Eligible (168)</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', background: 'var(--text-muted)', borderRadius: '50%' }}></div> Not Eligible (1,008)</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '8px', height: '8px', background: 'var(--accent-yellow)', borderRadius: '50%' }}></div> Under Review (72)</span>
                </div>
              </div>
            </div>
            
            <div style={{ flex: 1, position: 'relative', marginTop: '1rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                 <PopulationTwin 
                   patients={patients} 
                   interactiveTelemetry={true} 
                   onSelectPatient={(p) => setActivePatient(p)} 
                   activePatientId={activePatient?.id || (patients.length > 0 ? patients[0].id : null)} 
                 />
            </div>
            
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
              Tip: Drag to rotate • Scroll to zoom • Click on a person to view details
            </div>
          </div>

          {/* Right Side: Detail Panel & Assistant */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', justifyContent: 'space-between' }}>
            
            {/* Selected Patient Panel */}
            {activePatient ? (
              <div className="glass-panel fade-in" style={{ padding: '1.5rem' }}>
                <div className="flex-between" style={{ marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.1rem' }}>Selected Patient</h3>
                  <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setActivePatient(null)}>✕</button>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={24} color="var(--accent-blue)" />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{activePatient.id}</span>
                      <StatusBadge status={activePatient.status === 'green' || activePatient.score > 70 ? 'Eligible' : activePatient.status === 'yellow' || activePatient.score > 40 ? 'Under Review' : 'Not Eligible'} />
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{activePatient.gender}, {activePatient.age} Y</div>
                  </div>
                </div>

                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '1rem', display: 'flex', gap: '1rem', transition: 'all 0.3s' }}>
                  <span onClick={() => setActivePatientTab('Overview')} style={{ fontSize: '0.8rem', color: activePatientTab === 'Overview' ? 'var(--accent-blue)' : 'var(--text-secondary)', borderBottom: activePatientTab === 'Overview' ? '2px solid var(--accent-blue)' : '2px solid transparent', paddingBottom: '0.5rem', cursor: 'pointer' }}>Overview</span>
                  <span onClick={() => setActivePatientTab('Clinical Data')} style={{ fontSize: '0.8rem', color: activePatientTab === 'Clinical Data' ? 'var(--accent-blue)' : 'var(--text-secondary)', borderBottom: activePatientTab === 'Clinical Data' ? '2px solid var(--accent-blue)' : '2px solid transparent', paddingBottom: '0.5rem', cursor: 'pointer' }}>Clinical Data</span>
                  <span onClick={() => setActivePatientTab('Documents')} style={{ fontSize: '0.8rem', color: activePatientTab === 'Documents' ? 'var(--accent-blue)' : 'var(--text-secondary)', borderBottom: activePatientTab === 'Documents' ? '2px solid var(--accent-blue)' : '2px solid transparent', paddingBottom: '0.5rem', cursor: 'pointer' }}>Documents</span>
                </div>

                {activePatientTab === 'Overview' && (
                  <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                    <div className="flex-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Diagnosis</span>
                      <span>{activePatient.cancerType}</span>
                    </div>
                    <div className="flex-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Stage</span>
                      <span>{activePatient.stage}</span>
                    </div>
                    <div className="flex-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Eligibility Score</span>
                      <span>{activePatient.score}%</span>
                    </div>
                    <div className="flex-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Last Updated</span>
                      <span>{activePatient.lastUpdated}</span>
                    </div>
                  </div>
                )}
                {activePatientTab === 'Clinical Data' && (
                  <GenomicProfile patient={activePatient} />
                )}
                {activePatientTab === 'Documents' && (
                  <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <FileText size={16} color="var(--accent-blue)" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 500 }}>Clinical Notes - {activePatient.id}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>PDF • 1.2 MB</div>
                      </div>
                    </div>
                    <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <FileText size={16} color="var(--accent-purple)" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 500 }}>Lab Results (Blood Panel)</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>CSV • 45 KB</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => navigate('/dashboard/documents')}
                      style={{ background: 'transparent', border: 'none', color: 'var(--accent-blue)', fontSize: '0.8rem', cursor: 'pointer', textAlign: 'center', marginTop: '0.5rem', textDecoration: 'underline' }}
                    >
                      View All in Document Center
                    </button>
                  </div>
                )}
                
                <button 
                  className="btn btn-secondary" 
                  onClick={() => navigate('/dashboard/patients')}
                  style={{ width: '100%', marginTop: '1.5rem', background: 'rgba(0, 240, 255, 0.1)', border: '1px solid rgba(0, 240, 255, 0.3)', color: 'var(--accent-blue)' }}
                >
                  View Full Profile
                </button>
              </div>
            ) : (
              <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
                <Users size={32} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p style={{ fontSize: '0.85rem' }}>Select a digital twin profile from the population cohort to view detailed clinical diagnostics and simulated trajectories.</p>
              </div>
            )}

            {/* Research Assistant Pane */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1, minHeight: '350px', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(157, 78, 221, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--accent-purple)', marginBottom: '1.5rem' }}>
                <Bot size={32} color="var(--accent-purple)" />
              </div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>AI Context Copilot</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '80%' }}>
                The assistant has been upgraded to a global context-aware copilot. Click the button below or any "Explain AI Decision" button across the platform to summon it.
              </p>
              <button 
                onClick={() => toggleAssistant(true)}
                className="btn btn-primary"
                style={{ padding: '0.75rem 2rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
              >
                <Sparkles size={16} /> Open Global Copilot
              </button>
            </div>
          </div>
        </div>

        {/* BOTTOM ROW: Analytics Row (Spans Full Width) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
          
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <h4 style={{ marginBottom: '1.5rem', fontSize: '1rem' }}>Eligibility Breakdown</h4>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '100%', height: '200px', position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={eligibilityData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none">
                      {eligibilityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                   <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}><AnimatedNumber value={metrics.total.toLocaleString()} /></div>
                   <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Total</div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '1rem' }}>
               <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#00e676' }}><AnimatedNumber value={metrics.eligible} /></div><div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Eligible</div></div>
               <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#ffd600' }}><AnimatedNumber value={metrics.review} /></div><div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Review</div></div>
               <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#888' }}><AnimatedNumber value={metrics.notEligible} /></div><div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Excluded</div></div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <h4 style={{ marginBottom: '1.5rem', fontSize: '1rem' }}>Top Matching Trials</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
              {trials.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>No clinical trial pipelines initiated.</div>}
              {trials.slice(0, 4).map((trial, i) => (
                <div key={i} className="flex-between">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{trial.id}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{trial.area}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '150px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold', width: '30px', textAlign: 'right' }}><AnimatedNumber value={trial.matched} /></span>
                    <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
                      <div style={{ width: `${trial.progress}%`, height: '100%', background: 'var(--accent-green)', borderRadius: '3px', boxShadow: '0 0 10px rgba(0, 230, 118, 0.4)' }}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
               <span onClick={() => navigate('/dashboard/trials')} style={{ color: 'var(--accent-blue)', fontSize: '0.8rem', textDecoration: 'none', cursor: 'pointer' }}>View All Trials →</span>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <h4 style={{ marginBottom: '1.5rem', fontSize: '1rem' }}>Recent Alerts</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1, overflowY: 'auto' }}>
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>No clinical or system anomalies detected.</div>
            </div>
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
               <span onClick={() => navigate('/dashboard/monitoring')} style={{ color: 'var(--accent-blue)', fontSize: '0.8rem', textDecoration: 'none', cursor: 'pointer' }}>View All Alerts →</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
