// Centralized mock data store for the entire application to ensure consistency

export const generatePatients = (count) => {
  const cancers = ['Lung Cancer', 'Breast Cancer', 'Colorectal Cancer', 'Ovarian Cancer', 'Prostate Cancer', 'Pancreatic Cancer'];
  const stages = ['I', 'II', 'IIA', 'IIB', 'III', 'IIIA', 'IV'];
  const statuses = ['Eligible', 'Under Review', 'Not Eligible'];
  const trials = ['LUNG-2024-02', 'BREAST-2024-01', 'OVAR-2024-03', 'PROST-2024-01', '-', 'LIVER-2024-01'];
  const doctors = ['Dr. Arjun Kumar', 'Dr. Sarah Jenkins', 'Dr. Michael Chen', 'Dr. Emily Carter'];
  
  return Array.from({ length: count }).map((_, i) => ({
    id: `P-045${678 + i}`,
    name: `Patient ${i + 1}`,
    age: Math.floor(Math.random() * 40) + 30,
    gender: Math.random() > 0.5 ? 'Male' : 'Female',
    cancerType: cancers[Math.floor(Math.random() * cancers.length)],
    stage: stages[Math.floor(Math.random() * stages.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    score: Math.floor(Math.random() * 80) + 15,
    assignedTrial: trials[Math.floor(Math.random() * trials.length)],
    lastUpdated: `Today, 0${Math.floor(Math.random() * 9)}:${Math.floor(Math.random() * 59)} AM`,
    doctor: doctors[Math.floor(Math.random() * doctors.length)],
    patientsTreated: Math.floor(Math.random() * 200) + 50,
    hr: Math.floor(Math.random() * 40) + 60,
    bp: `${Math.floor(Math.random() * 40) + 100}/${Math.floor(Math.random() * 20) + 60}`,
    temp: (36 + Math.random()).toFixed(1),
    spo2: Math.floor(Math.random() * 5) + 95
  }));
};

export const patientsData = generatePatients(50);

export const trialsData = [
  { id: 'ONCO-2024-01', name: 'Pembrolizumab & Lenvatinib in Advanced NSCLC', area: 'Oncology', phase: 'III', status: 'Recruiting', matched: 342, progress: 85, doctor: 'Dr. Arjun Kumar, MD', sponsor: 'Global Oncology Research Network', primaryEndpoint: 'Overall Survival (OS) at 24 Months & PFS' },
  { id: 'LUNG-2024-02', name: 'ImmunoCheck PD-L1 Inhibition Protocol', area: 'Oncology', phase: 'III', status: 'Active', matched: 284, progress: 68, doctor: 'Dr. Sarah Jenkins, PhD', sponsor: 'Thoracic Oncology Institute', primaryEndpoint: 'Progression-Free Survival (PFS)' },
  { id: 'CARDIO-2024-01', name: 'NovaHeart SGLT2 Inhibitor in Heart Failure (HFpEF)', area: 'Cardiovascular', phase: 'II', status: 'Active', matched: 276, progress: 55, doctor: 'Dr. Michael Chen, MD', sponsor: 'CardioVascular Research Consortium', primaryEndpoint: 'Reduction in CV Death & Heart Failure Hospitalization' },
  { id: 'NEURO-2024-03', name: 'Anti-Amyloid Monoclonal Antibody in Early Alzheimer\'s', area: 'Neurology', phase: 'II/III', status: 'Active', matched: 198, progress: 42, doctor: 'Dr. Elena Rostova, MD, PhD', sponsor: 'NeuroGen Research Institute', primaryEndpoint: 'CDR-SB Cognitive Scale Change at 78 Weeks' },
  { id: 'IMMUNO-2024-05', name: 'JAK1 Selective Inhibitor in Severe Atopic Dermatitis', area: 'Immunology', phase: 'II', status: 'Recruiting', matched: 164, progress: 72, doctor: 'Dr. Marcus Vance, MD', sponsor: 'Immunology Discovery Lab', primaryEndpoint: 'EASI-75 Response Rate at Week 16' },
  { id: 'RARE-2024-02', name: 'AAV9 Gene Replacement Therapy in SMA Type 1', area: 'Rare Diseases', phase: 'I/II', status: 'Recruiting', matched: 45, progress: 90, doctor: 'Dr. Sophia Martinez, MD', sponsor: 'Genomic Therapy Foundation', primaryEndpoint: 'Motor Function Measure (MFM-32) Score Change' },
  { id: 'GI-2024-01', name: 'GutRelief IL-23 Inhibitor in Moderate Crohn\'s', area: 'Gastroenterology', phase: 'II', status: 'Active', matched: 128, progress: 35, doctor: 'Dr. David Zhao, MD', sponsor: 'Gastrointestinal Health Network', primaryEndpoint: 'Endoscopic Remission Rate at Week 52' },
  { id: 'METABOLIC-2024-06', name: 'Dual GLP-1/GIP Agonist in MASH/NASH Fibrosis', area: 'Endocrinology', phase: 'III', status: 'Active', matched: 412, progress: 88, doctor: 'Dr. Hannah Abbott, MD', sponsor: 'Metabolic & Diabetes Clinical Group', primaryEndpoint: 'NASH Resolution without Worsening Fibrosis' },
  { id: 'HEMA-2024-04', name: 'Bispecific T-Cell Engager (BiTE) in Multiple Myeloma', area: 'Hematology', phase: 'I', status: 'Active', matched: 98, progress: 22, doctor: 'Dr. Robert Vance, MD', sponsor: 'Hematologic Cancer Alliance', primaryEndpoint: 'Maximum Tolerated Dose (MTD) & ORR' },
];

export const complianceEvents = [
  { trial: 'LUNG-2024-02', issue: 'Protocol deviation reported', severity: 'High', time: 'Yesterday', team: 'Clinical Ops (Triage)', status: 'Awaiting Action' },
  { trial: 'CARDIO-2024-01', issue: 'Overdue safety report', severity: 'Medium', time: '2 days ago', team: 'Clinical Ops (Triage)', status: 'Awaiting Action' },
  { trial: 'IMMNOVA-2024-07', issue: 'Informed consent missing for 2 participants', severity: 'Critical', time: '10:15 AM', team: 'Clinical Ops (Triage)', status: 'Awaiting Action' },
  { trial: 'System', issue: 'Hospital Compliance Rules Engine successfully synchronized. No manual action required.', severity: 'Info', time: 'Yesterday, 04:30 PM', team: 'Automated System', status: 'Resolved' }
];

export const documentsData = [
  { name: 'Protocol_V2.1.pdf', trial: 'IMMNOVA-2024-07', type: 'Protocol', status: 'Verified', by: 'Shwetha (Research Physician)', date: 'May 12, 2026', size: '2.4 MB' },
  { name: 'Informed_Consent_Form.pdf', trial: 'IMMNOVA-2024-07', type: 'Informed Consent', status: 'Verified', by: 'Dr. Meera S.', date: 'May 11, 2026', size: '1.8 MB' },
  { name: 'Investigator_Brochure.docx', trial: 'IMMNOVA-2024-07', type: 'Brochure', status: 'Pending Review', by: 'Shwetha (Research Physician)', date: 'May 10, 2026', size: '3.2 MB' },
  { name: 'Lab_Results_Template.pdf', trial: 'IMMNOVA-2024-07', type: 'Source Document', status: 'Verified', by: 'Dr. Priya N.', date: 'May 09, 2026', size: '1.2 MB' },
  { name: 'Patient_Screening_Log.xlsx', trial: 'CARDIO-2024-03', type: 'Report', status: 'Verified', by: 'Dr. Meera S.', date: 'May 08, 2026', size: '856 KB' },
];

export const systemLogs = [
  { action: 'Criteria updated for IMMNOVA-2024-07', user: 'Shwetha (Research Physician)', time: '09:10 AM' },
  { action: 'New inclusion criterion added', user: 'Dr. Meera S.', time: '08:45 AM' },
  { action: 'Population synced successfully', user: 'System', time: '08:30 AM' },
  { action: 'Data ingestion complete (124 records)', user: 'System', time: '08:15 AM' }
];

let listeners = [];
export const subscribe = (listener) => {
  listeners.push(listener);
  return () => { listeners = listeners.filter(l => l !== listener); };
};

export const triggerUpdate = () => {
  listeners.forEach(l => l());
};
