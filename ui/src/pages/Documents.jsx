import React, { useState, useRef } from 'react';
import { FileText, ShieldCheck, Clock, AlertTriangle, Database, Search, Filter, Upload, Download, Eye, MoreVertical, Folder, X, Minimize2, Maximize2, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Sparkles, CheckCircle2, FileCheck } from 'lucide-react';
import { StatCard, StatusBadge, SectionHeader, TabBar } from '../components/common/UIComponents';
import { documentsData } from '../mockData';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

import { storageDataMock } from './Documents_mock_data';

import { useAuth } from '../context/AuthContext';

const Documents = () => {
  const { user } = useAuth();
  const [docsList, setDocsList] = useState(documentsData);
  const [activeTab, setActiveTab] = useState('All Documents');
  const [trialFilter, setTrialFilter] = useState('All Trials');
  const [typeFilter, setTypeFilter] = useState('All Document Types');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [toast, setToast] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null); // Active document for visualization viewer modal
  const [isMinimized, setIsMinimized] = useState(false); // Screen View Min toggle state
  const [pageNumber, setPageNumber] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isMatchingCohort, setIsMatchingCohort] = useState(false);
  const [cohortMatchSuccess, setCohortMatchSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const activeUserName = user?.name || (user?.email ? user.email.split('@')[0] : 'Shwetha');

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 3500);
  };

  const handleUpload = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const ext = file.name.split('.').pop().toLowerCase();
      const isCsvOrExcel = ext === 'csv' || ext === 'xlsx' || ext === 'xls';
      const formattedSize = file.size > 1024 * 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
        : `${Math.max(1.2, (file.size / 1024)).toFixed(1)} KB`;

      const newDoc = {
        id: `DOC-${Math.floor(Math.random() * 9000) + 1000}`,
        name: file.name,
        trial: 'IMMNOVA-2024-07',
        type: isCsvOrExcel ? 'Source Dataset Export' : (ext === 'pdf' ? 'Source Protocol' : 'Informed Consent'),
        status: 'Verified',
        by: activeUserName,
        date: 'Just now',
        size: formattedSize,
        fileContentSnippet: isCsvOrExcel 
          ? `[PARSED DATASET EXPORT: ${file.name}]\nFormat: ${ext.toUpperCase()} Data Table • Records: 12 Patient Candidates\nColumns Ingested: Patient_ID, Diagnosis, Age, Biomarker_PDL1, Stage\nData Pipeline Status: Ingested & Structuralized into Ingestion Engine`
          : `[PARSED CLINICAL SOURCE FILE: ${file.name}]\nDocument Type: Clinical Trial Source Record\nVerification Hash: sha256-${Math.random().toString(36).substring(2, 12)}\nOCR AI Extraction Confidence: 98%`,
        extractedData: {
          confidenceScore: 98,
          patientId: isCsvOrExcel ? 'CSV Cohort Records (12 Rows)' : 'P-8505',
          diagnosis: isCsvOrExcel ? 'Multi-Subject Clinical Cohort Dataset' : 'Non-Small Cell Lung Cancer (NSCLC)',
          stage: isCsvOrExcel ? 'Structured Table Data' : 'Stage III-B',
          biomarkers: isCsvOrExcel 
            ? ['Parsed 8 Field Columns', '12 Eligible Candidates Detected', 'HIPAA De-Identified Protocol Data']
            : ['PD-L1 Expression >= 50%', 'EGFR Wild Type', 'ALK Negative'],
          extractedEntities: [
            { key: 'Uploaded Document Name', val: file.name },
            { key: 'File Size & Type', val: `${formattedSize} (${ext.toUpperCase()} Format)` },
            { key: 'Uploaded By User', val: `${activeUserName} (Research Physician)` },
            { key: 'Ingestion Status', val: 'Verified & AI Ingested' },
            { key: 'Classification', val: isCsvOrExcel ? 'Clinical Dataset Export File' : 'Clinical Trial Source Document' },
            { key: 'Cryptographic Hash', val: `sha256-${Math.random().toString(36).substring(2, 12)}` }
          ]
        }
      };

      setDocsList(prev => [newDoc, ...prev]);
      setCohortMatchSuccess(false);
      showToast(`Uploaded ${file.name} successfully! Opening data inspection window...`);
      setSelectedDoc(newDoc); // Immediately show visualization of uploaded data
    }
  };

  const handleMatchCohort = () => {
    if (!selectedDoc) return;
    setIsMatchingCohort(true);
    showToast(`Initializing AI Engine: Matching cohort parameters from ${selectedDoc.name} against Protocol ${selectedDoc.trial}...`);
    setTimeout(() => {
      setIsMatchingCohort(false);
      setCohortMatchSuccess(true);
      showToast(`✓ Cohort Match Successful! 12 Patients Matched to Protocol ${selectedDoc.trial} (Confidence: 98%).`);
    }, 1800);
  };

  const openVisualization = (doc) => {
    const docWithData = {
      ...doc,
      extractedData: doc.extractedData || {
        confidenceScore: 95,
        patientId: 'P-7504',
        diagnosis: 'Breast Cancer (Triple Negative)',
        stage: 'Stage II',
        biomarkers: ['BRCA1 Positive', 'ER/PR Negative', 'HER2 1+'],
        extractedEntities: [
          { key: 'Uploaded Document Name', val: doc.name },
          { key: 'Uploaded By User', val: doc.by || activeUserName },
          { key: 'Document Classification', val: doc.type || 'Clinical Source File' },
          { key: 'Compliance Protocol', val: 'FDA 21 CFR Part 11 Compliant' },
          { key: 'Verification Status', val: 'Verified & AI Ingested' },
          { key: 'Cryptographic Hash', val: `sha256-${Math.random().toString(36).substring(2, 12)}` }
        ]
      }
    };
    setCohortMatchSuccess(false);
    setSelectedDoc(docWithData);
    setIsMinimized(false);
  };

  const filteredDocs = docsList.filter(d => {
    // Top Tabs
    let tabMatch = true;
    if (activeTab === 'Source Documents') tabMatch = ['Source Document', 'Informed Consent', 'Lab Report', 'ECG'].includes(d.type);
    else if (activeTab === 'Study Documents') tabMatch = ['Protocol', 'Brochure', 'Investigator Brochure'].includes(d.type);
    else if (activeTab === 'Reports') tabMatch = ['Report'].includes(d.type);
    else if (activeTab === 'Regulatory Documents') tabMatch = ['Regulatory'].includes(d.type);
    else if (activeTab === 'Other') tabMatch = !['Source Document', 'Informed Consent', 'Lab Report', 'ECG', 'Protocol', 'Brochure', 'Investigator Brochure', 'Report', 'Regulatory'].includes(d.type);

    // Dropdowns
    let trialMatch = trialFilter === 'All Trials' || d.trial === trialFilter;
    let typeMatch = typeFilter === 'All Document Types' || d.type === typeFilter;
    let statusMatch = statusFilter === 'All Status' || d.status === statusFilter;

    return tabMatch && trialMatch && typeMatch && statusMatch;
  });

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <SectionHeader 
        title="Documents Studio" 
        subtitle="Centralized repository for clinical trial documents, automated AI ingestion, and data visualization" 
        action={
          <>
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleUpload} />
            <button onClick={() => fileInputRef.current?.click()} className="btn btn-primary" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Upload size={16}/> Upload Document</button>
          </>
        }
      />

      {/* Layer 3: KPI Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard title="Total Documents" value="2,458" subtext="Across all trials" icon={FileText} color="0, 230, 118" />
        <StatCard title="Verified Documents" value="1,892" subtext="77.1% of total" icon={ShieldCheck} color="0, 102, 255" />
        <StatCard title="Pending Review" value="324" subtext="13.2% of total" trend="-12%" icon={Clock} color="255, 214, 0" />
        <StatCard title="Expiring Soon" value="86" subtext="Next 30 days" trend="+5" icon={AlertTriangle} color="255, 61, 0" />
        <StatCard title="Total Size" value="128.4 GB" subtext="Storage used" icon={Database} color="0, 230, 118" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '1.5rem' }}>
        
        {/* Left Side: Table Area */}
        <div className="glass-panel" style={{ padding: '0', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <TabBar tabs={['All Documents', 'Source Documents', 'Study Documents', 'Regulatory Documents', 'Reports', 'Other']} activeTab={activeTab} setActiveTab={setActiveTab} />
          </div>

          <div className="flex-between" style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ position: 'relative', width: '250px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="text" placeholder="Search documents..." style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '0.5rem 1rem 0.5rem 2.5rem', color: 'white', fontSize: '0.85rem', width: '100%', borderRadius: '4px', outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <select value={trialFilter} onChange={(e) => setTrialFilter(e.target.value)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'white', padding: '0.5rem 1rem', borderRadius: '4px', fontSize: '0.8rem', outline: 'none' }}>
                 <option>All Trials</option>
                 <option>IMMNOVA-2024-07</option>
                 <option>CARDIO-2024-03</option>
                 <option>LUNG-2024-02</option>
              </select>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'white', padding: '0.5rem 1rem', borderRadius: '4px', fontSize: '0.8rem', outline: 'none' }}>
                 <option>All Document Types</option>
                 <option>Protocol</option>
                 <option>Informed Consent</option>
                 <option>Brochure</option>
                 <option>Source Document</option>
                 <option>Report</option>
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'white', padding: '0.5rem 1rem', borderRadius: '4px', fontSize: '0.8rem', outline: 'none' }}>
                 <option>All Status</option>
                 <option>Verified</option>
                 <option>Pending Review</option>
                 <option>Rejected</option>
              </select>
              <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Filter size={14} /> Filters</button>
            </div>
          </div>

          {/* Quick Folders */}
          <div style={{ display: 'flex', gap: '1rem', padding: '1.5rem', overflowX: 'auto', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            {[
              { name: 'Informed Consent Forms', count: 342, date: 'Updated today' },
              { name: 'Source Documents', count: 1024, date: 'Updated 2 days ago' },
              { name: 'Investigator Brochures', count: 128, date: 'Updated 5 days ago' },
              { name: 'Protocol Documents', count: 68, date: 'Updated 1 week ago' },
              { name: 'Regulatory Submissions', count: 156, date: 'Updated 1 week ago' }
            ].map((f, i) => (
              <div key={i} onClick={() => openVisualization({ name: f.name, type: 'Folder Collection', trial: 'ALL', status: 'Verified', by: 'System Ingestion', date: f.date, size: `${f.count} files` })} style={{ minWidth: '180px', padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.border = '1px solid var(--accent-blue)'} onMouseLeave={e => e.currentTarget.style.border = '1px solid rgba(255,255,255,0.05)'}>
                 <Folder size={32} color="var(--accent-green)" style={{ fill: 'rgba(0,230,118,0.2)', marginBottom: '0.5rem' }} />
                 <div style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>{f.name}</div>
                 <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>📄 {f.count}</div>
                 <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{f.date}</div>
              </div>
            ))}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '1rem' }}>Document Name</th>
                  <th style={{ padding: '1rem' }}>Trial ID</th>
                  <th style={{ padding: '1rem' }}>Type</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                  <th style={{ padding: '1rem' }}>Uploaded By</th>
                  <th style={{ padding: '1rem' }}>Uploaded On</th>
                  <th style={{ padding: '1rem' }}>Size</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((d, i) => (
                  <tr key={i} onClick={() => openVisualization(d)} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', cursor: 'pointer' }} className="table-row-hover">
                    <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500, color: 'var(--accent-blue)' }}>
                      <FileText size={16} color="var(--accent-blue)" />
                      {d.name}
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{d.trial}</td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{d.type}</td>
                    <td style={{ padding: '1rem' }}><StatusBadge status={d.status} /></td>
                    <td style={{ padding: '1rem' }}>{d.by}</td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{d.date}</td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{d.size}</td>
                    <td style={{ padding: '1rem', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <Eye size={16} color="var(--accent-blue)" cursor="pointer" onClick={() => openVisualization(d)} title="View Data Visualization" />
                        <Download size={16} color="var(--text-secondary)" cursor="pointer" onClick={() => showToast(`Downloading ${d.name}...`)} />
                        <MoreVertical size={16} color="var(--text-muted)" cursor="pointer" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Analytics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>{storageDataMock.title}</h3>
            <div style={{ height: '180px', position: 'relative', marginBottom: '1.5rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={storageDataMock.data} innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                    {storageDataMock.data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <RechartsTooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                 <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>128.4<br/>GB</div>
                 <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Used</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8rem' }}>
              {storageDataMock.data.map((d, i) => (
                <div key={i} className="flex-between">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.color }}></div>
                    {d.name}
                  </div>
                  <div style={{ color: 'var(--text-secondary)' }}>{d.value} GB</div>
                </div>
              ))}
            </div>
            
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
               <div className="flex-between" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  <span>64% of 200 GB used</span>
               </div>
               <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
                 <div style={{ width: `64%`, height: '100%', background: 'var(--accent-green)', borderRadius: '2px' }}></div>
               </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem' }}>
             <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>Document Categories</h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem' }}>
                <div className="flex-between"><span>Source Documents</span><span>1,024</span></div>
                <div className="flex-between"><span>Study Documents</span><span>842</span></div>
                <div className="flex-between"><span>Regulatory Documents</span><span>312</span></div>
                <div className="flex-between"><span>Reports</span><span>156</span></div>
                <div className="flex-between"><span>Other</span><span>124</span></div>
             </div>
             <div style={{ marginTop: '1.5rem' }}>
                <a href="#" style={{ color: 'var(--accent-green)', fontSize: '0.8rem', textDecoration: 'none' }}>View All Categories →</a>
             </div>
          </div>

        </div>
      </div>

      {/* DOCUMENT VISUALIZATION & DATA INSPECTION MODAL (WITH MINIMIZE AND CLOSE TAB CONTROLS) */}
      {selectedDoc && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 10, 20, 0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justify: 'center',
            zIndex: 10000,
            padding: isMinimized ? '3rem' : '1.5rem'
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: isMinimized ? '720px' : '1180px',
              maxWidth: '96%',
              maxHeight: isMinimized ? '520px' : '90vh',
              height: isMinimized ? '520px' : '90vh',
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
              border: '1px solid var(--accent-blue)',
              boxShadow: '0 0 40px rgba(0, 240, 255, 0.25)',
              borderRadius: '12px',
              overflow: 'hidden',
              transition: 'all 0.3s ease'
            }}
          >
            {/* Modal Header Bar with Screen View Min & Close Tab Enabled */}
            <div
              className="flex-between"
              style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(0, 240, 255, 0.05)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(0, 240, 255, 0.15)', border: '1px solid rgba(0, 240, 255, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileCheck size={20} color="var(--accent-blue)" />
                </div>
                <div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {selectedDoc.name}
                    <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '10px', background: 'rgba(0,230,118,0.15)', color: 'var(--accent-green)', border: '1px solid rgba(0,230,118,0.3)' }}>Verified & AI Ingested</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                    Trial: <strong style={{ color: 'var(--accent-blue)' }}>{selectedDoc.trial}</strong> • Type: {selectedDoc.type} • Uploaded {selectedDoc.date} by {selectedDoc.by}
                  </div>
                </div>
              </div>

              {/* Action Buttons: Screen View Min Toggle & Close Tab */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  title={isMinimized ? 'Expand Full Screen View' : 'Screen View Min (Windowed)'}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: 'var(--text-primary)',
                    borderRadius: '6px',
                    padding: '0.45rem 0.75rem',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.2s'
                  }}
                >
                  {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                  <span>{isMinimized ? 'Screen Max' : 'Screen View Min'}</span>
                </button>

                <button
                  onClick={() => setSelectedDoc(null)}
                  title="Close Tab"
                  style={{
                    background: 'rgba(255, 61, 0, 0.15)',
                    border: '1px solid rgba(255, 61, 0, 0.4)',
                    color: 'var(--accent-red)',
                    borderRadius: '6px',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Split View Body: Left Document Screen Preview + Right Data Visualization */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: isMinimized ? '1fr' : '1.2fr 1fr', overflow: 'hidden' }}>
              
              {/* Left Screen Preview View */}
              <div style={{ borderRight: isMinimized ? 'none' : '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.4)' }}>
                {/* Preview Toolbar */}
                <div className="flex-between" style={{ padding: '0.6rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button onClick={() => setPageNumber(Math.max(1, pageNumber - 1))} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><ChevronLeft size={16} /></button>
                    <span>Page {pageNumber} of 4</span>
                    <button onClick={() => setPageNumber(Math.min(4, pageNumber + 1))} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><ChevronRight size={16} /></button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button onClick={() => setZoomLevel(Math.max(75, zoomLevel - 15))} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><ZoomOut size={15} /></button>
                    <span>{zoomLevel}%</span>
                    <button onClick={() => setZoomLevel(Math.min(150, zoomLevel + 15))} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><ZoomIn size={15} /></button>
                  </div>
                </div>

                {/* Document Render Canvas */}
                <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
                  <div
                    style={{
                      width: '100%',
                      maxWidth: `${zoomLevel * 5.5}px`,
                      background: '#0c1524',
                      border: '1px solid rgba(0, 240, 255, 0.3)',
                      borderRadius: '8px',
                      padding: '2rem',
                      color: 'var(--text-primary)',
                      fontFamily: 'monospace',
                      fontSize: '0.8rem',
                      boxShadow: '0 0 20px rgba(0,0,0,0.5)',
                      lineHeight: '1.6'
                    }}
                  >
                    <div style={{ textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                      <h4 style={{ color: 'var(--accent-blue)', fontSize: '1rem', fontFamily: 'inherit' }}>CLINICAL TRIAL SOURCE EVIDENCE DEEP PARSER</h4>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>CONFIDENTIAL SOURCE RECORD • PROTOCOL ID: {selectedDoc.trial}</div>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>[DOCUMENT METADATA]</span><br />
                      File Name: <span style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>{selectedDoc.name}</span><br />
                      Uploaded By: <span style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>{selectedDoc.by}</span> ({selectedDoc.date})<br />
                      File Size: {selectedDoc.size} • Format: {selectedDoc.name.split('.').pop().toUpperCase()}
                    </div>

                    <div style={{ marginBottom: '1rem', background: 'rgba(0, 240, 255, 0.08)', padding: '0.85rem', borderRadius: '6px', borderLeft: '3px solid var(--accent-blue)', whiteSpace: 'pre-wrap' }}>
                      <span style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>[PARSED CONTENT PREVIEW]</span><br />
                      {selectedDoc.fileContentSnippet || `Subject Identifier: P-8505\nPrimary Diagnosis: Non-Small Cell Lung Cancer (NSCLC)\nBiomarkers Extracted: PD-L1 >= 50%, EGFR Wild Type, ALK Negative\nECOG Performance Status: 0 (Fully Active)`}
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      [REGULATORY STATUS] Verification Hash: {selectedDoc.extractedData?.extractedEntities?.[5]?.val || 'sha256-a9f87c2b3140e9d'}<br />
                      Audit Trail: Timestamped by {selectedDoc.by} on {selectedDoc.date}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Data Visualization & Ingestion Analytics Panel (Hidden in min mode for high focus) */}
              {!isMinimized && (
                <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'rgba(10, 20, 35, 0.5)' }}>
                  
                  {/* Cohort Match Success Alert Banner */}
                  {cohortMatchSuccess && (
                    <div style={{ background: 'rgba(0, 230, 118, 0.12)', border: '1px solid rgba(0, 230, 118, 0.4)', borderRadius: '8px', padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--accent-green)', fontSize: '0.82rem' }}>
                      <CheckCircle2 size={20} color="var(--accent-green)" />
                      <div>
                        <div style={{ fontWeight: 700 }}>Cohort Match Successful!</div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>12 Eligible Patients matched to Protocol {selectedDoc.trial} (Confidence: 98%). Ingestion rules synchronized.</div>
                      </div>
                    </div>
                  )}

                  {/* AI Confidence Gauge */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '1.25rem' }}>
                    <div className="flex-between" style={{ marginBottom: '0.85rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Sparkles size={15} color="var(--accent-purple)" /> AI Extraction Accuracy
                      </span>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-green)' }}>
                        {selectedDoc.extractedData?.confidenceScore || 96}%
                      </span>
                    </div>

                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${selectedDoc.extractedData?.confidenceScore || 96}%`, height: '100%', background: 'linear-gradient(90deg, #9d4ede, #00e676)', borderRadius: '4px' }} />
                    </div>
                  </div>

                  {/* Extracted Key-Value Entities Visualization */}
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.85rem', color: 'white' }}>Extracted Metadata & Criteria Signals</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      {(selectedDoc.extractedData?.extractedEntities || []).map((ent, idx) => (
                        <div key={idx} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.78rem' }}>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>{ent.key}</div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.15rem' }}>{ent.val}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '0.75rem' }}>
                    <button
                      onClick={handleMatchCohort}
                      disabled={isMatchingCohort}
                      className="btn btn-primary"
                      style={{
                        flex: 1,
                        padding: '0.65rem',
                        fontSize: '0.82rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        background: cohortMatchSuccess ? 'rgba(0, 230, 118, 0.2)' : undefined,
                        border: cohortMatchSuccess ? '1px solid var(--accent-green)' : undefined,
                        color: cohortMatchSuccess ? 'var(--accent-green)' : undefined
                      }}
                    >
                      {isMatchingCohort ? (
                        <>
                          <Clock size={15} style={{ animation: 'spin 1s linear infinite' }} /> Matching Cohort with AI Engine...
                        </>
                      ) : cohortMatchSuccess ? (
                        <>
                          <CheckCircle2 size={16} color="var(--accent-green)" /> Cohort Matched (12 Patients)
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={15} /> Match Cohort
                        </>
                      )}
                    </button>
                    <button onClick={() => showToast(`Downloading ${selectedDoc.name}...`)} className="btn btn-secondary" style={{ padding: '0.6rem 1rem', fontSize: '0.82rem' }}>
                      <Download size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="toast-notification">
          {toast}
        </div>
      )}
    </div>
  );
};

export default Documents;
