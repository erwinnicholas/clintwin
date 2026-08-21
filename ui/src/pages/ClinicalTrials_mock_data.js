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

export const therapeuticAreasMock = {
  title: 'Trials by Therapeutic Area',
  data: [
    { name: 'Oncology', value: 52, color: '#9d4edd' },
    { name: 'Cardiovascular', value: 28, color: '#00e676' },
    { name: 'Neurology', value: 24, color: '#00b4d8' },
    { name: 'Immunology', value: 18, color: '#ff9100' },
    { name: 'Others', value: 34, color: '#333333' }
  ]
};

export const recruitmentStatusMock = {
  title: 'Recruitment Status Overview',
  data: [
    { label: 'Recruiting', val: 28, pct: '17.9%', color: 'var(--accent-green)' },
    { label: 'Active, not recruiting', val: 31, pct: '19.9%', color: 'var(--accent-blue)' },
    { label: 'Completed', val: 64, pct: '41.0%', color: 'var(--accent-purple)' },
    { label: 'Terminated', val: 12, pct: '7.7%', color: 'var(--accent-red)' },
    { label: 'Suspended', val: 21, pct: '13.5%', color: 'var(--accent-yellow)' }
  ]
};

export const STEPS = ['Upload Trial Data', 'Review Criteria', 'Regulatory Rules', 'Complete'];

export const CSV_TEMPLATE = `Trial Name,Vaccine,Target Disease,Target Patients,Age Min,Age Max,Phase,Sponsor
Pembrolizumab Combo in Advanced NSCLC,Pembrolizumab + Lenvatinib,Non-Small Cell Lung Cancer,350,18,75,III,Global Oncology Research Network`;

export const DEFAULT_CONDITIONS = [
  { label: 'Confirmed Histological Diagnosis', checked: true },
  { label: 'PD-L1 Expression ≥ 50% or Specific Biomarker', checked: true },
  { label: 'ECOG Performance Status 0-1', checked: true },
  { label: 'eGFR > 60 mL/min & Normal Hepatic Function', checked: true },
  { label: 'BMI 18-35', checked: false },
];

export const DEFAULT_EXCLUSIONS = [
  { label: 'Severe Uncontrolled Cardiovascular Disease', checked: true },
  { label: 'Active Autoimmune Disease or Immunosuppressive Therapy', checked: true },
  { label: 'Prior Systemic Immunotherapy Exposure', checked: true },
  { label: 'Active CNS Metastases', checked: true },
  { label: 'Pregnancy or Lactation', checked: false },
];
