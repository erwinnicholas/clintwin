import React, { useState } from 'react';
import { Database, Download, FileText, CheckCircle, Activity, FileCheck, Layers } from 'lucide-react';
import { SectionHeader, StatCard } from '../components/common/UIComponents';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const DataGenerator = () => {
  const [selectedDisease, setSelectedDisease] = useState('NSCLC');
  
  const handleDownload = (filename) => {
    window.open(`${API_BASE}/generators/download/${selectedDisease}/${filename}`, '_blank');
  };

  const uploadSteps = [
    {
      step: 1,
      title: 'Patient Data CSV',
      filename: '1_baseline_patients.csv',
      type: 'CSV',
      where: 'Patients Page → "Import Baseline CSV"',
      desc: 'Creates the foundational patient demographic and vitals data.'
    },
    {
      step: 2,
      title: 'Patient Data Text (ZIP/PDF)',
      filename: '1b_clinical_notes.zip',
      type: 'ZIP',
      where: 'Patients Page → "+ Notes (PDF/ZIP)"',
      desc: 'Unstructured patient data in PDF format.'
    },
    {
      step: 3,
      title: 'Patient Data Text (CSV Alternative)',
      filename: '1b_clinical_notes.csv',
      type: 'CSV',
      where: 'Patients Page → "+ Notes (CSV)"',
      desc: 'Alternative to text/PDF upload with unstructured notes as a text column.'
    },
    {
      step: 4,
      title: 'Trial Rules CSV',
      filename: 'trial_rules.csv',
      type: 'CSV',
      where: 'Trial Page → Create Trial → Upload Trial Data (Structured CSV)',
      desc: 'Deterministic constraints for the trial.'
    },
    {
      step: 5,
      title: 'Trial Rules Text',
      filename: 'trial_rules.txt',
      type: 'TXT',
      where: 'Trial Page → Create Trial → Upload Trial Data (Text Document)',
      desc: 'Text-based trial rules for NLP processing.'
    },
    {
      step: 6,
      title: 'Trial Rules Text (CSV Alternative)',
      filename: 'trial_rules_text.csv',
      type: 'CSV',
      where: 'Trial Page → Create Trial → Upload Trial Data',
      desc: 'Alternative to text upload containing a text column.'
    },
    {
      step: 7,
      title: '6-Month Patient Data CSV',
      filename: '2_6month_history.csv',
      type: 'CSV',
      where: 'Eligibility Page → "Upload 6-Month History"',
      desc: 'Provides the longitudinal lab history so the digital twin can calculate disease drift.'
    }
  ];

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Test Data Packages</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Download pre-generated dataset scenarios (NSCLC, RA, Mixed) to test the platform.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['NSCLC', 'RA', 'MIXED'].map(disease => (
            <button 
              key={disease}
              onClick={() => setSelectedDisease(disease)}
              className={`btn ${selectedDisease === disease ? 'btn-primary' : 'btn-secondary'}`}
            >
              {disease} Scenario
            </button>
          ))}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Database size={20} color="var(--accent-blue)" /> 
          How to Upload Data (In Order)
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {uploadSteps.map(step => (
            <div key={step.step} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '1.5rem', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(0,102,255,0.1)', border: '1px solid rgba(0,102,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'var(--accent-blue)' }}>
                {step.step}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <h4 style={{ fontSize: '1.05rem', margin: 0 }}>{step.title}</h4>
                  <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>{step.type}</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  <strong>Upload Where:</strong> <span style={{ color: 'var(--accent-green)' }}>{step.where}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {step.desc}
                </div>
              </div>
              <button 
                onClick={() => handleDownload(step.filename)}
                className="btn btn-secondary" 
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Download size={16} /> Download {step.filename}
              </button>
            </div>
          ))}
        </div>
      </div>
      
      <div className="glass-panel" style={{ padding: '2rem', border: '1px solid rgba(255,61,0,0.3)', background: 'rgba(255,61,0,0.05)' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-red)' }}>
          <Activity size={20} /> 
          What about Live Simulation Data?
        </h3>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          <strong>Do not upload the simulation data manually.</strong> The 180-day trajectory data (<code>3_trial_trajectory.csv</code>) is generated alongside these packages, but it is loaded <em>automatically</em> by the backend when you click "Start Live Monitor" on the Eligibility page. It acts as the live incoming hospital feed.
        </p>
      </div>
    </div>
  );
};

export default DataGenerator;
