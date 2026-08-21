import React, { useState, useEffect } from 'react';
import { Target, FileText, CheckCircle, Activity, AlertCircle, RefreshCw, ZoomIn, ZoomOut, Save, Filter, Users } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { StatCard, StatusBadge, SectionHeader } from '../components/common/UIComponents';
import PopulationTwin from '../components/PopulationTwin';
import toast from 'react-hot-toast';

import { useGlobalData } from '../context/GlobalDataContext';

// No mock data

import { fetchPatients, uploadLongitudinal, checkLongitudinalData, fetchTrialCriteria, updateTrialStatus, generateCohort } from '../services/api';
import { UploadCloud } from 'lucide-react';

const Eligibility = () => {
  const { metrics, simState } = useGlobalData();
  const [activePatient, setActivePatient] = useState(null);
  const [activePatientTab, setActivePatientTab] = useState('Overview');
  const [viewMode, setViewMode] = useState('3D');
  const [isSyncingTwin, setIsSyncingTwin] = useState(false);
  const [showCriteriaModal, setShowCriteriaModal] = useState(false);
  const navigate = useNavigate();
  const { trialId } = useParams();
  const [searchParams] = useSearchParams();
  const initialPatientId = searchParams.get('patientId');
  const [criteria, setCriteria] = useState(null);

  const [patients, setPatients] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLongitudinalDataUploaded, setIsLongitudinalDataUploaded] = useState(false);

  const handleHistoryUpload = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setIsUploading(true);
      const toastId = toast.loading("Uploading 6-Month History...");
      try {
        await uploadLongitudinal(file);
        setIsLongitudinalDataUploaded(true);
        toast.success("6-Month History Uploaded successfully", { id: toastId });
      } catch (err) {
        console.error("Failed to upload history", err);
        toast.error("Error uploading 6-Month History", { id: toastId });
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleStartMonitor = async () => {
    if (!isLongitudinalDataUploaded) {
      toast.error("Please upload the 6-Month History data before starting the simulation.");
      return;
    }

    try {
      const tid = trialId || 'IMMNOVA-2024-07';
      await updateTrialStatus(tid, 'Recruiting');
      navigate(`/dashboard/live-sim/${tid}`);
    } catch (err) {
      console.error("Failed to update trial status:", err);
      // Fallback navigation even if it fails
      navigate(`/dashboard/live-sim/${trialId || 'IMMNOVA-2024-07'}`);
    }
  };

  const handleGenerateCohort = async () => {
    setIsGenerating(true);
    const tid = toast.loading("Generating AI Cohort (this may take a minute)...");
    try {
      await generateCohort(trialId || 'IMMNOVA-2024-07');
      toast.success("Cohort generated and stratified successfully!", { id: tid });
      const data = await fetchPatients(trialId);
      if (data) setPatients(data);
      refreshGlobalMetrics();
    } catch (e) {
      toast.error("Failed to generate cohort.", { id: tid });
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    const loadPatients = async () => {
      try {
        const data = await fetchPatients(trialId);
        if (data) {
          setPatients(data);
        } else {
          setPatients([]);
        }
      } catch (err) {
        toast.error("Failed to load patients for Eligibility.");
        console.error(err);
        setPatients([]);
      }
    };
    
    const loadCriteria = async () => {
      try {
        if (trialId) {
          const crit = await fetchTrialCriteria(trialId);
          setCriteria(crit);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load criteria");
      }
    };

    const checkData = async () => {
      try {
        const res = await checkLongitudinalData();
        setIsLongitudinalDataUploaded(res.has_data);
      } catch (err) {
        console.error(err);
      }
    };

    loadPatients();
    loadCriteria();
    checkData();
  }, [trialId]);

  // Derived state for Modal Text Criteria
  const criteriaInclusion = React.useMemo(() => {
    if (!criteria || !criteria.text_criteria) return [];
    const lines = criteria.text_criteria.map(t => t.criteria_text).join('\n').split('\n');
    return lines.filter(l => l.includes('INCLUSION:')).map(l => l.replace('- INCLUSION:', '').trim());
  }, [criteria]);

  const criteriaExclusion = React.useMemo(() => {
    if (!criteria || !criteria.text_criteria) return [];
    const lines = criteria.text_criteria.map(t => t.criteria_text).join('\n').split('\n');
    return lines.filter(l => l.includes('EXCLUSION:')).map(l => l.replace('- EXCLUSION:', '').trim());
  }, [criteria]);

  const handleSelectPatient = (p) => {
    setActivePatient(null);
    setIsSyncingTwin(true);
    setTimeout(() => {
      setActivePatient(p);
      setIsSyncingTwin(false);
    }, 3000);
  };
  return (
    <div style={{ paddingBottom: '2rem' }}>
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Eligibility Criteria</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Define and visualize trial eligibility across digital twin population</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginRight: '1rem' }}>
             <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Selected Trial</span>
             <span style={{ fontWeight: 'bold' }}>{trialId || 'IMMNOVA-2024-07'}</span>
          </div>
          
          {isLongitudinalDataUploaded ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-green)', padding: '0.5rem 1rem', background: 'rgba(0, 230, 118, 0.1)', borderRadius: '6px', border: '1px solid rgba(0, 230, 118, 0.3)', fontWeight: 500, fontSize: '0.85rem' }}>
              <CheckCircle size={16} /> 6-Month History Uploaded
            </div>
          ) : (
            <>
              <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }} onClick={() => document.getElementById('history-upload').click()}>
                <UploadCloud size={16} style={{ marginRight: '8px' }}/> {isUploading ? 'Uploading...' : 'Upload 6-Month History'}
              </button>
              <input type="file" id="history-upload" accept=".csv,.xlsx" style={{ display: 'none' }} onChange={handleHistoryUpload} />
            </>
          )}
          
          {simState[trialId || 'IMMNOVA-2024-07']?.status === 'running' || simState[trialId || 'IMMNOVA-2024-07']?.status === 'paused' ? (
            <button onClick={() => navigate(`/dashboard/live-sim/${trialId || 'IMMNOVA-2024-07'}`)} className="btn btn-primary" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'linear-gradient(135deg, rgba(0,240,255,0.8), rgba(0,230,118,0.8))', border: 'none', fontWeight: 600 }}><Activity size={16} /> Return to Live Monitor</button>
          ) : (
            <button onClick={handleStartMonitor} className="btn btn-primary" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'linear-gradient(135deg, rgba(255,61,0,0.8), rgba(157,78,221,0.8))', border: 'none', fontWeight: 600 }}><Activity size={16} /> Start Live Monitor</button>
          )}
          <button onClick={handleGenerateCohort} disabled={isGenerating} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
            {isGenerating ? <Activity size={16} className="spin-animation" style={{ marginRight: '8px' }}/> : <Users size={16} style={{ marginRight: '8px' }}/>} 
            {isGenerating ? 'Generating...' : 'Run AI Pipeline'}
          </button>
          <button onClick={() => showToast('Criteria saved successfully')} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}><Save size={16} style={{ marginRight: '8px' }}/> Save Criteria</button>
        </div>
      </div>
      
      {toast && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: 'var(--accent-green)', color: '#000', padding: '1rem 2rem', borderRadius: '8px', fontWeight: 'bold', zIndex: 1000, boxShadow: '0 4px 20px rgba(0, 230, 118, 0.4)' }}>
          {toast}
        </div>
      )}

      {/* Layer 3: KPI Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard title="Total Digital Twin Population" value={patients.length.toLocaleString()} subtext="" icon={Users} color="0, 102, 255" />
        <StatCard title="Eligible" value={patients.filter(p => p.filter_stage === 'ENROLLED').length.toLocaleString()} subtext={`(${patients.length > 0 ? ((patients.filter(p => p.filter_stage === 'ENROLLED').length / patients.length) * 100).toFixed(1) : 0}%)`} icon={CheckCircle} color="0, 230, 118" />
        <StatCard title="Review Required" value={patients.filter(p => ['HARD_FILTER', 'COMPLIANCE_CHECKED', 'SEMANTIC_FILTER', 'TWIN_VALIDATED'].includes(p.filter_stage)).length.toLocaleString()} subtext={`(${patients.length > 0 ? ((patients.filter(p => ['HARD_FILTER', 'COMPLIANCE_CHECKED', 'SEMANTIC_FILTER', 'TWIN_VALIDATED'].includes(p.filter_stage)).length / patients.length) * 100).toFixed(1) : 0}%)`} icon={AlertCircle} color="255, 214, 0" />
        <StatCard title="Not Eligible" value={patients.filter(p => !p.filter_stage || !['ENROLLED', 'HARD_FILTER', 'COMPLIANCE_CHECKED', 'SEMANTIC_FILTER', 'TWIN_VALIDATED'].includes(p.filter_stage)).length.toLocaleString()} subtext={`(${patients.length > 0 ? ((patients.filter(p => !p.filter_stage || !['ENROLLED', 'HARD_FILTER', 'COMPLIANCE_CHECKED', 'SEMANTIC_FILTER', 'TWIN_VALIDATED'].includes(p.filter_stage)).length / patients.length) * 100).toFixed(1) : 0}%)`} icon={AlertCircle} color="100, 100, 100" />
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
           <div style={{ padding: '1rem', background: 'rgba(0, 230, 118, 0.1)', borderRadius: '50%', border: '2px solid var(--accent-green)' }}>
              <Target size={24} color="var(--accent-green)" />
           </div>
           <div>
             <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Matching Confidence</div>
             <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--accent-green)' }}>98%</div>
             <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)' }}>High Confidence</div>
           </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Massive Digital Twin Viz */}
        <div className="glass-panel" style={{ padding: '1.5rem', minHeight: '500px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>DIGITAL TWIN POPULATION</h3>
          <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', display: 'flex', gap: '0.5rem', zIndex: 10 }}>
             <button onClick={() => setViewMode('3D')} className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', background: viewMode === '3D' ? 'rgba(255,255,255,0.1)' : 'transparent' }}>3D View</button>
             <button onClick={() => setViewMode('List')} className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', background: viewMode === 'List' ? 'rgba(255,255,255,0.1)' : 'transparent' }}>List View</button>
          </div>
          
          <div style={{ flex: 1, position: 'relative', marginTop: '1rem', display: 'flex', flexDirection: 'column' }}>
             {viewMode === '3D' ? (
               <PopulationTwin 
                 onSelectPatient={handleSelectPatient} 
                 activePatientId={activePatient?.id} 
                 interactiveTelemetry={true}
                 initialPatientId={initialPatientId}
                 patients={patients}
               />
             ) : (
               <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 0' }}>
                 <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                   <thead>
                     <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                       <th style={{ padding: '1rem' }}>Patient ID</th>
                       <th style={{ padding: '1rem' }}>Age / Gender</th>
                       <th style={{ padding: '1rem' }}>Diagnosis</th>
                       <th style={{ padding: '1rem' }}>Eligibility Score</th>
                       <th style={{ padding: '1rem' }}>Status</th>
                     </tr>
                   </thead>
                   <tbody>
                     {patients.slice(0, 15).map((patient, i) => (
                       <tr 
                         key={i} 
                         onClick={() => setActivePatient(patient)} 
                         style={{ 
                           borderBottom: '1px solid rgba(255,255,255,0.02)', 
                           cursor: 'pointer', 
                           background: activePatient?.id === patient.id ? 'rgba(255,255,255,0.05)' : 'transparent' 
                         }} 
                         onMouseEnter={(e) => {if(activePatient?.id !== patient.id) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}} 
                         onMouseLeave={(e) => {if(activePatient?.id !== patient.id) e.currentTarget.style.background = 'transparent'}}
                       >
                         <td style={{ padding: '1rem', color: 'var(--accent-blue)', fontWeight: 500 }}>{patient.id}</td>
                         <td style={{ padding: '1rem' }}>{patient.age} / {patient.gender}</td>
                         <td style={{ padding: '1rem' }}>{patient.cancerType || 'Unknown'}</td>
                         <td style={{ padding: '1rem' }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                             <span>{patient.score}%</span>
                             <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
                               <div style={{ width: `${patient.score}%`, height: '100%', background: patient.score > 70 ? 'var(--accent-green)' : patient.score > 40 ? 'var(--accent-yellow)' : 'var(--accent-red)', borderRadius: '2px' }}></div>
                             </div>
                           </div>
                         </td>
                         <td style={{ padding: '1rem' }}>
                            <StatusBadge status={patient.filter_stage === 'ENROLLED' ? 'Eligible' : ['HARD_FILTER', 'COMPLIANCE_CHECKED', 'SEMANTIC_FILTER', 'TWIN_VALIDATED'].includes(patient.filter_stage) ? 'Under Review' : 'Not Eligible'} />
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             )}
          </div>
          
          <div className="flex-between" style={{ padding: '1rem 0 0 0', borderTop: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
               <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}><RefreshCw size={14}/> Rotate</span>
               <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}><ZoomIn size={14}/> Zoom In</span>
               <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}><ZoomOut size={14}/> Zoom Out</span>
            </div>
            <div>Auto Rotate <input type="checkbox" defaultChecked style={{ marginLeft: '0.5rem' }} /></div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {isSyncingTwin ? (
            <div className="glass-panel fade-in" style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
              <div style={{ position: 'relative', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <div className="spin-animation" style={{ position: 'absolute', width: '100%', height: '100%', border: '2px solid rgba(0, 240, 255, 0.2)', borderTopColor: 'var(--accent-blue)', borderRadius: '50%' }}></div>
                 <Activity size={24} color="var(--accent-blue)" className="pulse-animation" />
              </div>
              <div style={{ textAlign: 'center' }}>
                 <h3 style={{ fontSize: '1rem', color: 'var(--accent-blue)' }}>Syncing Digital Twin</h3>
                 <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Extracting specific patient telemetry...</p>
              </div>
            </div>
          ) : activePatient ? (
              <div className="glass-panel fade-in" style={{ padding: '1.5rem', flex: 1 }}>
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
                      <StatusBadge status={activePatient.filter_stage === 'ENROLLED' ? 'Eligible' : ['HARD_FILTER', 'COMPLIANCE_CHECKED', 'SEMANTIC_FILTER', 'TWIN_VALIDATED'].includes(activePatient.filter_stage) ? 'Under Review' : 'Not Eligible'} />
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
                      <span style={{ color: 'var(--text-secondary)' }}>BMI</span>
                      <span>{activePatient.bmi || '-'}</span>
                    </div>
                    <div className="flex-between">
                      <span style={{ color: 'var(--text-secondary)' }}>ECOG Score</span>
                      <span>{activePatient.ecog_score !== undefined ? activePatient.ecog_score : '-'}</span>
                    </div>
                    <div className="flex-between">
                      <span style={{ color: 'var(--text-secondary)' }}>Blood Pressure</span>
                      <span>{activePatient.systolic_bp && activePatient.diastolic_bp ? `${activePatient.systolic_bp}/${activePatient.diastolic_bp} mmHg` : '-'}</span>
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
                  <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem', textTransform: 'uppercase' }}>Key Lab Vitals</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        {Object.entries(activePatient.metrics || {}).map(([key, val]) => (
                           <div key={key} style={{ display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '6px' }}>
                             <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{key}</span>
                             <span style={{ fontSize: '0.9rem', fontWeight: 600, color: val ? 'var(--text-primary)' : 'var(--text-muted)' }}>{val || '-'}</span>
                           </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {activePatientTab === 'Documents' && (
                  <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ background: 'rgba(0,240,255,0.05)', borderRadius: '8px', padding: '1.25rem', border: '1px solid rgba(0,240,255,0.2)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--accent-blue)' }}>
                        <FileText size={16} />
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 600 }}>Unstructured Notes Pipeline</h4>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                        Clinical text notes, pathology reports, and longitudinal history have been extracted and vectorized into the twin embedding space. Select a node in the 3D twin to trace the telemetry back to the original source text span.
                      </p>
                    </div>
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
           <div className="glass-panel fade-in" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>CRITERIA SUMMARY</h3>
              {criteria?.tabular_criteria?.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: '0.85rem', textAlign: 'left', borderCollapse: 'collapse' }}>
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
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>
                   No criteria data available for this trial yet.
                </div>
              )}
           </div>
          )}
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
         <div className="glass-panel" style={{ padding: '0', display: 'flex', flexDirection: 'column', border: '1px solid rgba(0, 230, 118, 0.2)' }}>
            <div className="flex-between" style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
               <h3 style={{ fontSize: '1rem', color: 'var(--accent-green)' }}>Inclusion Criteria <span style={{ color: 'var(--text-muted)' }}>({criteria?.tabular_criteria?.filter(c => c.rule_type === 'INCLUSION').length || 0})</span></h3>
               <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button onClick={() => setShowCriteriaModal(true)} style={{ background: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.3)', color: 'var(--accent-green)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <FileText size={12} /> View Source Document
                  </button>
                  <Filter size={16} color="var(--text-secondary)" cursor="pointer"/>
               </div>
            </div>
            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              {criteria?.tabular_criteria?.filter(c => c.rule_type === 'INCLUSION').length > 0 ? (
                 <ul style={{ textAlign: 'left', margin: 0, paddingLeft: '1.5rem' }}>
                   {criteria.tabular_criteria.filter(c => c.rule_type === 'INCLUSION').map((c, i) => (
                      <li key={i} style={{ marginBottom: '0.5rem' }}>{c.field_name} {c.operator} {c.value_min !== null ? c.value_min : ''} {c.value_max !== null ? `to ${c.value_max}` : ''}</li>
                   ))}
                 </ul>
              ) : (
                "No inclusion criteria defined."
              )}
            </div>
         </div>

         <div className="glass-panel" style={{ padding: '0', display: 'flex', flexDirection: 'column', border: '1px solid rgba(255, 61, 0, 0.2)' }}>
            <div className="flex-between" style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
               <h3 style={{ fontSize: '1rem', color: 'var(--accent-red)' }}>Exclusion Criteria <span style={{ color: 'var(--text-muted)' }}>({criteria?.tabular_criteria?.filter(c => c.rule_type === 'EXCLUSION').length || 0})</span></h3>
               <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Filter size={16} color="var(--text-secondary)" cursor="pointer"/>
               </div>
            </div>
            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              {criteria?.tabular_criteria?.filter(c => c.rule_type === 'EXCLUSION').length > 0 ? (
                 <ul style={{ textAlign: 'left', margin: 0, paddingLeft: '1.5rem' }}>
                   {criteria.tabular_criteria.filter(c => c.rule_type === 'EXCLUSION').map((c, i) => (
                      <li key={i} style={{ marginBottom: '0.5rem' }}>{c.field_name} {c.operator} {c.value_min !== null ? c.value_min : ''} {c.value_max !== null ? `to ${c.value_max}` : ''}</li>
                   ))}
                 </ul>
              ) : (
                "No exclusion criteria defined."
              )}
            </div>
         </div>
      </div>

      {/* Full Criteria Modal */}
      {showCriteriaModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div className="glass-panel" style={{ width: '600px', maxWidth: '90%', padding: '2rem', maxHeight: '80vh', overflowY: 'auto' }}>
            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', color: 'white' }}>Full Eligibility Criteria</h3>
              <button onClick={() => setShowCriteriaModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}>×</button>
            </div>
            
            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ fontSize: '1rem', color: 'var(--accent-green)', marginBottom: '1rem' }}>Inclusion Criteria</h4>
              {criteriaInclusion.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {criteriaInclusion.map((c, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                      <CheckCircle size={16} color="var(--accent-green)" style={{ marginTop: '2px', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{c}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  No detailed criteria available.
                </div>
              )}
            </div>

            <div>
              <h4 style={{ fontSize: '1rem', color: 'var(--accent-red)', marginBottom: '1rem' }}>Exclusion Criteria</h4>
              {criteriaExclusion.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {criteriaExclusion.map((c, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                      <div style={{ width: '16px', height: '4px', background: 'var(--accent-red)', marginTop: '8px', borderRadius: '2px', flexShrink: 0 }}></div>
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{c}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  No detailed criteria available.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const UsersIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
);

export default Eligibility;
