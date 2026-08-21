import React from 'react';
import { useAI } from '../../context/AIContext';
import { Sparkles } from 'lucide-react';

const ExplainButton = ({ payload, label = "Explain AI Decision", style = {} }) => {
  const { triggerExplain } = useAI();

  const handleClick = (e) => {
    e.stopPropagation(); // Prevent row clicks if inside a table
    triggerExplain(payload);
  };

  return (
    <button 
      onClick={handleClick}
      className="btn"
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.4rem', 
        padding: '0.4rem 0.8rem',
        fontSize: '0.75rem',
        background: 'rgba(157, 78, 221, 0.15)',
        border: '1px solid rgba(157, 78, 221, 0.4)',
        color: 'var(--accent-purple)',
        borderRadius: '20px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        ...style
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(157, 78, 221, 0.25)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(157, 78, 221, 0.15)';
        e.currentTarget.style.transform = 'none';
      }}
      title="Ask AI to explain this decision"
    >
      <Sparkles size={14} />
      {label}
    </button>
  );
};

export default ExplainButton;
