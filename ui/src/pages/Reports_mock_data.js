export const initialDomainData = [
  { name: 'Protocol Adherence', value: 95, color: 'var(--accent-green)' },
  { name: 'Data Integrity', value: 93, color: 'var(--accent-blue)' },
  { name: 'Patient Safety', value: 91, color: 'var(--accent-purple)' },
  { name: 'Informed Consent', value: 89, color: 'var(--accent-yellow)' },
  { name: 'Regulatory Reporting', value: 88, color: 'var(--accent-orange)' },
  { name: 'Documentation', value: 86, color: 'var(--text-muted)' }
];

export const initialMapData = [
  { id: 'na', region: 'North America', score: 94, top: '35%', left: '20%', color: 'var(--accent-green)' },
  { id: 'eu', region: 'Europe', score: 90, top: '30%', left: '48%', color: 'var(--accent-green)' },
  { id: 'ap', region: 'Asia Pacific', score: 88, top: '45%', left: '72%', color: 'var(--accent-yellow)' },
  { id: 'sa', region: 'South America', score: 93, top: '65%', left: '25%', color: 'var(--accent-green)' },
  { id: 'af', region: 'Africa', score: 85, top: '55%', left: '52%', color: 'var(--accent-yellow)' }
];

export const initialSiteData = [
  { id: 'ny', region: 'New York Site', score: 96, top: '33%', left: '23%', color: 'var(--accent-blue)' },
  { id: 'sf', region: 'San Fran Site', score: 92, top: '36%', left: '17%', color: 'var(--accent-blue)' },
  { id: 'lon', region: 'London Site', score: 89, top: '28%', left: '46%', color: 'var(--accent-blue)' },
  { id: 'ber', region: 'Berlin Site', score: 91, top: '30%', left: '49%', color: 'var(--accent-blue)' },
  { id: 'tok', region: 'Tokyo Site', score: 95, top: '42%', left: '80%', color: 'var(--accent-blue)' },
  { id: 'syd', region: 'Sydney Site', score: 87, top: '75%', left: '85%', color: 'var(--accent-blue)' },
];

export const trialCompliance = [
  { id: 'IMMNOVA-2024-07', name: 'ImmunoCheck in NSCLC', score: 95, issues: 2, audit: 'May 14, 2026', status: 'Compliant' },
  { id: 'CARDIO-2024-01', name: 'NovaHeart for Heart Failure', score: 91, issues: 3, audit: 'May 13, 2026', status: 'Compliant' },
  { id: 'NEURO-2024-03', name: "NeuroZen in Alzheimer's", score: 88, issues: 5, audit: 'May 12, 2026', status: 'At Risk' },
  { id: 'ONCO-2024-04', name: 'Pancura in Pancreatic Cancer', score: 93, issues: 1, audit: 'May 11, 2026', status: 'Compliant' },
  { id: 'GI-2024-02', name: "GutRelief in Crohn's Disease", score: 85, issues: 7, audit: 'May 10, 2026', status: 'At Risk' }
];

export const heatmapMatrixData = {
  'Region View': [
    { row: 'North America', cols: [ { col: 'Protocol', val: 96 }, { col: 'Integrity', val: 95 }, { col: 'Safety', val: 98 }, { col: 'Consent', val: 94 }, { col: 'Regulatory', val: 91 } ] },
    { row: 'Europe', cols: [ { col: 'Protocol', val: 92 }, { col: 'Integrity', val: 91 }, { col: 'Safety', val: 96 }, { col: 'Consent', val: 89 }, { col: 'Regulatory', val: 88 } ] },
    { row: 'Asia Pacific', cols: [ { col: 'Protocol', val: 88 }, { col: 'Integrity', val: 86 }, { col: 'Safety', val: 91 }, { col: 'Consent', val: 85 }, { col: 'Regulatory', val: 82 } ] },
    { row: 'South America', cols: [ { col: 'Protocol', val: 93 }, { col: 'Integrity', val: 92 }, { col: 'Safety', val: 94 }, { col: 'Consent', val: 90 }, { col: 'Regulatory', val: 87 } ] },
    { row: 'Africa', cols: [ { col: 'Protocol', val: 85 }, { col: 'Integrity', val: 84 }, { col: 'Safety', val: 89 }, { col: 'Consent', val: 81 }, { col: 'Regulatory', val: 78 } ] },
  ],
  'Site View': [
    { row: 'New York', cols: [ { col: 'Protocol', val: 97 }, { col: 'Integrity', val: 96 }, { col: 'Safety', val: 99 }, { col: 'Consent', val: 95 }, { col: 'Regulatory', val: 92 } ] },
    { row: 'San Fran', cols: [ { col: 'Protocol', val: 95 }, { col: 'Integrity', val: 94 }, { col: 'Safety', val: 97 }, { col: 'Consent', val: 93 }, { col: 'Regulatory', val: 90 } ] },
    { row: 'London', cols: [ { col: 'Protocol', val: 91 }, { col: 'Integrity', val: 90 }, { col: 'Safety', val: 95 }, { col: 'Consent', val: 88 }, { col: 'Regulatory', val: 87 } ] },
    { row: 'Berlin', cols: [ { col: 'Protocol', val: 93 }, { col: 'Integrity', val: 92 }, { col: 'Safety', val: 97 }, { col: 'Consent', val: 90 }, { col: 'Regulatory', val: 89 } ] },
    { row: 'Tokyo', cols: [ { col: 'Protocol', val: 96 }, { col: 'Integrity', val: 95 }, { col: 'Safety', val: 98 }, { col: 'Consent', val: 94 }, { col: 'Regulatory', val: 91 } ] },
    { row: 'Sydney', cols: [ { col: 'Protocol', val: 87 }, { col: 'Integrity', val: 86 }, { col: 'Safety', val: 92 }, { col: 'Consent', val: 84 }, { col: 'Regulatory', val: 83 } ] },
  ]
};

export const heatmapColumns = ['Protocol', 'Integrity', 'Safety', 'Consent', 'Regulatory'];
