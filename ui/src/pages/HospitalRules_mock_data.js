export const hospitalRegulatoryRulesMock = [
  { id: 'HR-001', name: 'Standard Oncology Consent Protocol', category: 'Oncology', rule: 'IRB-approved written informed consent & genetic biomarker disclosure mandatory prior to screening', source: 'Hospital IRB Policy v4.2', status: 'Active', severity: 'Critical', verified: true },
  { id: 'HR-002', name: 'Cardiovascular Risk Assessment Matrix', category: 'Cardiovascular', rule: 'Baseline ECG & NT-proBNP evaluation mandatory within 14 days of enrollment', source: 'Cardiology Governance Std', status: 'Active', severity: 'Mandatory', verified: true },
  { id: 'HR-003', name: 'Neurological Trial Safety Framework', category: 'Neurology', rule: 'Quarterly MRI Brain scan & CDR-SB Cognitive Assessment protocol adherence', source: 'Neuro Safety Manual 2025', status: 'Active', severity: 'Mandatory', verified: true },
  { id: 'HR-004', name: 'FDA 21 CFR Part 312 Compliance Rules', category: 'Regulatory', rule: 'Electronic signature verification & IND safety reporting within 24 hours of SAE', source: 'FDA CFR Title 21 Part 312', status: 'Active', severity: 'Critical', verified: true },
  { id: 'HR-005', name: 'GCP E6(R2) Good Clinical Practice Standards', category: 'General', rule: 'Source document verification & investigator site file audit trails maintained for 25 years', source: 'ICH GCP E6 Guide', status: 'Active', severity: 'Mandatory', verified: true },
  { id: 'HR-006', name: 'HIPAA & GDPR Patient Data Anonymization', category: 'Data Privacy', rule: 'De-identification of 18 PHI identifiers prior to digital twin population synthesis', source: 'HIPAA Safe Harbor Std', status: 'Active', severity: 'Critical', verified: true }
];

export const initialRulesMock = {
  title: 'Current Rules Matrix',
  data: hospitalRegulatoryRulesMock
};

export const processingStepsMock = {
  title: 'Processing Steps',
  data: [
    "INITIALIZING NLP PIPELINE...",
    "EXTRACTING TEXT VIA OCR...",
    "PARSING REGULATORY TOKENS...",
    "IDENTIFYING CONSTRAINTS...",
    "VALIDATING AGAINST SYSTEM ENGINE..."
  ]
};
