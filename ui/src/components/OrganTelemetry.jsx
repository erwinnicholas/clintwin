import React, { useState, useEffect } from 'react';
import { ArrowLeft, AlertTriangle, Activity } from 'lucide-react';
import { StatCard, AnimatedNumber } from './common/UIComponents';
import { organMetrics } from './OrganTelemetry_mock_data';

const OrganTelemetry = ({ organName, onClose, patient }) => {
  const organData = organMetrics[organName] || organMetrics['Respiratory System'];
  const imageSrc = organData.imageSrc;
  
  // Override mock metrics with real patient metrics if available
  let metrics = organData.metrics;
  if (patient && patient.metrics) {
    if (organName === 'Cardiovascular System') {
      metrics = [
        { title: 'Hemoglobin', value: patient.metrics.hemoglobin || 12, unit: 'g/dL', color: '0, 230, 118', icon: Activity, status: 'Normal' },
        { title: 'Platelets', value: patient.metrics.platelets || 250000, unit: '/µL', color: '255, 145, 0', icon: Activity, status: 'Normal' }
      ];
    } else if (organName === 'Cerebral Cortex') {
      metrics = [
        { title: 'ALT (Liver Enzyme)', value: patient.metrics.alt || 40, unit: 'U/L', color: '255, 61, 0', icon: Activity, status: patient.metrics.alt > 150 ? 'Critical' : 'Normal' },
        { title: 'AST (Liver Enzyme)', value: patient.metrics.ast || 40, unit: 'U/L', color: '255, 214, 0', icon: Activity, status: patient.metrics.ast > 150 ? 'Critical' : 'Normal' }
      ];
    } else if (organName === 'Respiratory System') {
      metrics = [
        { title: 'eGFR (Kidney)', value: patient.metrics.egfr || 90, unit: 'mL/min', color: '0, 240, 255', icon: Activity, status: patient.metrics.egfr < 30 ? 'Critical' : 'Normal' },
        { title: 'ANC (Immune)', value: patient.metrics.anc || 1500, unit: '/µL', color: '157, 78, 221', icon: Activity, status: patient.metrics.anc < 500 ? 'Critical' : 'Normal' }
      ];
    }
  }

  // Live fluctuating values for the telemetry
  const [liveValues, setLiveValues] = useState(metrics.map(m => m.value));

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveValues(prev => prev.map((val, i) => {
        const variance = metrics[i].value > 1000 ? 50 : (metrics[i].value > 100 ? 5 : (metrics[i].value > 10 ? 1 : 0.2));
        const change = (Math.random() * variance * 2) - variance;
        return Math.max(0, val + change);
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fade-in" style={{
      width: '100%', 
      height: '100%', 
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      background: '#000',
      borderRadius: '12px',
      overflow: 'hidden'
    }}>
      
      {/* Top Bar */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        padding: '1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.9) 0%, transparent 100%)',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={onClose}
            className="btn btn-secondary" 
            style={{ padding: '0.5rem', background: 'rgba(0, 240, 255, 0.1)', border: '1px solid rgba(0, 240, 255, 0.3)' }}
          >
            <ArrowLeft size={16} color="var(--accent-blue)" />
          </button>
          <div>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '2px', margin: 0 }}>
              {organName}
            </h3>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
              <AlertTriangle size={12} /> Live Anomalies Detected
            </div>
          </div>
        </div>
      </div>

      {/* Main Image */}
      <img 
        src={imageSrc} 
        alt={organName}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          opacity: 0.85
        }}
      />

      {/* Sci-fi Vignette */}
      <div style={{ 
        position: 'absolute', 
        top: 0, left: 0, width: '100%', height: '100%', 
        pointerEvents: 'none', 
        background: 'radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.9) 100%)' 
      }}></div>

      {/* Floating Telemetry Panels */}
      <div style={{
        position: 'absolute',
        bottom: '1.5rem',
        left: '1.5rem',
        right: '1.5rem',
        display: 'flex',
        gap: '1rem',
        zIndex: 10
      }}>
        {metrics.map((metric, i) => {
          const Icon = metric.icon;
          const isCritical = metric.status === 'Critical';
          const val = liveValues[i];
          const displayVal = val > 10 ? Math.round(val) : val.toFixed(1);

          return (
            <div key={i} className="glass-panel" style={{ 
              flex: 1, 
              padding: '1rem',
              border: `1px solid rgba(${metric.color}, 0.3)`,
              background: isCritical ? `rgba(${metric.color}, 0.05)` : 'rgba(0,0,0,0.6)',
              animation: isCritical ? 'pulse-animation 2s infinite' : 'none'
            }}>
              <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{metric.title}</span>
                <Icon size={16} color={`rgb(${metric.color})`} />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                <span style={{ fontSize: '2rem', fontWeight: 'bold', color: `rgb(${metric.color})`, fontVariantNumeric: 'tabular-nums' }}>
                  <AnimatedNumber value={displayVal} />
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{metric.unit}</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: `rgb(${metric.color})`, marginTop: '0.25rem', fontWeight: 'bold' }}>
                STATUS: {metric.status.toUpperCase()}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default OrganTelemetry;
