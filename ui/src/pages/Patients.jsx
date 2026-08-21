import React, { useState, useEffect } from 'react';
import { Users, FileCheck, AlertCircle, FileX, Search, Filter, Download, Plus, Settings, ChevronLeft, Activity, FileText, Heart, Thermometer, Database, Beaker, Pill, Dna, CheckCircle, Calendar, UploadCloud, Loader2, Table, Trash2, Upload } from 'lucide-react';
import { StatCard, StatusBadge, SectionHeader, TabBar } from '../components/common/UIComponents';
import { subscribe } from '../mockData';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useGlobalData } from '../context/GlobalDataContext';
import { fetchPatients, fetchPatientNotes, uploadNotesCsv, uploadNotesZip, uploadTabularPatients, resetPatients } from '../services/api';
import { parsePatientsFromFile } from '../utils/patientParser';


import PatientDetail from '../components/patients/PatientDetail';

import { ExportReportModal } from '../components/common/ExportReportModal';
import EmptyState from '../components/common/EmptyState';
import ExplainButton from '../components/common/ExplainButton';
import toast from 'react-hot-toast';

const Patients = () => {
  const { metrics, setMetrics, activePatient: selectedPatient, setActivePatient: setSelectedPatient, refreshGlobalMetrics } = useGlobalData();
  const [currentPage, setCurrentPage] = useState(1);
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Data Ingestion State
  const [ingestionState, setIngestionState] = useState('idle'); // idle, uploading, wizard, complete
  const [extractionStage, setExtractionStage] = useState(0); 
  const [ingestionStep, setIngestionStep] = useState(1);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [previewData, setPreviewData] = useState({ valid_rows: 0, patients: [] }); 
  const [filterGender, setFilterGender] = useState('All Genders');
  const [filterECOG, setFilterECOG] = useState('All ECOG Scores');
  const [showFilters, setShowFilters] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Add Patient Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: '',
    age: '54',
    gender: 'Female',
    cancerType: 'Lung Cancer',
    stage: 'IIIB',
    status: 'Eligible',
    score: 88,
    assignedTrial: 'LUNG-2024-02',
    doctor: 'Dr. Arjun Kumar'
  });

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => {
    fetchPatients().then(data => {
      if (data && data.length > 0) setPatients(data);
      else setPatients([]);
    }).catch(err => {
      console.error(err);
      toast.error("Failed to load patients.");
    });
    
    return subscribe(() => {
      fetchPatients().then(data => {
        if (data && data.length > 0) setPatients(data);
        else setPatients([]);
      });
    });
  }, []);

  const handleResetDatabase = async () => {
    if (!window.confirm("Are you sure you want to delete all patient and trial data?")) return;
    try {
      const toastId = toast.loading("Resetting database...");
      await resetPatients();
      refreshGlobalMetrics();
      setPatients([]);
      toast.success("Database reset successfully.", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to reset database.");
    }
  };

  const startWizard = () => {
    setIngestionState('wizard');
    setIngestionStep(1);
    setUploadedFile(null);
    setPreviewData({ valid_rows: 0, patients: [] });
    setExtractionStage(0);
  };

  const handleCsvUploadStep = async (e) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setIngestionState('uploading');
    setExtractionStage(1);
    try {
      setUploadedFile({ name: file.name, size: (file.size / 1024 / 1024).toFixed(2) + ' MB', type: 'tabular-csv', file_obj: file });
      try {
        const parsedPatients = await parsePatientsFromFile(file);
        setPreviewData({ valid_rows: parsedPatients.length, patients: parsedPatients });
      } catch(err) {}
      
      await uploadTabularPatients(file);
      
      setIngestionState('wizard');
      setIngestionStep(2);
    } catch (err) {
      console.error(err);
      toast.error("Failed to ingest CSV cohort data.");
      setIngestionState('wizard');
      setIngestionStep(1);
    }
    e.target.value = null;
  };

  const handleZipUploadStep = async (e) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setIngestionState('uploading');
    setExtractionStage(2);
    try {
      await uploadNotesZip(file);
      setExtractionStage(3);
      setUploadedFile({ name: file.name, size: (file.size / 1024 / 1024).toFixed(2) + ' MB', type: 'notes-zip', file_obj: file });
      
      setTimeout(() => {
        setIngestionState('complete');
        refreshGlobalMetrics();
        fetchPatients().then(data => {
          if (data && data.length > 0) setPatients(data);
        });
      }, 1000);
    } catch (err) {
      console.error(err);
      toast.error("Failed to process Clinical Notes.");
      setIngestionState('wizard');
      setIngestionStep(2);
    }
    e.target.value = null;
  };

  const handleAddPatientSubmit = (e) => {
    e.preventDefault();
    if (!newPatient.name.trim()) {
      showToast('Please enter a valid patient name.');
      return;
    }

    const newId = `P-0${Math.floor(Math.random() * 90000) + 10000}`;
    const createdPatient = {
      id: newId,
      name: newPatient.name.trim(),
      age: parseInt(newPatient.age) || 50,
      gender: newPatient.gender,
      cancerType: newPatient.cancerType,
      stage: newPatient.stage,
      status: newPatient.status,
      score: parseInt(newPatient.score) || 80,
      assignedTrial: newPatient.assignedTrial,
      doctor: newPatient.doctor,
      patientsTreated: Math.floor(Math.random() * 120) + 20,
      lastUpdated: 'Just now'
    };

    import('../mockData').then(({ patientsData, systemLogs, triggerUpdate }) => {
      patientsData.unshift(createdPatient);
      
      systemLogs.unshift({
        action: `Created new patient record ${newId} (${createdPatient.name})`,
        user: 'Research Physician',
        time: 'Just now'
      });

      if (setMetrics) {
        setMetrics(prev => ({
          ...prev,
          total: prev.total + 1,
          eligible: createdPatient.status === 'Eligible' ? prev.eligible + 1 : prev.eligible,
          review: createdPatient.status === 'Under Review' ? prev.review + 1 : prev.review,
          notEligible: createdPatient.status === 'Not Eligible' ? prev.notEligible + 1 : prev.notEligible
        }));
      }

      triggerUpdate();
      setPatients([...patientsData]);
      setShowAddModal(false);
      showToast(`Patient ${newId} (${createdPatient.name}) added successfully!`);

      // Reset Form
      setNewPatient({
        name: '',
        age: '54',
        gender: 'Female',
        cancerType: 'Lung Cancer',
        stage: 'IIIB',
        status: 'Eligible',
        score: 88,
        assignedTrial: 'LUNG-2024-02',
        doctor: 'Dr. Arjun Kumar'
      });
    });
  };

  if (selectedPatient) {
    return <PatientDetail patient={selectedPatient} onBack={() => setSelectedPatient(null)} />;
  }

  const filteredPatients = patients.filter(p => {
    const matchSearch = p.id.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchGender = filterGender === 'All Genders' || p.sex === filterGender;
    
    const matchECOG = filterECOG === 'All ECOG Scores' || String(p.ecog_score) === filterECOG;
    
    return matchSearch && matchGender && matchECOG;
  });

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8,Patient ID,Age,Gender,BMI,ECOG Score,BP Systolic,BP Diastolic,eGFR,Platelets,Hemoglobin,ALT,AST\n" 
      + filteredPatients.map(p => `${p.id},${p.age},${p.sex},${p.bmi},${p.ecog_score},${p.systolic_bp},${p.diastolic_bp},${p.egfr},${p.platelets},${p.hemoglobin},${p.alt},${p.ast}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "patients_export.csv");
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <SectionHeader 
        title="Patients" 
        subtitle="Manage and explore patient records" 
        action={
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }} onClick={handleResetDatabase}><Trash2 size={16} style={{ marginRight: '8px' }}/> Reset Data</button>
            
            <button className="btn btn-primary" style={{ padding: '0.5rem 1rem' }} onClick={startWizard}><UploadCloud size={16} style={{ marginRight: '8px' }}/> Ingest Patient Cohort</button>
            <input type="file" id="csv-upload" accept=".csv" style={{ display: 'none' }} onChange={handleCsvUploadStep} />
            <input type="file" id="zip-upload" accept=".zip,.pdf" style={{ display: 'none' }} onChange={handleZipUploadStep} />
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard title="Total Patients" value={metrics.total.toLocaleString()} subtext="100% of population" icon={Users} color="0, 102, 255" />
        <StatCard title="Eligible" value={metrics.eligible.toLocaleString()} subtext={`${((metrics.eligible / Math.max(1, metrics.total)) * 100).toFixed(1)}%`} icon={FileCheck} color="0, 230, 118" />
        <StatCard title="Under Review" value={metrics.review.toLocaleString()} subtext={`${((metrics.review / Math.max(1, metrics.total)) * 100).toFixed(1)}%`} icon={AlertCircle} color="255, 214, 0" />
        <StatCard title="Not Eligible" value={metrics.notEligible.toLocaleString()} subtext={`${((metrics.notEligible / Math.max(1, metrics.total)) * 100).toFixed(1)}%`} icon={FileX} color="220, 53, 69" />
        <StatCard title="Unprocessed" value={metrics.unprocessed.toLocaleString()} subtext="Pending Trial Simulation" icon={FileX} color="100, 100, 100" />
        <StatCard title="Active in Trials" value="28" subtext="Recruiting now" icon={Activity} color="157, 78, 221" />
      </div>

      {/* Wizard Overlay */}
      {ingestionState === 'wizard' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel fade-in" style={{ padding: '3rem', width: '600px' }}>
            <div className="flex-between" style={{ marginBottom: '2rem' }}>
              <h2>Ingest Patient Data</h2>
              <button className="btn btn-secondary" onClick={() => setIngestionState('idle')}>Cancel</button>
            </div>
            
            <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
              <div style={{ flex: 1, padding: '1.5rem', background: ingestionStep === 1 ? 'rgba(0,102,255,0.1)' : 'rgba(255,255,255,0.02)', border: `1px solid ${ingestionStep === 1 ? 'var(--accent-blue)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '8px', textAlign: 'center', opacity: ingestionStep >= 1 ? 1 : 0.5 }}>
                <Table size={32} color={ingestionStep >= 2 ? "var(--accent-green)" : "var(--accent-blue)"} style={{ marginBottom: '1rem' }} />
                <h3>Step 1: Baseline CSV</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Upload tabular patient demographics and lab results.</p>
                {ingestionStep === 1 ? (
                  <button className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }} onClick={() => document.getElementById('csv-upload').click()}>Select CSV File</button>
                ) : (
                  <div style={{ marginTop: '1rem', color: 'var(--accent-green)', fontWeight: 'bold' }}>✓ Uploaded</div>
                )}
              </div>
              
              <div style={{ flex: 1, padding: '1.5rem', background: ingestionStep === 2 ? 'rgba(0,102,255,0.1)' : 'rgba(255,255,255,0.02)', border: `1px solid ${ingestionStep === 2 ? 'var(--accent-blue)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '8px', textAlign: 'center', opacity: ingestionStep >= 2 ? 1 : 0.5 }}>
                <FileText size={32} color={ingestionStep >= 3 ? "var(--accent-green)" : (ingestionStep === 2 ? "var(--accent-blue)" : "var(--text-muted)")} style={{ marginBottom: '1rem' }} />
                <h3>Step 2: Clinical Notes</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Upload unstructured PDFs or ZIP of patient notes.</p>
                {ingestionStep === 2 && (
                  <button className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }} onClick={() => document.getElementById('zip-upload').click()}>Select ZIP/PDF</button>
                )}
              </div>
            </div>
            
            {ingestionStep === 2 && previewData.valid_rows > 0 && (
              <div style={{ background: 'rgba(0, 230, 118, 0.1)', border: '1px solid var(--accent-green)', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <CheckCircle color="var(--accent-green)" />
                <div>
                  <div style={{ fontWeight: 'bold', color: 'var(--accent-green)' }}>Baseline Patients Created Successfully</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Found {previewData.valid_rows} patients. Please upload their clinical notes to complete the pipeline.</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ingestion Overlay */}
      {ingestionState === 'uploading' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel fade-in" style={{ padding: '3rem', textAlign: 'center', width: '500px' }}>
             <UploadCloud size={48} color="var(--accent-blue)" className="pulse-animation" style={{ marginBottom: '1.5rem' }} />
             <h2 style={{ marginBottom: '1.5rem' }}>Ingesting Data Pipeline</h2>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', color: extractionStage >= 0 ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                   {extractionStage >= 0 ? <CheckCircle size={20} /> : <div style={{ width: '20px', height: '20px', border: '2px solid currentColor', borderRadius: '50%' }}></div>}
                   <span>Uploading Data...</span>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', color: extractionStage >= 1 ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                   {extractionStage >= 1 ? <CheckCircle size={20} /> : extractionStage === 0 ? <Loader2 size={20} className="spin-animation" color="var(--accent-blue)" /> : <div style={{ width: '20px', height: '20px', border: '2px solid currentColor', borderRadius: '50%' }}></div>}
                   <span>Processing & Structuring</span>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', color: extractionStage >= 2 ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                   {extractionStage >= 2 ? <CheckCircle size={20} /> : extractionStage === 1 ? <Loader2 size={20} className="spin-animation" color="var(--accent-blue)" /> : <div style={{ width: '20px', height: '20px', border: '2px solid currentColor', borderRadius: '50%' }}></div>}
                   <span>Extracting Clinical Entities via NLP</span>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', color: extractionStage >= 3 ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                   {extractionStage >= 3 ? <CheckCircle size={20} /> : extractionStage === 2 ? <Loader2 size={20} className="spin-animation" color="var(--accent-blue)" /> : <div style={{ width: '20px', height: '20px', border: '2px solid currentColor', borderRadius: '50%' }}></div>}
                   <span>Validating Data Models</span>
                </div>
             </div>
          </div>
        </div>
      )}

      {ingestionState === 'complete' && uploadedFile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel fade-in" style={{ padding: '2rem', width: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex-between" style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {uploadedFile.type === 'notes-zip' || uploadedFile.name.endsWith('.pdf') ? <FileText size={28} color="var(--accent-red)" /> : <Table size={28} color="var(--accent-green)" />}
                <div>
                  <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Extraction Complete</h2>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{uploadedFile.name} ({uploadedFile.size})</div>
                </div>
              </div>
              <button className="btn btn-secondary" onClick={() => setIngestionState('idle')}>Acknowledge & Close</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h4 style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>EXTRACTION METADATA</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <div className="flex-between"><span>Files/Rows Detected</span><span>{previewData.valid_rows}</span></div>
                  <div className="flex-between"><span>NLP Processing</span><span style={{ color: 'var(--accent-blue)' }}>Completed</span></div>
                  <div className="flex-between"><span>Extraction Status</span><span style={{ color: 'var(--accent-green)' }}>Success</span></div>
                </div>
                <div style={{ marginTop: '1.5rem', height: '200px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '1rem', overflowY: 'auto', color: 'var(--text-muted)', fontSize: '0.75rem', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                  [ Pipeline successfully extracted and indexed the text chunks for vector matching. ]
                </div>
              </div>
              <div>
                <h4 style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>IDENTIFIED PATIENT IDS</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '350px', overflowY: 'auto' }}>
                  {previewData.patients.length === 0 ? (
                     <div style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No patient records detected.</div>
                  ) : (
                    previewData.patients.map((row, idx) => (
                      <div key={idx} style={{ display: 'flex', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                        <div style={{ width: '150px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Source: {row.source}</div>
                        <div style={{ flex: 1, fontWeight: 500, fontSize: '0.9rem', color: row.id === 'PT-UNKNOWN' ? 'var(--accent-red)' : 'var(--accent-green)' }}>{row.id}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="glass-panel" style={{ padding: '0', display: 'flex', flexDirection: 'column' }}>
        
        {/* Filters Row */}
        <div style={{ display: 'flex', gap: '1rem', padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search by ID, name, or diagnosis..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ background: 'transparent', border: 'none', padding: '0.4rem 1rem 0.4rem 2rem', color: 'white', fontSize: '0.85rem', width: '100%', outline: 'none' }} 
            />
          </div>
          
          <select value={filterGender} onChange={e => setFilterGender(e.target.value)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'white', padding: '0.4rem 1rem', borderRadius: '4px', fontSize: '0.8rem', outline: 'none' }}>
             <option>All Genders</option>
             <option>Male</option>
             <option>Female</option>
          </select>
          <select value={filterECOG} onChange={e => setFilterECOG(e.target.value)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'white', padding: '0.4rem 1rem', borderRadius: '4px', fontSize: '0.8rem', outline: 'none' }}>
             <option>All ECOG Scores</option>
             <option>0</option>
             <option>1</option>
             <option>2</option>
             <option>3</option>
             <option>4</option>
             <option>5</option>
          </select>
          <button className="btn btn-secondary" onClick={() => setShowFilters(!showFilters)} style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: showFilters ? 'rgba(255,255,255,0.1)' : 'transparent', border: '1px solid transparent' }}><Filter size={14} /> More Filters</button>
          <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }} onClick={() => setShowExportModal(true)}><Download size={14} /> Export Report</button>
        </div>

        {/* Data Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '1rem', width: '40px' }}><input type="checkbox" /></th>
                <th style={{ padding: '1rem' }}>Patient ID</th>
                <th style={{ padding: '1rem' }}>Age</th>
                <th style={{ padding: '1rem' }}>Gender</th>
                <th style={{ padding: '1rem' }}>BMI</th>
                <th style={{ padding: '1rem' }}>ECOG Score</th>
                <th style={{ padding: '1rem' }}>BP (Sys/Dia)</th>
                <th style={{ padding: '1rem' }}>eGFR</th>
                <th style={{ padding: '1rem' }}>Platelets</th>
                <th style={{ padding: '1rem' }}>Hemoglobin</th>
                <th style={{ padding: '1rem' }}>ALT</th>
                <th style={{ padding: '1rem' }}>AST</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan="13" style={{ padding: '0' }}>
                    <EmptyState 
                      icon={Users} 
                      title="No Patient Cohorts Enrolled" 
                      description="Initialize the digital twin environment by securely uploading tabular patient records or clinical trial notes." 
                    />
                  </td>
                </tr>
              ) : (
                filteredPatients.slice((currentPage - 1) * 10, currentPage * 10).map((p, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'background 0.2s' }} className="table-row-hover">
                    <td style={{ padding: '1rem' }}><input type="checkbox" /></td>
                    <td style={{ padding: '1rem', color: 'var(--accent-blue)', cursor: 'pointer' }} onClick={() => setSelectedPatient(p)}>{p.id}</td>
                    <td style={{ padding: '1rem' }}>{p.age}</td>
                    <td style={{ padding: '1rem', color: p.sex === 'Male' ? 'var(--accent-blue)' : (p.sex === 'Female' ? 'var(--accent-purple)' : 'var(--text-secondary)') }}>
                      {p.sex === 'Male' ? '♂' : (p.sex === 'Female' ? '♀' : p.sex)}
                    </td>
                    <td style={{ padding: '1rem' }}>{p.bmi}</td>
                    <td style={{ padding: '1rem' }}>{p.ecog_score}</td>
                    <td style={{ padding: '1rem' }}>{p.systolic_bp}/{p.diastolic_bp}</td>
                    <td style={{ padding: '1rem', color: p.egfr < 60 ? 'var(--accent-yellow)' : 'inherit' }}>{p.egfr}</td>
                    <td style={{ padding: '1rem' }}>{p.platelets}</td>
                    <td style={{ padding: '1rem', color: p.hemoglobin < 12 ? 'var(--accent-red)' : 'inherit' }}>{p.hemoglobin}</td>
                    <td style={{ padding: '1rem' }}>{p.alt}</td>
                    <td style={{ padding: '1rem' }}>{p.ast}</td>
                    <td style={{ padding: '1rem', textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <ExplainButton 
                        payload={{
                          action: `Patient Eligibility Assessment for ${p.id}`,
                          rationale: "User requested explanation of clinical profile metrics vs standard inclusion criteria.",
                          belief_state: { patient: p }
                        }}
                        label=""
                      />
                      <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setSelectedPatient(p)}>View</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Mock */}
        <div className="flex-between" style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          <div>Showing {(currentPage - 1) * 10 + 1} to {Math.min(currentPage * 10, filteredPatients.length)} of {filteredPatients.length} patients</div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
             <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>«</button>
             {Array.from({ length: Math.ceil(filteredPatients.length / 10) }, (_, i) => i + 1).map(page => (
               <button key={page} onClick={() => setCurrentPage(page)} style={{ background: currentPage === page ? 'var(--accent-purple)' : 'none', border: 'none', color: currentPage === page ? 'white' : 'var(--text-primary)', borderRadius: '4px', width: '24px', height: '24px', cursor: 'pointer' }}>{page}</button>
             ))}
             <button onClick={() => setCurrentPage(Math.min(Math.ceil(filteredPatients.length / 10), currentPage + 1))} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>»</button>
          </div>
          <div>10 per page v</div>
        </div>

      </div>
      
      {/* Add New Patient Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          background: 'rgba(0, 5, 15, 0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '560px',
            background: 'rgba(10, 20, 35, 0.95)',
            border: '1px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '14px',
            padding: '1.75rem',
            boxShadow: '0 0 35px rgba(0, 240, 255, 0.25)',
            animation: 'fade-in 0.3s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Plus size={20} color="var(--accent-blue)" /> Add New Patient Record
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Enroll new participant in digital twin clinical database</span>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddPatientSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Full Patient Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Eleanor Vance"
                  value={newPatient.name}
                  onChange={e => setNewPatient({ ...newPatient, name: e.target.value })}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.6rem 0.85rem', color: 'white', fontSize: '0.85rem', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Age</label>
                  <input
                    type="number"
                    min="18"
                    max="100"
                    value={newPatient.age}
                    onChange={e => setNewPatient({ ...newPatient, age: e.target.value })}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.6rem 0.85rem', color: 'white', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Gender</label>
                  <select
                    value={newPatient.gender}
                    onChange={e => setNewPatient({ ...newPatient, gender: e.target.value })}
                    style={{ width: '100%', background: 'rgba(10,20,35,0.95)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.6rem 0.85rem', color: 'white', fontSize: '0.85rem', outline: 'none' }}
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Cancer Diagnosis</label>
                  <select
                    value={newPatient.cancerType}
                    onChange={e => setNewPatient({ ...newPatient, cancerType: e.target.value })}
                    style={{ width: '100%', background: 'rgba(10,20,35,0.95)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.6rem 0.85rem', color: 'white', fontSize: '0.85rem', outline: 'none' }}
                  >
                    <option value="Lung Cancer">Lung Cancer (NSCLC)</option>
                    <option value="Breast Cancer">Breast Cancer</option>
                    <option value="Colorectal Cancer">Colorectal Cancer</option>
                    <option value="Prostate Cancer">Prostate Cancer</option>
                    <option value="Ovarian Cancer">Ovarian Cancer</option>
                    <option value="Melanoma">Melanoma</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Stage</label>
                  <select
                    value={newPatient.stage}
                    onChange={e => setNewPatient({ ...newPatient, stage: e.target.value })}
                    style={{ width: '100%', background: 'rgba(10,20,35,0.95)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.6rem 0.85rem', color: 'white', fontSize: '0.85rem', outline: 'none' }}
                  >
                    <option value="I">Stage I</option>
                    <option value="II">Stage II</option>
                    <option value="IIIA">Stage IIIA</option>
                    <option value="IIIB">Stage IIIB</option>
                    <option value="IV">Stage IV</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Eligibility Status</label>
                  <select
                    value={newPatient.status}
                    onChange={e => setNewPatient({ ...newPatient, status: e.target.value })}
                    style={{ width: '100%', background: 'rgba(10,20,35,0.95)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.6rem 0.85rem', color: 'white', fontSize: '0.85rem', outline: 'none' }}
                  >
                    <option value="Eligible">Eligible</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Not Eligible">Not Eligible</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Match Score (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newPatient.score}
                    onChange={e => setNewPatient({ ...newPatient, score: e.target.value })}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.6rem 0.85rem', color: 'white', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Assigned Doctor</label>
                  <select
                    value={newPatient.doctor}
                    onChange={e => setNewPatient({ ...newPatient, doctor: e.target.value })}
                    style={{ width: '100%', background: 'rgba(10,20,35,0.95)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.6rem 0.85rem', color: 'white', fontSize: '0.85rem', outline: 'none' }}
                  >
                    <option value="Dr. Arjun Kumar">Dr. Arjun Kumar</option>
                    <option value="Dr. Michael Chen">Dr. Michael Chen</option>
                    <option value="Dr. Sarah Jenkins">Dr. Sarah Jenkins</option>
                    <option value="Dr. Priya Patel">Dr. Priya Patel</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Assigned Trial</label>
                  <select
                    value={newPatient.assignedTrial}
                    onChange={e => setNewPatient({ ...newPatient, assignedTrial: e.target.value })}
                    style={{ width: '100%', background: 'rgba(10,20,35,0.95)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.6rem 0.85rem', color: 'white', fontSize: '0.85rem', outline: 'none' }}
                  >
                    <option value="LUNG-2024-02">LUNG-2024-02</option>
                    <option value="OVAR-2024-03">OVAR-2024-03</option>
                    <option value="IMMNOVA-2024-07">IMMNOVA-2024-07</option>
                    <option value="CARDIO-2024-01">CARDIO-2024-01</option>
                    <option value="-">None (Unassigned)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '0.6rem 1.2rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '0.6rem 1.4rem', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Plus size={16} /> Save Patient Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Export Report Modal */}
      <ExportReportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Patient Cohort Telemetry"
        pdfTitle="ClinTwin Patient Roster & Trial Matching Executive Report"
        columns={['Patient ID', 'Age', 'Gender', 'BMI', 'ECOG', 'eGFR', 'Platelets', 'Hemoglobin', 'ALT', 'AST']}
        data={filteredPatients.map(p => ({ id: p.id, age: p.age, gender: p.sex, bmi: p.bmi, ecog: p.ecog_score, egfr: p.egfr, platelets: p.platelets, hb: p.hemoglobin, alt: p.alt, ast: p.ast }))}
        fileNamePrefix="patient_cohort_report"
        onSuccess={showToast}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="toast-notification">
          {toast}
        </div>
      )}
    </div>
  );
};

export default Patients;
