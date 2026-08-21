export const generatePatientsMock = (count = 50) => {
  const cancers = ['Lung Cancer', 'Breast Cancer', 'Colorectal Cancer', 'Ovarian Cancer', 'Prostate Cancer', 'Pancreatic Cancer'];
  const stages = ['I', 'II', 'IIA', 'IIB', 'III', 'IIIA', 'IV'];
  const statuses = ['Eligible', 'Under Review', 'Not Eligible'];
  const trials = ['ONCO-2024-01', 'LUNG-2024-02', 'CARDIO-2024-01', 'NEURO-2024-03', 'IMMUNO-2024-05', 'RARE-2024-02'];
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

export const patientsDataMock = generatePatientsMock(50);

export const patientVitalsMock = {
  title: 'Heart Rate (Last 6 Months)',
  data: [
    { name: 'Jan', val: 72 }, { name: 'Feb', val: 74 }, { name: 'Mar', val: 71 },
    { name: 'Apr', val: 75 }, { name: 'May', val: 72 }, { name: 'Jun', val: 73 }
  ]
};

export const labResultsMock = {
  title: 'Recent Lab Results',
  data: [
    { name: 'Hemoglobin (Hb)', result: '11.2 g/dL', range: '12.0 - 15.5 g/dL', status: 'Low', color: 'var(--accent-yellow)' },
    { name: 'White Blood Cell (WBC)', result: '8.4 K/uL', range: '4.5 - 11.0 K/uL', status: 'Normal', color: 'var(--accent-green)' },
    { name: 'Platelets', result: '145 K/uL', range: '150 - 450 K/uL', status: 'Low', color: 'var(--accent-yellow)' },
    { name: 'Creatinine', result: '1.1 mg/dL', range: '0.6 - 1.2 mg/dL', status: 'Normal', color: 'var(--accent-green)' },
    { name: 'ALT (SGPT)', result: '58 U/L', range: '7 - 56 U/L', status: 'High', color: 'var(--accent-red)' },
  ]
};

export const medicationsMock = {
  title: 'Current Medications',
  data: [
    { name: 'Capecitabine', dose: '1000 mg', freq: 'Twice daily' },
    { name: 'Ondansetron', dose: '8 mg', freq: 'As needed (Nausea)' },
    { name: 'Lisinopril', dose: '10 mg', freq: 'Once daily' },
  ]
};

export const allergiesMock = {
  title: 'Conditions & Allergies',
  data: [
    'Penicillin (Severe)', 'Latex (Mild)', 'Type 2 Diabetes', 'Hypertension'
  ]
};
