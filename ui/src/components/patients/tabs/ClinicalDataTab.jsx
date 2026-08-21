import React from 'react';
import { Beaker, Pill, Activity } from 'lucide-react';

const ClinicalDataTab = ({ patient }) => {
  const vitals = [
    { name: 'eGFR', result: patient.egfr, range: '> 60 mL/min', color: patient.egfr < 60 ? 'var(--accent-yellow)' : 'var(--accent-green)', status: patient.egfr < 60 ? 'Low' : 'Normal' },
    { name: 'Hemoglobin', result: patient.hemoglobin, range: '12.0 - 15.5 g/dL', color: patient.hemoglobin < 12 ? 'var(--accent-red)' : 'var(--accent-green)', status: patient.hemoglobin < 12 ? 'Low' : 'Normal' },
    { name: 'Platelets', result: patient.platelets, range: '150 - 450 x10^9/L', color: patient.platelets < 150 ? 'var(--accent-yellow)' : 'var(--accent-green)', status: patient.platelets < 150 ? 'Low' : 'Normal' },
    { name: 'ALT', result: patient.alt, range: '7 - 55 U/L', color: patient.alt > 55 ? 'var(--accent-yellow)' : 'var(--accent-green)', status: patient.alt > 55 ? 'High' : 'Normal' },
    { name: 'AST', result: patient.ast, range: '8 - 48 U/L', color: patient.ast > 48 ? 'var(--accent-yellow)' : 'var(--accent-green)', status: patient.ast > 48 ? 'High' : 'Normal' },
    { name: 'BMI', result: patient.bmi, range: '18.5 - 24.9', color: patient.bmi > 25 ? 'var(--accent-yellow)' : 'var(--accent-green)', status: patient.bmi > 25 ? 'Overweight' : 'Normal' },
    { name: 'Systolic BP', result: patient.systolic_bp, range: '< 120 mmHg', color: patient.systolic_bp > 130 ? 'var(--accent-red)' : 'var(--accent-green)', status: patient.systolic_bp > 130 ? 'High' : 'Normal' }
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Beaker size={18} color="var(--accent-blue)" /> Patient Vitals & Labs</h3>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.75rem 0' }}>Test Name</th>
                <th style={{ padding: '0.75rem 0' }}>Result</th>
                <th style={{ padding: '0.75rem 0' }}>Reference Range</th>
                <th style={{ padding: '0.75rem 0' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {vitals.map((lab, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                  <td style={{ padding: '0.75rem 0', fontWeight: 500 }}>{lab.name}</td>
                  <td style={{ padding: '0.75rem 0' }}>{lab.result}</td>
                  <td style={{ padding: '0.75rem 0', color: 'var(--text-secondary)' }}>{lab.range}</td>
                  <td style={{ padding: '0.75rem 0' }}>
                    <span style={{ color: lab.color, background: `${lab.color}15`, padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>{lab.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Pill size={18} color="var(--accent-purple)" /> Medications (No Data)</h3>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No medication data available in baseline schema.</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Activity size={18} color="var(--accent-yellow)" /> Allergies (No Data)</h3>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No allergy data available in baseline schema.</div>
        </div>
      </div>
    </div>
  );
};

export default ClinicalDataTab;
