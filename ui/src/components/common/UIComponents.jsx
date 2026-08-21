import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { statusGroups } from './UIComponents_mock_data';

export const AnimatedNumber = ({ value }) => {
  const safeValue = value !== undefined && value !== null ? value : 0;
  const [strValue, setStrValue] = useState(safeValue.toString());

  useEffect(() => {
    let display = (value !== undefined && value !== null ? value : 0).toString();
    setStrValue(display);
  }, [value]);

  return (
    <span style={{ display: 'inline-flex', overflow: 'hidden', height: '1em', lineHeight: '1em', verticalAlign: 'text-bottom' }}>
      {strValue.split('').map((char, index) => {
        // If it's not a digit (like a comma, percent, or plus sign)
        if (isNaN(char) || char.trim() === '') {
          return (
            <span key={`${index}-${char}`} style={{ height: '1em', display: 'inline-flex', alignItems: 'center' }}>
              {char}
            </span>
          );
        }
        // If it is a digit, create the vertical strip
        return (
          <span 
            key={`${index}-digit`} 
            style={{ 
              display: 'inline-flex', 
              flexDirection: 'column', 
              transition: 'transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)', 
              transform: `translateY(-${parseInt(char)}em)` 
            }}
          >
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <span key={num} style={{ height: '1em', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                {num}
              </span>
            ))}
          </span>
        );
      })}
    </span>
  );
};

export const StatCard = ({ title, value, subtext, icon: Icon, color, trend }) => {
  const [currentValue, setCurrentValue] = useState(value);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  return (
    <div className="glass-panel" style={{ padding: '1.25rem', flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column' }}>
      <div className="flex-between" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.5rem', background: `rgba(${color}, 0.1)`, borderRadius: '8px' }}>
            <Icon size={20} style={{ color: `rgb(${color})` }} />
          </div>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>{title}</span>
        </div>
      </div>
      <div style={{ fontSize: '2.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
        <AnimatedNumber value={currentValue} />
      </div>
      <div className="flex-between" style={{ fontSize: '0.8rem' }}>
        <span style={{ color: 'var(--text-muted)' }}>{subtext}</span>
        {trend && (
          <span style={{ color: trend.startsWith('+') ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
};

export const StatusBadge = ({ status }) => {
  let color = 'var(--text-muted)';
  let bg = 'rgba(255,255,255,0.05)';
  
  if (statusGroups.success.includes(status)) {
    color = 'var(--accent-green)';
    bg = 'rgba(0, 230, 118, 0.1)';
  } else if (statusGroups.warning.includes(status)) {
    color = 'var(--accent-yellow)';
    bg = 'rgba(255, 214, 0, 0.1)';
  } else if (statusGroups.danger.includes(status)) {
    color = 'var(--accent-red)';
    bg = 'rgba(255, 61, 0, 0.1)';
  } else if (statusGroups.info.includes(status)) {
    color = 'var(--accent-blue)';
    bg = 'rgba(0, 240, 255, 0.1)';
  }

  return (
    <span style={{ 
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '0.25rem 0.6rem', borderRadius: '12px', 
      fontSize: '0.75rem', fontWeight: 500, color, background: bg,
      border: `1px solid ${color.replace('var(', '').replace(')', '')}`
    }}>
      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color }}></div>
      {status}
    </span>
  );
};

export const TabBar = ({ tabs, activeTab, setActiveTab }) => (
  <div style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
    {tabs.map(tab => (
      <div 
        key={tab}
        onClick={() => setActiveTab(tab)}
        style={{
          padding: '0.75rem 0',
          cursor: 'pointer',
          color: activeTab === tab ? 'var(--accent-blue)' : 'var(--text-secondary)',
          borderBottom: activeTab === tab ? '2px solid var(--accent-blue)' : '2px solid transparent',
          fontWeight: activeTab === tab ? 600 : 400,
          transition: 'all 0.2s'
        }}
      >
        {tab}
      </div>
    ))}
  </div>
);

export const SectionHeader = ({ title, subtitle, action }) => (
  <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
    <div>
      <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{title}</h3>
      {subtitle && <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{subtitle}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);
