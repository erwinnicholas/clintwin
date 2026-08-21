import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Activity, CheckCircle, Clock, Target, Search, Filter, Plus, Eye, MoreVertical, Users as UsersIcon, Download, X, Upload, FileText, FileSpreadsheet, ArrowLeft, ArrowRight, Check, AlertCircle, ShieldCheck, ChevronRight, User, Star, Award } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { StatCard, StatusBadge, SectionHeader } from '../components/common/UIComponents';
import { STEPS, CSV_TEMPLATE, DEFAULT_CONDITIONS, DEFAULT_EXCLUSIONS } from './ClinicalTrials_mock_data';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { ExportReportModal } from '../components/common/ExportReportModal';
import EmptyState from '../components/common/EmptyState';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ExplainButton from '../components/common/ExplainButton';
import toast from 'react-hot-toast';
import { fetchTrials, createTrial, uploadTextCriteria, previewTabularCriteria, confirmTabularCriteria, runHardFilter, runSemanticFilter, runComplianceCheck, buildTwins, fetchHospitalRules, createHospitalRule } from '../services/api';

// --- Helper Parser Functions --------------------------------------------------

const parseCsvRow = (line) => line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));

function parseCsvFile(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return null;
  const headers = parseCsvRow(lines[0]);
  const values = parseCsvRow(lines[1]);
  const obj = {};
  headers.forEach((h, i) => { obj[h] = values[i] || ''; });
  return obj;
}

function extractFromText(text) {
  const get = (patterns) => {
    for (const p of patterns) {
      const m = text.match(p);
      if (m) return m[1].trim();
    }
    return '';
  };
  return {
    'Trial Name': get([/Trial Name[:\s]+(.+)/i, /Study Title[:\s]+(.+)/i]),
    'Vaccine': get([/Vaccine[:\s]+(.+)/i, /Drug[:\s]+(.+)/i, /Treatment[:\s]+(.+)/i]),
    'Target Disease': get([/(?:Target )?Disease[:\s]+(.+)/i, /Indication[:\s]+(.+)/i]),
    'Target Patients': get([/(?:Target )?Patients?[:\s]+(\d+)/i, /Enrollment[:\s]+(\d+)/i]),
    'Age Min': get([/Age[:\s]+(\d+)/i, /Min(?:imum)? Age[:\s]+(\d+)/i]),
    'Age Max': get([/Age[:\s]+\d+[-](\d+)/i, /Max(?:imum)? Age[:\s]+(\d+)/i]),
    'Phase': get([/Phase[:\s]+([IVX0-9/]+)/i]),
    'Sponsor': get([/Sponsor[:\s]+(.+)/i]),
  };
}

// --- Checkbox List Component with Inline Manual Text Editing ------------------
const CheckboxList = ({ title, items, setItems, accentColor }) => (
  <div>
    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '0.75rem' }}>{title}</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.35rem 0.6rem', borderRadius: '6px', background: item.checked ? `${accentColor}10` : 'rgba(255,255,255,0.02)', border: `1px solid ${item.checked ? accentColor + '30' : 'rgba(255,255,255,0.05)'}`, transition: 'all 0.15s' }}>
          <div
            onClick={() => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, checked: !it.checked } : it))}
            style={{ width: '16px', height: '16px', borderRadius: '4px', border: `2px solid ${item.checked ? accentColor : 'rgba(255,255,255,0.2)'}`, background: item.checked ? accentColor : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', transition: 'all 0.15s' }}
          >
            {item.checked && <Check size={10} color="white" strokeWidth={3} />}
          </div>
          <input
            type="text"
            value={item.label}
            onChange={(e) => {
              const val = e.target.value;
              setItems(prev => prev.map((it, idx) => idx === i ? { ...it, label: val } : it));
            }}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: item.checked ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontSize: '0.8rem',
              outline: 'none',
              fontFamily: 'inherit'
            }}
            placeholder="Type condition manually..."
          />
          <button
            onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '0.75rem', padding: '0 2px' }}
            title="Remove item"
          >
            <X size={12} />
          </button>
        </div>
      ))}
      <button
        onClick={() => setItems(prev => [...prev, { label: '', checked: true }])}
        style={{ marginTop: '0.25rem', background: 'none', border: `1px dashed rgba(255,255,255,0.12)`, color: 'var(--accent-blue)', padding: '0.35rem 0.6rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
      >
        <Plus size={12} /> Add custom criterion manually
      </button>
    </div>
  </div>
);

// --- Create Trial Wizard ------------------------------------------------------
const CreateTrialWizard = ({ onClose, onCreated, onTrialCreated }) => {
  const [step, setStep] = useState(0); 
  const [csvFile, setCsvFile] = useState(null);
  const [textFile, setTextFile] = useState(null);
  const [textFileContent, setTextFileContent] = useState('');
  const [isDraggingCsv, setIsDraggingCsv] = useState(false);
  const [isDraggingText, setIsDraggingText] = useState(false);
  const [parseError, setParseError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parsedCriteria, setParsedCriteria] = useState(null);
  const [createdTrialId, setCreatedTrialId] = useState(null);

  const csvFileRef = useRef();
  const textFileRef = useRef();

  // Trial form state
  const [trialName, setTrialName] = useState('');
  const [vaccine, setVaccine] = useState('');
  const [targetDisease, setTargetDisease] = useState('');
  const [targetPatients, setTargetPatients] = useState('');
  const [ageMin, setAgeMin] = useState('18');
  const [ageMax, setAgeMax] = useState('75');
  const [phase, setPhase] = useState('III');
  const [sponsor, setSponsor] = useState('');
  const [conditions, setConditions] = useState(DEFAULT_CONDITIONS);
  const [exclusions, setExclusions] = useState(DEFAULT_EXCLUSIONS);

  // Regulatory rules state — loaded from backend
  const [hospitalRules, setHospitalRules] = useState([]);
  const [selectedRules, setSelectedRules] = useState([]);
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [newRule, setNewRule] = useState({ name: '', category: 'General', rule_text: '', source: '', severity: 'Mandatory' });

  useEffect(() => {
    fetchHospitalRules().then(rules => {
      setHospitalRules(rules);
      setSelectedRules(rules.filter(r => r.is_active).map(r => r.rule_id));
    }).catch(err => {
      console.error(err);
      toast.error("Failed to load hospital rules.");
    });
  }, []);

  const handleCsvSelect = useCallback(async (selectedFile) => {
    if (!selectedFile) return;
    setCsvFile(selectedFile);
    setParseError('');
    try {
      const previewRes = await previewTabularCriteria('TEMP', selectedFile);
      if (previewRes.error_rows > 0) {
         setParseError(`Found ${previewRes.error_rows} invalid rows in criteria. Proceeding with valid ones.`);
      }
      setParsedCriteria(previewRes.criteria);
      toast.success("Successfully parsed hard criteria.");
    } catch (err) {
      setParseError('Failed to parse tabular criteria.');
      toast.error("Failed to parse tabular criteria.");
      setParsedCriteria(null);
    }
  }, []);

  const handleTextSelect = useCallback((selectedFile) => {
    if (!selectedFile) return;
    setTextFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      setTextFileContent(text);
      const data = extractFromText(text);
      if (data) {
        if (data['Trial Name']) setTrialName(data['Trial Name']);
        if (data['Vaccine']) setVaccine(data['Vaccine']);
        if (data['Target Disease']) setTargetDisease(data['Target Disease']);
        if (data['Target Patients']) setTargetPatients(data['Target Patients']);
        if (data['Age Min']) setAgeMin(data['Age Min']);
        if (data['Age Max']) setAgeMax(data['Age Max']);
        if (data['Phase']) setPhase(data['Phase']);
        if (data['Sponsor']) setSponsor(data['Sponsor']);
      }
    };
    reader.readAsText(selectedFile);
  }, []);

  const handleConfirm = async () => {
    setIsProcessing(true);
    setProgress(10);
    try {
      // 1. Create Trial
      const trialRes = await createTrial({ title: trialName, description: `Disease: ${targetDisease}, Phase: ${phase}` });
      const trialId = trialRes.trial_id || 'TRIAL-NEW';
      setCreatedTrialId(trialId);
      setProgress(20);

      // 2. Upload Criteria
      if (parsedCriteria && parsedCriteria.length > 0) {
        await confirmTabularCriteria(trialId, parsedCriteria);
      } 
      
      // Always upload text criteria: either the explicit file, or the built checkboxes
      if (textFileContent) {
        await uploadTextCriteria(trialId, textFileContent);
      } else {
        const conditionText = conditions.filter(c => c.checked).map(c => c.label).join('; ');
        const exclusionText = exclusions.filter(c => c.checked).map(c => c.label).join('; ');
        await uploadTextCriteria(trialId, `INCLUSION: ${conditionText}\nEXCLUSION: ${exclusionText}`);
      }

      localStorage.setItem(`trial_files_${trialId}`, JSON.stringify({
        csvName: csvFile ? csvFile.name : null,
        textName: textFile ? textFile.name : null
      }));
      setProgress(40);

      // 3. Pipeline
      await runHardFilter(trialId);
      setProgress(60);
      
      await runSemanticFilter(trialId);
      setProgress(80);
      
      await runComplianceCheck(trialId);
      setProgress(90);
      
      await buildTwins(trialId);
      setProgress(100);

      setTimeout(() => {
        setIsProcessing(false);
        setStep(3);
        toast.success("Trial successfully created and initialized.");
        onTrialCreated?.();
      }, 500);

    } catch (err) {
      toast.error("Pipeline failed. Displaying mock UI progress.");
      console.error("Pipeline failed, falling back to mock UI progress", err);
      onTrialCreated?.();
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) { clearInterval(interval); setIsProcessing(false); setStep(3); return 100; }
          return prev + 10;
        });
      }, 60);
    }
  };

  const toggleRule = (id) => setSelectedRules(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);

  const inputStyle = { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', padding: '0.5rem 0.75rem', color: 'white', fontSize: '0.83rem', outline: 'none', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', fontSize: '0.71rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, backdropFilter: 'blur(6px)' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: step === 1 ? '860px' : '660px', maxWidth: '97vw', maxHeight: '92vh', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 32px 100px rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', transition: 'width 0.35s ease' }}>

        {/* Header */}
        <div style={{ padding: '1.4rem 1.75rem', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Create Clinical Trial</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>Step {step + 1} of {STEPS.length} � {STEPS[step]}</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', color: 'white', width: '30px', height: '30px', borderRadius: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={15} /></button>
        </div>

        {/* Step bar */}
        <div style={{ display: 'flex', padding: '0 1.75rem', background: 'rgba(0,0,0,0.25)', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.55rem 0' }}>
              <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: i < step ? 'var(--accent-green)' : i === step ? 'var(--accent-blue)' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, flexShrink: 0 }}>
                {i < step ? <Check size={10} /> : i + 1}
              </div>
              <span style={{ fontSize: '0.68rem', color: i === step ? 'white' : 'var(--text-muted)', fontWeight: i === step ? 600 : 400, whiteSpace: 'nowrap' }}>{s}</span>
              {i < STEPS.length - 1 && <div style={{ flex: 1, height: '1px', background: i < step ? 'var(--accent-green)' : 'rgba(255,255,255,0.08)', marginLeft: '0.2rem' }} />}
            </div>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: '1.75rem', overflowY: 'auto', flex: 1 }}>          {/* STEP 0: Upload Trial Data */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Upload your trial definition files. You can provide both a structured CSV (Hard Criteria) and a text document (Clinical Protocol).</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                {/* CSV Dropzone */}
                <div
                  onDragOver={e => { e.preventDefault(); setIsDraggingCsv(true); }}
                  onDragLeave={() => setIsDraggingCsv(false)}
                  onDrop={e => { e.preventDefault(); setIsDraggingCsv(false); handleCsvSelect(e.dataTransfer.files[0]); }}
                  onClick={() => csvFileRef.current?.click()}
                  style={{ border: `2px dashed ${isDraggingCsv ? 'var(--accent-green)' : csvFile ? 'var(--accent-green)' : 'rgba(255,255,255,0.15)'}`, borderRadius: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', cursor: 'pointer', background: isDraggingCsv ? 'rgba(0,230,118,0.04)' : csvFile ? 'rgba(0,230,118,0.03)' : 'rgba(255,255,255,0.01)', padding: '1.5rem', minHeight: '180px', transition: 'all 0.2s' }}
                >
                  <input ref={csvFileRef} type="file" accept=".csv,.xlsx" style={{ display: 'none' }} onChange={e => handleCsvSelect(e.target.files[0])} />
                  {csvFile ? (
                    <>
                      <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(0,230,118,0.12)', border: '1px solid rgba(0,230,118,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileSpreadsheet size={24} color="var(--accent-green)" />
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem', color: 'var(--accent-green)' }}>{csvFile.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{(csvFile.size / 1024).toFixed(1)} KB</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(0,230,118,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0,230,118,0.2)' }}><FileSpreadsheet size={24} color="var(--accent-green)" /></div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.2rem' }}>Hard Criteria (CSV)</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Click or drag .csv file</div>
                      </div>
                    </>
                  )}
                </div>

                {/* Text Dropzone */}
                <div
                  onDragOver={e => { e.preventDefault(); setIsDraggingText(true); }}
                  onDragLeave={() => setIsDraggingText(false)}
                  onDrop={e => { e.preventDefault(); setIsDraggingText(false); handleTextSelect(e.dataTransfer.files[0]); }}
                  onClick={() => textFileRef.current?.click()}
                  style={{ border: `2px dashed ${isDraggingText ? 'var(--accent-blue)' : textFile ? 'var(--accent-blue)' : 'rgba(255,255,255,0.15)'}`, borderRadius: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', cursor: 'pointer', background: isDraggingText ? 'rgba(0,102,255,0.04)' : textFile ? 'rgba(0,102,255,0.03)' : 'rgba(255,255,255,0.01)', padding: '1.5rem', minHeight: '180px', transition: 'all 0.2s' }}
                >
                  <input ref={textFileRef} type="file" accept=".txt,.pdf" style={{ display: 'none' }} onChange={e => handleTextSelect(e.target.files[0])} />
                  {textFile ? (
                    <>
                      <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(0,102,255,0.12)', border: '1px solid rgba(0,102,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={24} color="var(--accent-blue)" />
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem', color: 'var(--accent-blue)' }}>{textFile.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{(textFile.size / 1024).toFixed(1)} KB</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(0,102,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0,102,255,0.2)' }}><FileText size={24} color="var(--accent-blue)" /></div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.2rem' }}>Clinical Protocol (Text)</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Click or drag .txt file</div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {parseError && <div style={{ padding: '0.7rem 0.9rem', background: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.25)', borderRadius: '8px', display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.8rem', color: '#ff6b6b' }}><AlertCircle size={13} />{parseError}</div>}
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button onClick={() => setStep(1)} disabled={!csvFile && !textFile} className="btn btn-primary" style={{ padding: '0.6rem 2rem', opacity: (!csvFile && !textFile) ? 0.5 : 1 }}>
                  Continue <ArrowRight size={14} style={{ marginLeft: '0.4rem' }} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 1: Trial Details & Review */}
          {step === 1 && (
            <div>
              { (csvFile || textFile) && <div style={{ marginBottom: '1.25rem', padding: '0.6rem 1rem', background: 'rgba(0,230,118,0.06)', borderRadius: '8px', border: '1px solid rgba(0,230,118,0.2)', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.78rem' }}><CheckCircle size={13} color="var(--accent-green)" /><span style={{ color: 'var(--accent-green)' }}>Data extracted from <strong>{csvFile?.name || textFile?.name}</strong></span><span style={{ color: 'var(--text-muted)' }}> – Review and edit below</span></div>}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
                {/* Column 1: Basic Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '1rem' }}>Trial Information</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      <div><label style={labelStyle}>Trial Name</label><input value={trialName} onChange={e => setTrialName(e.target.value)} style={inputStyle} onFocus={e => e.target.style.borderColor = 'var(--accent-blue)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} /></div>
                      <div><label style={labelStyle}>Vaccine / Drug</label><input value={vaccine} onChange={e => setVaccine(e.target.value)} style={inputStyle} onFocus={e => e.target.style.borderColor = 'var(--accent-blue)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} /></div>
                      <div><label style={labelStyle}>Target Disease</label><input value={targetDisease} onChange={e => setTargetDisease(e.target.value)} style={inputStyle} onFocus={e => e.target.style.borderColor = 'var(--accent-blue)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} /></div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div><label style={labelStyle}>Target Patients</label><input value={targetPatients} onChange={e => setTargetPatients(e.target.value)} style={inputStyle} type="number" onFocus={e => e.target.style.borderColor = 'var(--accent-blue)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} /></div>
                        <div><label style={labelStyle}>Phase</label>
                          <select value={phase} onChange={e => setPhase(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                            {['I','II','III','IV'].map(p => <option key={p} value={p}>Phase {p}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label style={labelStyle}>Age Range</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input value={ageMin} onChange={e => setAgeMin(e.target.value)} style={{ ...inputStyle, width: '70px', textAlign: 'center' }} type="number" placeholder="Min" onFocus={e => e.target.style.borderColor = 'var(--accent-blue)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                          <span style={{ color: 'var(--text-muted)' }}>�</span>
                          <input value={ageMax} onChange={e => setAgeMax(e.target.value)} style={{ ...inputStyle, width: '70px', textAlign: 'center' }} type="number" placeholder="Max" onFocus={e => e.target.style.borderColor = 'var(--accent-blue)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>years</span>
                        </div>
                      </div>
                      <div><label style={labelStyle}>Sponsor</label><input value={sponsor} onChange={e => setSponsor(e.target.value)} placeholder="Organization name" style={inputStyle} onFocus={e => e.target.style.borderColor = 'var(--accent-blue)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} /></div>
                    </div>
                  </div>
                </div>

                {/* Column 2: Extracted Criteria */}
                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)', gridColumn: 'span 2' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '1rem' }}>Extracted Criteria Rules</div>
                  {parsedCriteria ? (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', fontSize: '0.8rem', textAlign: 'left', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
                            <th style={{ padding: '0.5rem' }}>Rule Type</th>
                            <th style={{ padding: '0.5rem' }}>Field Name</th>
                            <th style={{ padding: '0.5rem' }}>Operator</th>
                            <th style={{ padding: '0.5rem' }}>Min</th>
                            <th style={{ padding: '0.5rem' }}>Max</th>
                            <th style={{ padding: '0.5rem' }}>Valid</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsedCriteria.map((c, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <td style={{ padding: '0.5rem', color: c.rule_type === 'INCLUSION' ? 'var(--accent-green)' : 'var(--accent-red)' }}>{c.rule_type}</td>
                              <td style={{ padding: '0.5rem' }}>{c.field_name}</td>
                              <td style={{ padding: '0.5rem' }}>{c.operator}</td>
                              <td style={{ padding: '0.5rem' }}>{c.value_min !== null ? c.value_min : '-'}</td>
                              <td style={{ padding: '0.5rem' }}>{c.value_max !== null ? c.value_max : '-'}</td>
                              <td style={{ padding: '0.5rem' }}>{c.is_valid ? <CheckCircle size={14} color="var(--accent-green)" /> : <AlertCircle size={14} color="var(--accent-red)" />}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-green)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>Inclusion Criteria</div>
                        <CheckboxList title="" items={conditions} setItems={setConditions} accentColor="#00e676" />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-red)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>Exclusion Criteria</div>
                        <CheckboxList title="" items={exclusions} setItems={setExclusions} accentColor="#ff3d00" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
                  {/* STEP 2: Regulatory Rules */}
          {step === 2 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>Select regulatory and hospital rules to apply to this trial.</p>
                <button onClick={() => setShowAddRuleModal(true)} className="btn btn-secondary" style={{ padding: '0.35rem 0.8rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Plus size={13} /> Add Rule</button>
              </div>
              {hospitalRules.length === 0 ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <ShieldCheck size={32} style={{ marginBottom: '0.75rem', opacity: 0.4 }} />
                  <div style={{ fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.35rem' }}>No hospital rules defined yet</div>
                  <div style={{ fontSize: '0.78rem' }}>Click "Add Rule" above to create institutional regulatory rules.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.75rem', maxHeight: '350px', overflowY: 'auto' }}>
                  {hospitalRules.map(rule => (
                    <div key={rule.rule_id} onClick={() => toggleRule(rule.rule_id)} style={{ padding: '1rem 1.25rem', border: `1px solid ${selectedRules.includes(rule.rule_id) ? 'rgba(0,230,118,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '10px', cursor: 'pointer', background: selectedRules.includes(rule.rule_id) ? 'rgba(0,230,118,0.05)' : 'rgba(255,255,255,0.01)', transition: 'all 0.18s', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${selectedRules.includes(rule.rule_id) ? 'var(--accent-green)' : 'rgba(255,255,255,0.2)'}`, background: selectedRules.includes(rule.rule_id) ? 'var(--accent-green)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                        {selectedRules.includes(rule.rule_id) && <Check size={12} color="white" strokeWidth={3} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <span style={{ fontWeight: 500, fontSize: '0.88rem' }}>{rule.name}</span>
                          <span style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem', borderRadius: '10px', background: rule.severity === 'Critical' ? 'rgba(255,61,0,0.12)' : 'rgba(0,230,118,0.12)', color: rule.severity === 'Critical' ? 'var(--accent-red)' : 'var(--accent-green)', border: `1px solid ${rule.severity === 'Critical' ? 'rgba(255,61,0,0.25)' : 'rgba(0,230,118,0.25)'}` }}>{rule.severity}</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{rule.rule_id} — {rule.category}{rule.source ? ` — ${rule.source}` : ''}</div>
                        <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '0.3rem', lineHeight: '1.4', maxHeight: '3.4em', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rule.rule_text}</div>
                      </div>
                      <ShieldCheck size={16} color={selectedRules.includes(rule.rule_id) ? 'var(--accent-green)' : 'var(--text-muted)'} />
                    </div>
                  ))}
                </div>
              )}
              {isProcessing && (
                <LoadingSpinner 
                  fullScreen={true} 
                  message={`Registering trial in system... ${progress}%`} 
                />
              )}

              {/* Add Rule Modal */}
              {showAddRuleModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20000 }} onClick={e => e.target === e.currentTarget && setShowAddRuleModal(false)}>
                  <div style={{ width: '480px', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '14px', padding: '1.5rem', boxShadow: '0 16px 50px rgba(0,0,0,0.5)' }}>
                    <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem' }}>Add Hospital Regulatory Rule</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      <div><label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rule Name</label><input value={newRule.name} onChange={e => setNewRule(p => ({ ...p, name: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', padding: '0.5rem 0.75rem', color: 'white', fontSize: '0.83rem', outline: 'none', boxSizing: 'border-box' }} placeholder="e.g., FDA 21 CFR Part 312" /></div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div><label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Category</label><select value={newRule.category} onChange={e => setNewRule(p => ({ ...p, category: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', padding: '0.5rem', color: 'white', fontSize: '0.83rem', outline: 'none' }}>{['General', 'Oncology', 'Cardiovascular', 'Neurology', 'Regulatory', 'Data Privacy', 'Safety'].map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                        <div><label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Severity</label><select value={newRule.severity} onChange={e => setNewRule(p => ({ ...p, severity: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', padding: '0.5rem', color: 'white', fontSize: '0.83rem', outline: 'none' }}>{['Critical', 'Mandatory', 'Advisory'].map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                      </div>
                      <div><label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Rule Text</label><textarea value={newRule.rule_text} onChange={e => setNewRule(p => ({ ...p, rule_text: e.target.value }))} rows={3} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', padding: '0.5rem 0.75rem', color: 'white', fontSize: '0.83rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} placeholder="Describe the regulatory rule or compliance requirement..." /></div>
                      <div><label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Source Document</label><input value={newRule.source} onChange={e => setNewRule(p => ({ ...p, source: e.target.value }))} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', padding: '0.5rem 0.75rem', color: 'white', fontSize: '0.83rem', outline: 'none', boxSizing: 'border-box' }} placeholder="e.g., FDA CFR Title 21" /></div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                      <button onClick={() => setShowAddRuleModal(false)} style={{ padding: '0.5rem 1rem', borderRadius: '7px', border: '1px solid rgba(255,255,255,0.12)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.82rem' }}>Cancel</button>
                      <button onClick={async () => { if (!newRule.name || !newRule.rule_text) return; const saved = await createHospitalRule(newRule); setHospitalRules(prev => [saved, ...prev]); setSelectedRules(prev => [...prev, saved.rule_id]); setNewRule({ name: '', category: 'General', rule_text: '', source: '', severity: 'Mandatory' }); setShowAddRuleModal(false); }} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.82rem' }}>Save Rule</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Complete */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.1rem', textAlign: 'center', padding: '2rem 0' }}>
              <div style={{ width: '76px', height: '76px', borderRadius: '50%', background: 'rgba(0,230,118,0.12)', border: '2px solid rgba(0,230,118,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Check size={34} color="var(--accent-green)" />
              </div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Trial Created Successfully!</h2>
              <div style={{ padding: '1rem 1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'left', minWidth: '340px' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trial Summary</div>
                {[['Trial Name', trialName], ['Vaccine / Drug', vaccine], ['Target Disease', targetDisease], ['Target Patients', targetPatients], ['Age Range', `${ageMin}-${ageMax} years`], ['Rules Applied', `${selectedRules.length} rules`]].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '0.35rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
                    <span style={{ fontWeight: 500 }}>{v || '-'}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button onClick={onClose} style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer', fontSize: '0.85rem' }}>Close</button>
                <button onClick={() => { onCreated?.(createdTrialId || 'ONCO-2024-01'); onClose(); }} className="btn btn-primary" style={{ padding: '0.6rem 1.5rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Eye size={15} /> View Created Trial Visuals
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step < 3 && step !== 0 && (
          <div style={{ padding: '1rem 1.75rem', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', flexShrink: 0, background: 'rgba(0,0,0,0.15)' }}>
            <button onClick={() => setStep(step - 1)} disabled={isProcessing} style={{ padding: '0.55rem 1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><ArrowLeft size={13} /> Back</button>
            {step === 1 && <button onClick={() => setStep(2)} className="btn btn-primary" style={{ padding: '0.55rem 1.5rem', fontSize: '0.85rem' }}>Next: Regulatory Rules <ChevronRight size={14} /></button>}
            {step === 2 && <button onClick={handleConfirm} disabled={isProcessing} className="btn btn-primary" style={{ padding: '0.55rem 1.5rem', fontSize: '0.85rem', opacity: isProcessing ? 0.6 : 1 }}>{isProcessing ? 'Creating Trial...' : <><Check size={14} /> Create Trial</>}</button>}
          </div>
        )}
      </div>
    </div>
  );
};


const ClinicalTrials = ({ isAdmin }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/admin') ? '/admin/trials' : '/dashboard/trials';

  const [searchTerm, setSearchTerm] = useState('');
  const [filterTime, setFilterTime] = useState('All Time');
  const [filterArea, setFilterArea] = useState('All Therapeutic Areas');
  const [filterPhase, setFilterPhase] = useState('All Phases');
  const [filterStatus, setFilterStatus] = useState('Recruitment Status');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'pipeline' | 'table'
  const [currentPage, setCurrentPage] = useState(1);
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [trials, setTrials] = useState([]);

  const loadTrials = async () => {
    try {
      const data = await fetchTrials();
      if (data) {
        setTrials(data);
      } else {
        setTrials([]);
      }
    } catch (err) {
      toast.error("Failed to load live trials.");
      console.error(err);
      setTrials([]);
    }
  };

  useEffect(() => {
    loadTrials();
  }, []);

  const goToTrial = (id) => navigate(`${basePath}/${id}`);

  const totalTrials = trials.length;
  const activeTrials = trials.filter(t => t.status === 'Active' || t.status === 'Recruiting' || t.status === 'CREATED').length;
  const completedTrials = trials.filter(t => t.status === 'Completed' || t.pipeline_stage === 'COMPLETED').length;
  const upcomingTrials = trials.filter(t => t.pipeline_stage === 'NONE').length;

  const stageToProgress = (stage) => {
    const map = { NONE: 0, HARD_FILTER: 25, SEMANTIC_FILTER: 50, COMPLIANCE: 65, TWINS: 80, COMPLETED: 100 };
    return map[stage] || 0;
  };
  const stageToLabel = (stage) => {
    const map = { NONE: 'Awaiting Pipeline', HARD_FILTER: 'Hard Filter Done', SEMANTIC_FILTER: 'Semantic Done', COMPLIANCE: 'Compliance Done', TWINS: 'Twins Built', COMPLETED: 'Complete' };
    return map[stage] || stage;
  };
  const avgProgress = totalTrials ? Math.round(trials.reduce((acc, curr) => acc + stageToProgress(curr.pipeline_stage), 0) / totalTrials) : 0;

  const filteredTrials = trials.filter(t => {
    const title = t.title || t.trial_id || '';
    const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.trial_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArea = filterArea === 'All Therapeutic Areas' || filterArea === 'All'; // DB has no area
    const matchesPhase = filterPhase === 'All Phases' || filterPhase === 'All'; // DB has no phase
    const matchesStatus = filterStatus === 'Recruitment Status' || filterStatus === 'All' || t.status === filterStatus;
    return matchesSearch && matchesArea && matchesPhase && matchesStatus;
  });

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <ExportReportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Clinical Trial Pipeline Roster"
        pdfTitle="ClinTwin Clinical Trial Pipelines & Enrollment Executive Report"
        columns={['Trial ID', 'Trial Protocol Name', 'Status', 'Pipeline Stage']}
        data={filteredTrials.map(t => ({ id: t.trial_id, name: t.title || t.trial_id, status: t.status, stage: t.pipeline_stage }))}
        fileNamePrefix="clinical_trials_pipeline"
        onSuccess={(msg) => toast.success(msg)}
      />

      {showCreateWizard && (
        <CreateTrialWizard
          onClose={() => { setShowCreateWizard(false); loadTrials(); }}
          onCreated={(createdId) => goToTrial(createdId || 'ONCO-2024-01')}
          onTrialCreated={loadTrials}
        />
      )}
      <SectionHeader
        title={isAdmin ? 'Trial Administration' : 'Clinical Trials Studio'}
        subtitle="Explore and manage visual clinical trial pipelines, target cohorts, and eligibility criteria"
        action={
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => setShowExportModal(true)}>
              <Download size={16} /> Export Report
            </button>
            {!isAdmin && (
              <button className="btn btn-primary" onClick={() => setShowCreateWizard(true)} style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={16} /> Create Clinical Trial
              </button>
            )}
          </div>
        }
      />

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard title="Total Clinical Trials" value={totalTrials.toString()} subtext="Across all organizations" icon={Activity} color="157, 78, 221" />
        <StatCard title="Active Trials" value={activeTrials.toString()} subtext="Recruiting patients" trend="+2" icon={UsersIcon} color="0, 230, 118" />
        <StatCard title="Completed Trials" value={completedTrials.toString()} subtext="Successfully completed" trend="+5" icon={CheckCircle} color="0, 102, 255" />
        <StatCard title="Draft / Upcoming" value={upcomingTrials.toString()} subtext="Not yet started" icon={Clock} color="255, 214, 0" />
        <StatCard title="Avg. Enrollment Progress" value={`${avgProgress}%`} subtext="Across active trials" trend="+4%" icon={Target} color="0, 230, 118" />
      </div>

      {/* Filter & View Representation Switcher Bar */}
      <div className="flex-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input type="text" placeholder="Search trials visualizer..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', padding: '0.45rem 1rem 0.45rem 2rem', color: 'white', fontSize: '0.85rem', width: '100%', borderRadius: '6px', outline: 'none' }} />
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {[
              { val: filterTime, set: setFilterTime, opts: ['All Time', 'Last 7 Days', 'Last 30 Days'] },
              { val: filterArea, set: setFilterArea, opts: ['All Therapeutic Areas', 'Oncology', 'Cardiology', 'Neurology'] },
              { val: filterPhase, set: setFilterPhase, opts: ['All Phases', 'Phase I', 'Phase II', 'Phase III', 'Phase IV'] },
              { val: filterStatus, set: setFilterStatus, opts: ['Recruitment Status', 'Active', 'Recruiting', 'Suspended', 'Completed'] },
            ].map((f, i) => (
              <select key={i} value={f.val} onChange={e => f.set(e.target.value)} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'white', padding: '0.45rem 0.75rem', borderRadius: '6px', fontSize: '0.78rem', outline: 'none' }}>
                {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ))}
          </div>
        </div>

        {/* Visual View Mode Controls */}
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '0.2rem' }}>
          <button
            onClick={() => setViewMode('cards')}
            style={{
              padding: '0.4rem 0.85rem',
              background: viewMode === 'cards' ? 'var(--accent-blue)' : 'transparent',
              color: viewMode === 'cards' ? 'var(--bg-primary)' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s'
            }}
          >
            <Activity size={14} /> Visual Cards Grid
          </button>
          <button
            onClick={() => setViewMode('pipeline')}
            style={{
              padding: '0.4rem 0.85rem',
              background: viewMode === 'pipeline' ? 'var(--accent-purple)' : 'transparent',
              color: viewMode === 'pipeline' ? 'white' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s'
            }}
          >
            <Target size={14} /> Phase Pipeline Flow
          </button>
          <button
            onClick={() => setViewMode('table')}
            style={{
              padding: '0.4rem 0.75rem',
              background: viewMode === 'table' ? 'rgba(255,255,255,0.15)' : 'transparent',
              color: viewMode === 'table' ? 'white' : 'var(--text-muted)',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 500,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s'
            }}
          >
            <FileText size={14} /> Table View
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2.4fr 1fr', gap: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* VIEW MODE 1: VISUAL CARDS GRID (PRIMARY DEMO MODE) */}
          {viewMode === 'cards' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Visual Trial Pipeline Cards
                  <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '10px', background: 'rgba(0,240,255,0.12)', color: 'var(--accent-blue)', border: '1px solid rgba(0,240,255,0.3)' }}>{filteredTrials.length} Trials Active</span>
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
                {filteredTrials.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', gridColumn: 'span 2' }}>
                    No trials available.
                  </div>
                ) : (
                  filteredTrials.map((trial, i) => {
                    const progress = stageToProgress(trial.pipeline_stage);
                    return (
                    <div
                    key={trial.trial_id}
                    className="glass-panel"
                    onClick={() => goToTrial(trial.trial_id)}
                    style={{
                      padding: '1.35rem',
                      border: trial.status === 'Recruiting' ? '1px solid rgba(0, 230, 118, 0.35)' : '1px solid rgba(0, 240, 255, 0.2)',
                      background: trial.status === 'Recruiting' ? 'rgba(0, 230, 118, 0.02)' : 'rgba(10, 20, 35, 0.6)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.25s ease',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.border = '1px solid var(--accent-blue)'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 0 25px rgba(0,240,255,0.2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.border = trial.status === 'Recruiting' ? '1px solid rgba(0, 230, 118, 0.35)' : '1px solid rgba(0, 240, 255, 0.2)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    {/* Header Pill Tags */}
                    <div className="flex-between" style={{ marginBottom: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-blue)', letterSpacing: '0.5px' }}>{trial.trial_id}</span>
                        <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)' }}>{trial.description?.match(/Phase[:\s]*([IVX0-9/]+)/i)?.[0] || stageToLabel(trial.pipeline_stage)}</span>
                      </div>
                      <StatusBadge status={trial.status} />
                    </div>

                    {/* Trial Title & Area */}
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'white', marginBottom: '0.35rem', lineHeight: '1.3' }}>{trial.title || trial.trial_id}</h4>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Activity size={13} color="var(--accent-purple)" />
                      <span>Pipeline: <strong style={{ color: 'var(--text-primary)' }}>{stageToLabel(trial.pipeline_stage)}</strong></span>
                    </div>

                    {/* Visual Enrollment Progress Gauge */}
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '1.1rem' }}>
                      <div className="flex-between" style={{ fontSize: '0.78rem', marginBottom: '0.45rem' }}>
                        <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <UsersIcon size={13} color="var(--accent-green)" /> Target Matched Cohort
                        </span>
                        <span style={{ fontWeight: 700, color: 'var(--accent-green)' }}>{progress}%</span>
                      </div>
                      <div style={{ width: '100%', height: '7px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${progress}%`,
                          height: '100%',
                          background: progress > 75 ? 'linear-gradient(90deg, #00e676, #00f0ff)' : 'linear-gradient(90deg, #ffd600, #00e676)',
                          borderRadius: '4px',
                          boxShadow: '0 0 10px rgba(0, 230, 118, 0.5)'
                        }} />
                      </div>
                    </div>

                    {/* Assigned Doctor / Lead Investigator */}
                    <div className="flex-between" style={{ paddingTop: '0.65rem', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.78rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(0,240,255,0.15)', border: '1px solid rgba(0,240,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={14} color="var(--accent-blue)" />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Lead Investigator</div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{trial.description?.match(/Phase:\s*([^,]+)/i)?.[1] ? `Phase ${trial.description.match(/Phase:\s*([^,]+)/i)[1].trim()} Trial` : 'Clinical Trial'}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-blue)', fontWeight: 600, fontSize: '0.78rem' }}>
                        <ExplainButton 
                          payload={{
                            action: `Trial Pipeline Stage: ${trial.pipeline_stage}`,
                            rationale: `Explain the current status of trial ${trial.trial_id} and the implications of being in ${stageToLabel(trial.pipeline_stage)}.`,
                            belief_state: { trial: trial }
                          }}
                          label="AI Status"
                        />
                        Inspect Visuals <ChevronRight size={14} />
                      </div>
                    </div>
                  </div>
                  );
                })
              )}
              </div>
            </div>
          )}

          {/* VIEW MODE 2: PHASE PIPELINE FLOW (KANBAN STYLE PIPELINE) */}
          {viewMode === 'pipeline' && (
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Phase Pipeline Flow Visualizer</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>Visual stage progression from Phase I early safety to Phase IV post-market analytics</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                {['Phase I', 'Phase II', 'Phase III', 'Phase IV'].map(phase => {
                  const phaseTrials = trials.filter(t => (t.phase || 'III').includes(phase.replace('Phase ', '')));
                  return (
                    <div key={phase} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '1rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex-between" style={{ marginBottom: '0.85rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-purple)' }}>{phase}</span>
                        <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.45rem', borderRadius: '10px', background: 'rgba(157,78,221,0.2)', color: 'var(--accent-purple)' }}>{phaseTrials.length} Trials</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {phaseTrials.map(t => {
                          const progress = stageToProgress(t.pipeline_stage);
                          return (
                          <div
                            key={t.trial_id}
                            onClick={() => goToTrial(t.trial_id)}
                            style={{
                              background: 'rgba(10, 20, 35, 0.8)',
                              border: '1px solid rgba(0, 240, 255, 0.2)',
                              borderRadius: '8px',
                              padding: '0.85rem',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.border = '1px solid var(--accent-blue)'}
                            onMouseLeave={e => e.currentTarget.style.border = '1px solid rgba(0, 240, 255, 0.2)'}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-blue)' }}>{t.trial_id}</span>
                              <StatusBadge status={t.status} />
                            </div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'white', marginBottom: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title || t.trial_id}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                              <span>Stage: <strong style={{ color: 'var(--accent-green)' }}>{stageToLabel(t.pipeline_stage)}</strong></span>
                              <span>{progress}%</span>
                            </div>
                          </div>
                        )})}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW MODE 3: STANDARD TABLE VIEW (SECONDARY FALLBACK) */}
          {viewMode === 'table' && (
            <div className="glass-panel" style={{ padding: '0' }}>
              <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 style={{ fontSize: '1.1rem' }}>All Clinical Trials Table</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                      {['Trial ID', 'Trial Protocol Name', 'Status', 'Pipeline Stage', 'Enrollment Progress', 'Actions'].map((h, i) => (
                        <th key={h} style={{ padding: '1rem', textAlign: i === 5 ? 'right' : 'left' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrials.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ padding: '0' }}>
                          <EmptyState 
                            icon={Search} 
                            title="No Active Clinical Trial Protocols" 
                            description="There are currently no matching clinical trial protocols. Adjust your semantic filters or initiate a new AI-driven trial pipeline." 
                          />
                        </td>
                      </tr>
                    ) : (
                      filteredTrials.slice((currentPage - 1) * 8, currentPage * 8).map((t, i) => {
                        const progress = stageToProgress(t.pipeline_stage);
                        return (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', cursor: 'pointer' }} className="table-row-hover" onClick={() => goToTrial(t.trial_id)}>
                          <td style={{ padding: '1rem', color: 'var(--accent-blue)', fontWeight: 500 }}>{t.trial_id}</td>
                          <td style={{ padding: '1rem' }}>{t.title || t.trial_id}</td>
                          <td style={{ padding: '1rem' }}><StatusBadge status={t.status} /></td>
                          <td style={{ padding: '1rem' }}>{t.pipeline_stage}</td>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ width: '30px' }}>{progress}%</span>
                              <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
                                <div style={{ width: `${progress}%`, height: '100%', background: progress === 100 ? 'var(--accent-blue)' : 'var(--accent-green)', borderRadius: '2px' }} />
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <Eye size={16} color="var(--accent-blue)" cursor="pointer" onClick={() => goToTrial(t.trial_id)} />
                              <MoreVertical size={16} color="var(--text-secondary)" cursor="pointer" />
                            </div>
                          </td>
                        </tr>
                          );
                        })
                      )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Analytics — Live Data */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Pipeline Stage Breakdown</h3>
            {trials.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', margin: '2rem 0' }}>No clinical trial pipelines have been initiated.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {['NONE', 'HARD_FILTER', 'SEMANTIC_FILTER', 'COMPLIANCE', 'TWINS', 'COMPLETED'].map(stage => {
                  const count = trials.filter(t => t.pipeline_stage === stage).length;
                  if (count === 0) return null;
                  return (
                    <div key={stage} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{stage.replace(/_/g, ' ')}</span>
                      <span style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Status Overview</h3>
            {trials.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', margin: '2rem 0' }}>No trials created yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {['CREATED', 'Recruiting', 'Active', 'Completed', 'Suspended'].map(status => {
                  const count = trials.filter(t => t.status === status).length;
                  if (count === 0) return null;
                  const colors = { CREATED: 'var(--accent-yellow)', Recruiting: 'var(--accent-green)', Active: 'var(--accent-blue)', Completed: 'var(--accent-purple)', Suspended: 'var(--accent-red)' };
                  return (
                    <div key={status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors[status] || 'var(--text-muted)' }} />
                        <span style={{ color: 'var(--text-secondary)' }}>{status}</span>
                      </div>
                      <span style={{ fontWeight: 700, color: colors[status] || 'var(--text-primary)' }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {/* duplicate wizard removed — handled above */}

      {showAreaModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div className="glass-panel" style={{ width: '500px', maxWidth: '90%', padding: '2rem' }}>
            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
              <h3>All Therapeutic Areas</h3>
              <button onClick={() => setShowAreaModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}>×</button>
            </div>
            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No data available.</div>
          </div>
        </div>
      )}

      {showStatusModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div className="glass-panel" style={{ width: '500px', maxWidth: '90%', padding: '2rem' }}>
            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
              <h3>Recruitment Status Overview</h3>
              <button onClick={() => setShowStatusModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}>×</button>
            </div>
            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No data available.</div>
          </div>
        </div>
      )}

      {toast && <div className="toast-notification">{toast}</div>}
    </div>
  );
};

export default ClinicalTrials;
