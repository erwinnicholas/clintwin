import React from 'react';

const EmptyState = ({ icon: Icon, title, description, action }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '4rem 2rem',
      textAlign: 'center',
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px dashed rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      margin: '2rem 0'
    }}>
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        background: 'rgba(0, 240, 255, 0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1.5rem',
        border: '1px solid rgba(0, 240, 255, 0.1)'
      }}>
        {Icon && <Icon size={32} color="var(--accent-blue)" />}
      </div>
      <h3 style={{
        fontSize: '1.1rem',
        color: 'var(--text-primary)',
        fontWeight: 600,
        marginBottom: '0.5rem'
      }}>
        {title}
      </h3>
      <p style={{
        fontSize: '0.85rem',
        color: 'var(--text-secondary)',
        maxWidth: '400px',
        marginBottom: action ? '1.5rem' : '0',
        lineHeight: '1.5'
      }}>
        {description}
      </p>
      {action && (
        <div>
          {action}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
