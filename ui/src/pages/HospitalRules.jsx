import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, CheckCircle, Upload, FileText, AlertTriangle, Scan } from 'lucide-react';
import { SectionHeader, StatCard, StatusBadge, AnimatedNumber } from '../components/common/UIComponents';

import { initialRulesMock, processingStepsMock } from './HospitalRules_mock_data';

const HospitalRules = () => {
  const [viewState, setViewState] = useState('default'); 
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  
  // Dynamic rules count
  const [activeRulesCount, setActiveRulesCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  const [rules, setRules] = useState([]);
  
  const fileInputRef = useRef(null);

  const steps = processingStepsMock.data;


  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadedFileName(e.target.files[0].name);
      setViewState('analyzing');
      setCurrentStepIndex(0);
    }
  };

  useEffect(() => {
    if (viewState === 'analyzing') {
      if (currentStepIndex < steps.length) {
        const timer = setTimeout(() => {
          setCurrentStepIndex(prev => prev + 1);
        }, 1200); // Slightly slower for cinematic effect
        return () => clearTimeout(timer);
      } else {
        const finalizeTimer = setTimeout(() => {
          setRules(prev => [
            { category: 'Inclusion', rule: 'Required Baseline Test: CBC Panel within 14 days', source: uploadedFileName, status: 'Pending Review', severity: 'Mandatory' },
            { category: 'Exclusion', rule: 'Medical History Conflict: Active Autoimmune Disease', source: uploadedFileName, status: 'Pending Review', severity: 'Mandatory' },
            { category: 'Site Constraint', rule: 'Patient must be localized within 50 miles of trial site', source: uploadedFileName, status: 'Pending Review', severity: 'Optional' },
            ...prev
          ]);
          setViewState('validated');
          setActiveRulesCount(prev => prev + 3);
          setPendingCount(prev => prev + 3);
        }, 1000);
        return () => clearTimeout(finalizeTimer);
      }
    }
  }, [viewState, currentStepIndex, uploadedFileName, steps.length]);

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <SectionHeader 
        title="Hospital Rules & Regulations" 
        subtitle="Automated compliance extraction and rule management" 
        action={<button className="btn btn-primary" onClick={() => fileInputRef.current.click()}><Upload size={16} style={{ marginRight: '8px' }}/> Upload Regulations</button>}
      />
      
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        accept=".pdf,.doc,.docx,.txt"
        onChange={handleFileChange} 
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard title="Active Rules" value={activeRulesCount} subtext="Across 5 categories" icon={ShieldCheck} color="0, 230, 118" />
        <StatCard title="Pending Review" value={pendingCount} subtext="Requires manual validation" icon={AlertTriangle} color="255, 214, 0" />
        <StatCard title="Rule Conflicts" value={0} subtext="System nominal" icon={CheckCircle} color="0, 102, 255" />
        <StatCard title="Processed Docs" value={48} subtext="Last 30 days" icon={FileText} color="157, 78, 221" />
      </div>

      {viewState === 'analyzing' && (
        <div className="glass-panel fade-in" style={{ padding: '0', marginBottom: '2rem', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', height: '450px', background: 'var(--bg-primary)' }}>
          {/* Cinematic 3D Scanner UI */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(rgba(0, 240, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.05) 1px, transparent 1px)', backgroundSize: '40px 40px', transform: 'perspective(500px) rotateX(60deg)', transformOrigin: 'bottom', opacity: 0.5 }}></div>
          
          {/* Scanning Laser */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '3px', background: 'var(--accent-blue)', boxShadow: '0 0 20px 5px rgba(0, 240, 255, 0.6)', animation: 'scan-laser 2.5s infinite ease-in-out alternate', zIndex: 5 }}></div>

          {/* Center Document Wireframe */}
          <div style={{ position: 'absolute', top: '45%', left: '50%', transform: 'translate(-50%, -50%)', width: '280px', height: '380px', border: '1px solid rgba(0, 240, 255, 0.5)', background: 'rgba(0, 240, 255, 0.03)', display: 'flex', flexDirection: 'column', padding: '1.5rem', overflow: 'hidden', boxShadow: 'inset 0 0 30px rgba(0, 240, 255, 0.2)', zIndex: 2, backdropFilter: 'blur(2px)' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--accent-blue)', opacity: 0.8 }}>
                 <FileText size={20} />
                 <span style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{uploadedFileName}</span>
              </div>

              <div style={{ width: '100%', height: '6px', background: 'rgba(0, 240, 255, 0.2)', marginBottom: '1rem', borderRadius: '4px' }}></div>
              <div style={{ width: '85%', height: '6px', background: 'rgba(0, 240, 255, 0.2)', marginBottom: '1rem', borderRadius: '4px' }}></div>
              <div style={{ width: '95%', height: '6px', background: 'rgba(0, 240, 255, 0.2)', marginBottom: '1rem', borderRadius: '4px' }}></div>
              <div style={{ width: '70%', height: '6px', background: 'rgba(0, 240, 255, 0.2)', marginBottom: '2rem', borderRadius: '4px' }}></div>
              
              {/* Extracted chunks floating up */}
              <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', animation: 'float-up 4s infinite linear' }}>
                 <div style={{ background: 'rgba(255, 214, 0, 0.1)', border: '1px solid var(--accent-yellow)', color: 'var(--accent-yellow)', fontSize: '0.65rem', padding: '4px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>[EXTRACT] Age &ge; 18</div>
                 <div style={{ background: 'rgba(0, 230, 118, 0.1)', border: '1px solid var(--accent-green)', color: 'var(--accent-green)', fontSize: '0.65rem', padding: '4px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>[EXTRACT] CBC Panel req</div>
              </div>
          </div>

          {/* Top Left stats */}
          <div style={{ position: 'absolute', top: '2rem', left: '2rem', color: 'var(--accent-blue)', zIndex: 10 }}>
             <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', textShadow: '0 0 10px rgba(0, 240, 255, 0.8)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Scan size={20} className="pulse-animation" /> AI REGULATORY ENGINE
             </h3>
             <div style={{ fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>TARGET: {uploadedFileName}</div>
             <div style={{ fontSize: '0.9rem', color: 'white', fontWeight: 600, letterSpacing: '1px' }}>STATUS: {steps[Math.min(currentStepIndex, steps.length - 1)]}</div>
          </div>

          {/* Bottom Right data stream */}
          <div style={{ position: 'absolute', bottom: '2rem', right: '2rem', color: 'var(--accent-purple)', fontSize: '0.7rem', textAlign: 'right', opacity: 0.8, fontFamily: 'monospace', zIndex: 10, lineHeight: 1.5 }}>
             <div>0x7F2A: NLP_MODEL_V4_INIT</div>
             <div>0x7F2B: ALLOCATING_TENSORS</div>
             <div>0x7F2C: PARSING_TOKENS...</div>
             <div>0x7F2D: MATCH_PROB = 0.982</div>
             <div className="pulse-animation" style={{ color: 'var(--accent-blue)', marginTop: '0.5rem' }}>&gt; ENGINE OPTIMAL</div>
          </div>
        </div>
      )}

      {(viewState === 'default' || viewState === 'validated') && (
        <div className="glass-panel fade-in" style={{ padding: '0', display: 'flex', flexDirection: 'column' }}>
          <div className="flex-between" style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={{ fontSize: '1.1rem' }}>{initialRulesMock.title}</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'white', padding: '0.4rem 1rem', borderRadius: '4px', fontSize: '0.8rem', outline: 'none' }}>
                <option>All Categories</option>
                <option>Inclusion</option>
                <option>Exclusion</option>
                <option>Consent</option>
                <option>Documentation</option>
                <option>Site Constraint</option>
              </select>
            </div>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '1rem' }}>Category</th>
                  <th style={{ padding: '1rem', width: '40%' }}>Extracted Rule (NLP)</th>
                  <th style={{ padding: '1rem' }}>Source Document</th>
                  <th style={{ padding: '1rem' }}>Severity</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rules.filter(r => categoryFilter === 'All Categories' || r.category === categoryFilter).map((rule, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }} className="table-row-hover">
                    <td style={{ padding: '1rem' }}>
                      <span style={{ padding: '0.25rem 0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {rule.category}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 500, color: 'var(--text-primary)' }}>{rule.rule}</td>
                    <td style={{ padding: '1rem', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileText size={14} /> {rule.source}
                    </td>
                    <td style={{ padding: '1rem', color: rule.severity === 'Critical' ? 'var(--accent-red)' : rule.severity === 'Mandatory' ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {rule.severity}
                    </td>
                    <td style={{ padding: '1rem' }}><StatusBadge status={rule.status} /></td>
                    <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--accent-blue)', cursor: 'pointer' }}>Edit</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {viewState === 'validated' && (
        <div className="fade-in" style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(0, 230, 118, 0.1)', border: '1px solid var(--accent-green)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <CheckCircle size={24} color="var(--accent-green)" />
            <div>
              <h4 style={{ color: 'var(--accent-green)', marginBottom: '0.25rem', fontSize: '1rem' }}>Validation Complete</h4>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>3 new rules have been extracted from {uploadedFileName} and prepared for system integration.</div>
            </div>
          </div>
          <button className="btn btn-primary" style={{ padding: '0.5rem 1.5rem' }} onClick={() => setViewState('default')}>Apply Rules to Matching Engine</button>
        </div>
      )}

    </div>
  );
};

export default HospitalRules;
