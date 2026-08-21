import React, { useState, useEffect } from 'react';
import { Activity, FileText } from 'lucide-react';
import { fetchPatientNotes } from '../../../services/api';

const DigitalTwinTab = ({ patient }) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPatientNotes(patient.id).then(data => {
      setNotes(data || []);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [patient.id]);

  return (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
       <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Activity size={18} color="var(--accent-blue)" /> Baseline Telemetry</h3>
       <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', minHeight: '300px' }}>
          <img src="/digital_twin.jpg" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '8px', opacity: 0.8 }} alt="Digital Twin" />
          <div style={{ position: 'absolute', top: '10%', left: '10%', background: 'rgba(0,0,0,0.7)', padding: '0.5rem', borderRadius: '4px', border: `1px solid ${patient.egfr < 60 ? 'var(--accent-yellow)' : 'var(--accent-green)'}` }}>
            <div style={{ fontSize: '0.75rem', color: patient.egfr < 60 ? 'var(--accent-yellow)' : 'var(--accent-green)' }}>Kidney (eGFR)</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{patient.egfr} mL/min</div>
          </div>
          <div style={{ position: 'absolute', top: '40%', right: '10%', background: 'rgba(0,0,0,0.7)', padding: '0.5rem', borderRadius: '4px', border: `1px solid ${patient.systolic_bp > 130 ? 'var(--accent-red)' : 'var(--accent-green)'}` }}>
            <div style={{ fontSize: '0.75rem', color: patient.systolic_bp > 130 ? 'var(--accent-red)' : 'var(--accent-green)' }}>Cardiovascular BP</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{patient.systolic_bp}/{patient.diastolic_bp}</div>
          </div>
          <div style={{ position: 'absolute', bottom: '15%', left: '15%', background: 'rgba(0,0,0,0.7)', padding: '0.5rem', borderRadius: '4px', border: `1px solid ${patient.alt > 55 || patient.ast > 48 ? 'var(--accent-yellow)' : 'var(--accent-green)'}` }}>
            <div style={{ fontSize: '0.75rem', color: patient.alt > 55 || patient.ast > 48 ? 'var(--accent-yellow)' : 'var(--accent-green)' }}>Hepatic (ALT/AST)</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{patient.alt} / {patient.ast}</div>
          </div>
       </div>
    </div>
    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
       <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={18} color="var(--accent-purple)" /> Extracted Clinical Notes</h3>
       <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
         {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading clinical text data...</div>
         ) : notes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No text data uploaded for this patient.</div>
         ) : (
            notes.map((note, i) => (
              <div key={i} style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', borderLeft: '3px solid var(--accent-blue)' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 'bold' }}>{note.note_type}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{note.note_date}</span>
                 </div>
                 <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                   {note.raw_text}
                 </div>
              </div>
            ))
         )}
       </div>
    </div>
  </div>
  );
};

export default DigitalTwinTab;
