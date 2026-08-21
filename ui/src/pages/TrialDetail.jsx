import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Users, Activity, CheckCircle, Shield,
  TrendingUp, FileText, AlertCircle, Star, Award, User,
  Heart, ChevronRight, X, XCircle, Stethoscope, Dna, Eye, Play
} from 'lucide-react';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell, ResponsiveContainer
} from 'recharts';

import { fetchTrials, fetchTrialCriteria, startSimulation, fetchSimStatus, fetchSimResults } from '../services/api';
import PopulationTwin from '../components/PopulationTwin';
import { useGlobalData } from '../context/GlobalDataContext';

const areaColorMap = { Oncology: '#ff3d00', Cardiovascular: '#00f0ff', Neurology: '#9d4edd', Gastroenterology: '#ff9100', Endocrinology: '#00e676' };

// Maps pipeline_stage to human-readable label and progress %
const PIPELINE_LABELS = {
  NONE: { label: 'Created — Awaiting Pipeline', progress: 0 },
  HARD_FILTER: { label: 'Hard Filter Complete', progress: 25 },
  SEMANTIC_FILTER: { label: 'Semantic Filter Complete', progress: 50 },
  COMPLIANCE: { label: 'Compliance Checked', progress: 65 },
  TWINS: { label: 'Digital Twins Built', progress: 80 },
  COMPLETED: { label: 'Pipeline Complete', progress: 100 },
};

const getPipelineInfo = (stage) => PIPELINE_LABELS[stage] || { label: stage || 'Unknown', progress: 0 };

// Parse trial description string "Disease: X, Phase: Y" into structured fields
const parseDescription = (desc) => {
  if (!desc) return {};
  const fields = {};
  const diseaseMatch = desc.match(/Disease:\s*([^,]+)/i);
  const phaseMatch = desc.match(/Phase:\s*([^,]+)/i);
  if (diseaseMatch) fields.disease = diseaseMatch[1].trim();
  if (phaseMatch) fields.phase = phaseMatch[1].trim();
  return fields;
};

const StarRating = ({ rating }) => (
  React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '2px' } },
    [1,2,3,4,5].map(i =>
      React.createElement(Star, { key: i, size: 12, fill: i <= Math.floor(rating) ? '#FFD600' : 'none', color: i <= Math.floor(rating) ? '#FFD600' : 'rgba(255,255,255,0.2)' })
    ),
    React.createElement('span', { style: { fontSize: '0.75rem', color: '#FFD600', marginLeft: '4px', fontWeight: 600 } }, rating)
  )
);

const DoctorPanel = ({ patient, accentColor, onClose }) => {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, backdropFilter: 'blur(6px)' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '840px', maxWidth: '97vw', maxHeight: '90vh', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 32px 100px rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1.1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Patient</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: accentColor }}>{patient.id}</span>
            <ChevronRight size={14} color="var(--text-muted)" />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Details</span>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', color: 'white', width: '30px', height: '30px', borderRadius: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
        </div>
        <div style={{ display: 'flex', flex: 1, padding: '2rem', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
          <div>No detailed patient or doctor mock data available. Backend fetching for patient details needed in future phase.</div>
        </div>
      </div>
    </div>
  );
};


const TrialDetail = () => {
  const { trialId } = useParams();
  const navigate = useNavigate();
  const { simState } = useGlobalData();
  const [activeTab, setActiveTab] = useState('Overview');
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Live State
  const [trial, setTrial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simulationStatus, setSimulationStatus] = useState('idle');
  const [simulationResults, setSimulationResults] = useState(null);

  const [criteria, setCriteria] = useState(null);
  const [trialFiles, setTrialFiles] = useState({ csvName: null, textName: null });
  const [isEnded, setIsEnded] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const trials = await fetchTrials();
        const found = trials.find(t => t.trial_id === trialId);
        if (found) {
          setTrial(found);
          const crit = await fetchTrialCriteria(trialId);
          setCriteria(crit);
          
          const savedFiles = localStorage.getItem(`trial_files_${trialId}`);
          if (savedFiles) setTrialFiles(JSON.parse(savedFiles));
          
          const ended = localStorage.getItem(`trial_ended_${trialId}`);
          if (ended === 'true') setIsEnded(true);
        } else {
          setTrial(null);
        }
      } catch (err) {
        setTrial(null);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [trialId]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>Loading...</div>;
  }

  if (!trial) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem' }}>
        <AlertCircle size={48} color="var(--accent-red)" />
        <h2>Trial Not Found</h2>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

  const descFields = parseDescription(trial.description);
  const accentColor = areaColorMap[descFields.disease] || '#00f0ff';
  const pipeInfo = getPipelineInfo(trial.pipeline_stage);
  const enrollPct = isEnded ? 100 : pipeInfo.progress;
  const tabs = ['Overview', 'Enrollment', 'Matched Patients', 'Endpoints'];
  const arcLen = 188.5;
  const hasActiveSim = simState[trialId]?.status === 'running' || simState[trialId]?.status === 'paused';

  return (
    <div style={{ paddingBottom: '3rem' }}>
      {/* Header Panel */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.1rem' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.45rem 0.7rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
            <ArrowLeft size={14} /> Back
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: accentColor }}>{trial.trial_id}</h1>
              <span style={{ padding: '0.18rem 0.6rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 600, background: isEnded ? 'rgba(0,102,255,0.12)' : 'rgba(0,230,118,0.12)', color: isEnded ? 'var(--accent-blue)' : 'var(--accent-green)', border: `1px solid ${isEnded ? 'rgba(0,102,255,0.25)' : 'rgba(0,230,118,0.25)'}` }}>
                ● {isEnded ? 'Completed' : pipeInfo.label}
              </span>
              {descFields.phase && (
                <span style={{ padding: '0.18rem 0.5rem', borderRadius: '20px', fontSize: '0.68rem', fontWeight: 600, background: 'rgba(157,78,221,0.12)', color: 'var(--accent-purple)', border: '1px solid rgba(157,78,221,0.25)' }}>
                  Phase {descFields.phase}
                </span>
              )}
              <button onClick={() => navigate('/dashboard/trials/' + trialId + '/eligibility')} style={{ marginLeft: 'auto', background: 'linear-gradient(135deg, rgba(157,78,221,0.2), rgba(0,240,255,0.2))', border: '1px solid rgba(157,78,221,0.4)', color: '#c084fc', padding: '0.4rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Dna size={14} /> View Digital Twins
              </button>
              {hasActiveSim ? (
                <button onClick={() => navigate('/dashboard/live-sim/' + trialId)} style={{ background: 'linear-gradient(135deg, rgba(0,240,255,0.8), rgba(0,230,118,0.8))', border: 'none', color: 'white', padding: '0.4rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Play size={14} /> Continue Live Monitor
                </button>
              ) : (
                <button onClick={() => navigate('/dashboard/trials/' + trialId + '/eligibility')} style={{ background: 'linear-gradient(135deg, rgba(255,61,0,0.8), rgba(157,78,221,0.8))', border: 'none', color: 'white', padding: '0.4rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Play size={14} /> Start Trial
                </button>
              )}
              {!isEnded && (
                <button onClick={() => { localStorage.setItem(`trial_ended_${trialId}`, 'true'); setIsEnded(true); }} style={{ background: 'rgba(255,60,60,0.1)', border: '1px solid rgba(255,60,60,0.3)', color: 'var(--accent-red)', padding: '0.35rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
                  End Trial
                </button>
              )}
            </div>
            <div style={{ fontSize: '0.92rem', fontWeight: 500, marginTop: '0.15rem' }}>{trial.title}</div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>{trial.description || 'No detailed description'}</div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {[{ label: 'Pipeline', value: `${enrollPct}%`, color: accentColor }, { label: 'Stage', value: trial.pipeline_stage === 'NONE' ? 'Pending' : trial.pipeline_stage.replace(/_/g, ' '), color: 'var(--accent-blue)' }, { label: 'Status', value: isEnded ? 'Ended' : trial.status, color: 'var(--accent-purple)' }].map((s, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '0.6rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ background: 'none', border: 'none', borderBottom: activeTab === tab ? `2px solid ${accentColor}` : '2px solid transparent', color: activeTab === tab ? 'white' : 'var(--text-secondary)', padding: '0.65rem 1.1rem', cursor: 'pointer', fontSize: '0.84rem', fontWeight: activeTab === tab ? 600 : 400, marginBottom: '-1px', transition: 'all 0.2s' }}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* OVERVIEW */}
      {activeTab === 'Overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={14} color={accentColor} /> Trial Information</h3>
            {[
              { label: 'Trial ID', value: trial.trial_id },
              { label: 'Target Disease', value: descFields.disease || 'Not specified' },
              { label: 'Phase', value: descFields.phase ? `Phase ${descFields.phase}` : 'Not specified' },
              { label: 'Pipeline Stage', value: pipeInfo.label },
              { label: 'Status', value: isEnded ? 'Completed' : trial.status },
              { label: 'Created', value: trial.created_at ? new Date(trial.created_at).toLocaleDateString() : '-' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.81rem', padding: '0.48rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                <span style={{ fontWeight: 500, textAlign: 'right', maxWidth: '55%' }}>{item.value}</span>
              </div>
            ))}
            {(trialFiles.csvName || trialFiles.textName) && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Uploaded Source Documents</div>
                {trialFiles.csvName && <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--accent-green)', marginBottom: '0.3rem' }}><FileText size={13} /> {trialFiles.csvName}</div>}
                {trialFiles.textName && <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--accent-blue)' }}><FileText size={13} /> {trialFiles.textName}</div>}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h3 style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '0.65rem', alignSelf: 'flex-start' }}>Enrollment Progress</h3>
              <div style={{ position: 'relative', width: '140px', height: '70px', overflow: 'hidden' }}>
                <svg width="140" height="70" viewBox="0 0 140 70">
                  <path d="M 10 70 A 60 60 0 0 1 130 70" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" strokeLinecap="round" />
                  <path d="M 10 70 A 60 60 0 0 1 130 70" fill="none" stroke={accentColor} strokeWidth="12" strokeLinecap="round" strokeDasharray={`${(enrollPct / 100) * arcLen} ${arcLen}`} />
                </svg>
                <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.35rem', fontWeight: 700, color: accentColor }}>{enrollPct}%</div>
                </div>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>- / - patients</div>
            </div>
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Shield size={14} color={accentColor} /> Adverse Events</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.55rem' }}>
                {[{ label: 'Mild', count: '-', color: 'var(--accent-green)' }, { label: 'Moderate', count: '-', color: 'var(--accent-yellow)' }, { label: 'Severe', count: '-', color: 'var(--accent-red)' }, { label: 'Total', count: '-', color: 'var(--text-primary)' }].map((ae, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '0.6rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: ae.color }}>{ae.count}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{ae.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={14} color={accentColor} /> Eligibility Criteria</h3>
            {criteria?.tabular_criteria?.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--accent-green)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.6rem' }}>Structured Rules (CSV)</div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: '0.8rem', textAlign: 'left', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
                        <th style={{ padding: '0.5rem' }}>Rule Type</th>
                        <th style={{ padding: '0.5rem' }}>Field</th>
                        <th style={{ padding: '0.5rem' }}>Operator</th>
                        <th style={{ padding: '0.5rem' }}>Min</th>
                        <th style={{ padding: '0.5rem' }}>Max</th>
                      </tr>
                    </thead>
                    <tbody>
                      {criteria.tabular_criteria.map((c, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '0.5rem', color: c.rule_type === 'INCLUSION' ? 'var(--accent-green)' : 'var(--accent-red)' }}>{c.rule_type}</td>
                          <td style={{ padding: '0.5rem' }}>{c.field_name}</td>
                          <td style={{ padding: '0.5rem' }}>{c.operator}</td>
                          <td style={{ padding: '0.5rem' }}>{c.value_min !== null ? c.value_min : '-'}</td>
                          <td style={{ padding: '0.5rem' }}>{c.value_max !== null ? c.value_max : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {criteria?.text_criteria?.length > 0 && (
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--accent-blue)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.6rem' }}>Protocol Text Rules</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {criteria.text_criteria.map((tc, i) => {
                    const text = tc.criteria_text || '';
                    const isRawFile = !text.includes('INCLUSION:') && !text.includes('EXCLUSION:');
                    
                    if (isRawFile) {
                      return (
                        <div key={i} style={{ padding: '0.75rem', background: 'rgba(0,102,255,0.04)', border: '1px solid rgba(0,102,255,0.15)', borderRadius: '8px' }}>
                          <div style={{ fontSize: '0.78rem', lineHeight: '1.5', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{text}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>Uploaded: {tc.uploaded_at ? new Date(tc.uploaded_at).toLocaleDateString() : 'Unknown'}</div>
                        </div>
                      );
                    }
                    
                    const lines = text.split(/\r?\n|;/).map(l => l.trim()).filter(l => l);
                    const inclusions = lines.filter(l => l.includes('INCLUSION:')).map(l => l.replace('INCLUSION:', '').replace(/^-/, '').trim());
                    const exclusions = lines.filter(l => l.includes('EXCLUSION:')).map(l => l.replace('EXCLUSION:', '').replace(/^-/, '').trim());

                    return (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {inclusions.length > 0 && (
                          <div style={{ padding: '0.75rem', background: 'rgba(0,255,100,0.04)', border: '1px solid rgba(0,255,100,0.15)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '0.72rem', color: 'var(--accent-green)', fontWeight: 600, marginBottom: '0.5rem' }}>Inclusion Rules</div>
                            {inclusions.map((inc, j) => (
                              <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', marginBottom: '0.3rem', fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                                <CheckCircle size={14} color="var(--accent-green)" style={{ marginTop: '0.1rem', flexShrink: 0 }} />
                                <span>{inc}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {exclusions.length > 0 && (
                          <div style={{ padding: '0.75rem', background: 'rgba(255,50,50,0.04)', border: '1px solid rgba(255,50,50,0.15)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '0.72rem', color: 'var(--accent-red)', fontWeight: 600, marginBottom: '0.5rem' }}>Exclusion Rules</div>
                            {exclusions.map((exc, j) => (
                              <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', marginBottom: '0.3rem', fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                                <XCircle size={14} color="var(--accent-red)" style={{ marginTop: '0.1rem', flexShrink: 0 }} />
                                <span>{exc}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {(!criteria?.tabular_criteria?.length && !criteria?.text_criteria?.length) && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                <AlertCircle size={24} style={{ marginBottom: '0.5rem' }} />
                <span>No specific criteria configured yet.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ENROLLMENT */}
      {activeTab === 'Enrollment' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><TrendingUp size={15} color={accentColor} /> Monthly Enrollment Trend</h3>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              No historical enrollment data available.
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>Enrollment Status</h3>
              {[{ label: 'Target', value: '-', color: 'var(--text-muted)' }, { label: 'Enrolled', value: '-', color: accentColor }, { label: 'Remaining', value: '-', color: 'var(--accent-yellow)' }].map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.55rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.83rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                  <span style={{ fontWeight: 700, color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
            <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h3 style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '0.65rem', alignSelf: 'flex-start' }}>Overall Progress</h3>
              <div style={{ position: 'relative', width: '130px', height: '65px', overflow: 'hidden' }}>
                <svg width="130" height="65" viewBox="0 0 130 65">
                  <path d="M 10 65 A 55 55 0 0 1 120 65" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" strokeLinecap="round" />
                  <path d="M 10 65 A 55 55 0 0 1 120 65" fill="none" stroke={accentColor} strokeWidth="12" strokeLinecap="round" strokeDasharray={`${(enrollPct / 100) * 172.8} 172.8`} />
                </svg>
                <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: accentColor }}>{enrollPct}%</div>
                </div>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>of target reached</div>
            </div>
          </div>
        </div>
      )}

      {/* MATCHED PATIENTS - Digital Twin Population View */}
      {activeTab === 'Matched Patients' && (
        <div>
          <div className="glass-panel" style={{ padding: '1.5rem', minHeight: '520px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Dna size={16} color="var(--accent-purple)" /> Digital Twin Population</h3>
              <button className="btn btn-primary" onClick={() => navigate('/dashboard/trials/' + trialId + '/eligibility')} style={{ fontSize: '0.8rem', padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Eye size={14} /> Full Eligibility View
              </button>
            </div>
            <div style={{ flex: 1, minHeight: '450px' }}>
              <PopulationTwin interactiveTelemetry={true} />
            </div>
          </div>
        </div>
      )}

      {/* ENDPOINTS */}
      {activeTab === 'Endpoints' && (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Endpoints tracking not yet configured.
        </div>
      )}

      {selectedPatient && (
        <DoctorPanel patient={selectedPatient} accentColor={accentColor} onClose={() => setSelectedPatient(null)} />
      )}
    </div>
  );
};

export default TrialDetail;

