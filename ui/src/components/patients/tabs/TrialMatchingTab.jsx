import React, { useState } from 'react';
import { CheckCircle } from 'lucide-react';

const TrialMatchingTab = ({ patient }) => {
  const [enrolledTrials, setEnrolledTrials] = useState([]);

  const handleAction = (trial) => {
    if (trial.score > 90) {
      if (!enrolledTrials.includes(trial.id)) {
        setEnrolledTrials([...enrolledTrials, trial.id]);
        alert(`Successfully enrolled patient ${patient.name} in trial ${trial.id}!`);
      }
    } else {
      alert(`Missing Criteria for ${trial.id}:\n- ${trial.missing.join('\n- ')}\n\nPlease upload the required documents or run a new scan to meet the eligibility requirements.`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
      <h3 style={{ color: 'var(--text-secondary)' }}>No Active Trial Matches Found</h3>
      <p style={{ color: 'var(--text-muted)' }}>Trial matching is processed via the Trial Pipeline. Once a trial simulation is run, matched trials will appear here.</p>
    </div>
  );
};

export default TrialMatchingTab;
