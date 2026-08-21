import React from 'react';
import { Loader } from 'lucide-react';

const LoadingSpinner = ({ message = "Loading...", fullScreen = false }) => {
  const containerStyle = fullScreen ? {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000
  } : {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
    width: '100%'
  };

  return (
    <div style={containerStyle}>
      <Loader 
        size={fullScreen ? 48 : 32} 
        color="var(--accent-blue)" 
        style={{ animation: 'spin 1.5s linear infinite', marginBottom: '1rem' }} 
      />
      {message && (
        <div style={{
          color: 'var(--text-primary)',
          fontSize: fullScreen ? '1.1rem' : '0.9rem',
          fontWeight: 500,
          letterSpacing: '0.5px'
        }}>
          {message}
        </div>
      )}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoadingSpinner;
