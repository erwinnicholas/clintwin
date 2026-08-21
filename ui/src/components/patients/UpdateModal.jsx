import React, { useState } from 'react';

const UpdateModal = ({ patient, onClose, onSave }) => {
  const [status, setStatus] = useState(patient.status);
  const [stage, setStage] = useState(patient.stage);
  
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-panel" style={{ padding: '2rem', width: '400px', background: 'var(--bg-primary)' }}>
        <h3 style={{ marginBottom: '1.5rem' }}>Update Patient</h3>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)} style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px' }}>
            <option>Eligible</option>
            <option>Under Review</option>
            <option>Not Eligible</option>
          </select>
        </div>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Stage</label>
          <select value={stage} onChange={e => setStage(e.target.value)} style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px' }}>
            <option>I</option>
            <option>II</option>
            <option>IIA</option>
            <option>IIB</option>
            <option>III</option>
            <option>IIIA</option>
            <option>IV</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave({ status, stage })}>Save Changes</button>
        </div>
      </div>
    </div>
  );
};

export default UpdateModal;
