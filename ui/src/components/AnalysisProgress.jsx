import React, { useState, useEffect } from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';

import { analysisSteps as steps } from './AnalysisProgress_mock_data';

const AnalysisProgress = ({ onComplete }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    if (currentStepIndex < steps.length) {
      const timer = setTimeout(() => {
        setCurrentStepIndex(prev => prev + 1);
      }, 500); // 500ms per step
      return () => clearTimeout(timer);
    } else {
      // Auto complete after short delay
      setTimeout(onComplete, 1000);
    }
  }, [currentStepIndex, onComplete]);

  const progressPercent = Math.min(100, Math.round((currentStepIndex / (steps.length - 1)) * 100));

  return (
    <div className="glass-panel fade-in" style={{ padding: '3rem', width: '600px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--accent-blue)' }}>
        CLINICAL DATA ANALYSIS
      </h2>

      <div style={{ marginBottom: '2rem' }}>
        <div className="flex-between" style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
          <span>PROCESSING DATA...</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="progress-container">
          <div className="progress-bar" style={{ width: `${progressPercent}%` }}></div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '250px', overflowY: 'hidden' }}>
        {steps.map((step, index) => {
          const isActive = index === currentStepIndex;
          const isDone = index < currentStepIndex;
          
          if (!isActive && !isDone && index > currentStepIndex + 2) return null; // Only show relevant upcoming steps

          return (
            <div 
              key={index} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '1rem',
                color: isDone ? 'var(--accent-green)' : isActive ? 'var(--accent-blue)' : 'var(--text-muted)',
                opacity: (isDone || isActive) ? 1 : 0.5,
                transition: 'all 0.3s'
              }}
            >
              {isDone ? (
                <CheckCircle size={18} />
              ) : isActive ? (
                <Loader2 size={18} className="spin-animation" />
              ) : (
                <div style={{ width: '18px', height: '18px', border: '2px solid currentColor', borderRadius: '50%' }}></div>
              )}
              <span style={{ fontWeight: isActive ? 600 : 400 }}>{step}</span>
            </div>
          );
        })}
      </div>

      {currentStepIndex >= steps.length && (
        <div className="fade-in" style={{ marginTop: '2rem', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-green)', fontWeight: 'bold', fontSize: '1.25rem', marginBottom: '1.5rem' }}>
            <CheckCircle size={24} /> Analysis Complete
          </div>
          <button className="btn btn-primary" onClick={onComplete} style={{ width: '100%' }}>
            View Analysis Dashboard
          </button>
        </div>
      )}
    </div>
  );
};

export default AnalysisProgress;
