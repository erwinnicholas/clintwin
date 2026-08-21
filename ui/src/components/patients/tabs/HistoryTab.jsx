import React from 'react';
import { Calendar } from 'lucide-react';

const HistoryTab = ({ patient }) => (
  <div className="glass-panel" style={{ padding: '2rem' }}>
    <h3 style={{ fontSize: '1.1rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={18} color="var(--accent-blue)" /> Clinical Timeline</h3>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {[
        { date: 'Oct 12, 2023', title: 'Oncology Consultation', desc: 'Patient discussed treatment plan and clinical trial enrollment for targeted therapy.', type: 'visit' },
        { date: 'Oct 10, 2023', title: 'CT Scan (Abdomen & Pelvis)', desc: `Identified progression in primary ${patient.cancerType ? patient.cancerType.split(' ')[0].toLowerCase() : 'pancreatic'} mass. No new distant metastases.`, type: 'scan' },
        { date: 'Oct 08, 2023', title: 'Laboratory Workup', desc: 'CMP and CBC results uploaded. Liver enzymes elevated.', type: 'lab' },
        { date: 'Sep 25, 2023', title: 'Biopsy Confirmation', desc: `Pathology confirmed Stage ${patient.stage || 'IV'} Adenocarcinoma of the ${patient.cancerType ? patient.cancerType.split(' ')[0].toLowerCase() : 'pancreas'}.`, type: 'diagnosis' }
      ].map((event, i) => (
        <div key={i} style={{ display: 'flex', gap: '1.5rem', position: 'relative', paddingBottom: '2rem' }}>
          {i !== 3 && <div style={{ position: 'absolute', left: '11px', top: '24px', bottom: 0, width: '2px', background: 'rgba(255,255,255,0.1)' }}></div>}
          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(0,102,255,0.2)', border: '2px solid var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, flexShrink: 0 }}>
             <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-blue)' }}></div>
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--accent-blue)', fontWeight: 'bold', marginBottom: '0.25rem' }}>{event.date}</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 500, marginBottom: '0.5rem' }}>{event.title}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{event.desc}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default HistoryTab;
