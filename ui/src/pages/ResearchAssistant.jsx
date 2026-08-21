import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Search, Users, Activity, FileText, Loader2, Zap, Settings2, SlidersHorizontal, UserPlus, Database, Play, Maximize, Minimize, X } from 'lucide-react';
import PopulationTwin from '../components/PopulationTwin';
import { useGlobalData } from '../context/GlobalDataContext';
import { generateAssistantResponse } from '../services/llmService';
import { initialAssistantChatHistory } from './ResearchAssistant_mock_data';

const ResearchAssistant = () => {
  const [chatInput, setChatInput] = useState('');
  const globalData = useGlobalData();
  const { metrics = {}, activePatient = null, setActivePatient = () => {} } = globalData || {};
  const [isTyping, setIsTyping] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [targetSize, setTargetSize] = useState(500);
  const [ageMax, setAgeMax] = useState(65);
  const [baseDemographics, setBaseDemographics] = useState('Global Mix (Standard)');
  const [conditions, setConditions] = useState({ diabetes: true, hypertension: true, asthma: false });
  const [biomarker, setBiomarker] = useState('None (Default)');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const chatEndRef = useRef(null);

  const [chatHistory, setChatHistory] = useState(Array.isArray(initialAssistantChatHistory) ? initialAssistantChatHistory : []);

  // Context-aware suggested questions
  const suggestedPrompts = activePatient ? [
    `What is this patient's eligibility score?`,
    `Explain the significance of their diagnosis.`,
    `Are there matching trials for this profile?`
  ] : [
    `Set target population to 1000`,
    `Focus entirely on Type 2 Diabetes`,
    `What are the current global patient metrics?`
  ];

  const handleChipClick = (prompt) => {
    setChatInput(prompt);
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');
    setIsTyping(true);

    const botResponse = await generateAssistantResponse(userMessage, {
      activePatient,
      targetSize,
      metrics
    });

    setChatHistory(prev => [...prev, { role: 'assistant', content: botResponse }]);
    setIsTyping(false);
  };

  const startGeneration = () => {
    setIsGenerating(true);
    setGenerationProgress(0);

    const interval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsGenerating(false);
          setChatHistory(prevChat => [...prevChat, { role: 'assistant', content: `Cohort synthesis complete. ${targetSize} digital twins have been successfully generated and indexed.` }]);
          return 100;
        }
        return prev + 5;
      });
    }, 150);
  };

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isTyping]);

  const containerStyle = isFullScreen ? {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    background: 'var(--bg-primary)',
    padding: '1.25rem',
    width: '100vw',
    height: '100vh',
    display: 'grid',
    gridTemplateColumns: '1fr 380px',
    gap: '1.5rem',
    boxSizing: 'border-box'
  } : {
    display: 'grid',
    gridTemplateColumns: '1fr 350px',
    gap: '1.5rem',
    height: 'calc(100vh - 120px)'
  };

  return (
    <div style={containerStyle}>

      {/* Left Column: Visualization & Parameters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', minWidth: 0 }}>
        
        {/* Top: 3D Visualization */}
        <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: '400px' }}>
          <div style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>Digital Twin Synthesis</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Real-time 3D cohort generation and parameter mapping</p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.45rem 0.85rem', borderRadius: '20px', fontSize: '0.75rem' }}>
                <Database size={14} color="var(--accent-blue)" />
                <span>Model: <span style={{ color: 'white', fontWeight: 'bold' }}>ClinTwin V4.2</span></span>
              </div>
              <button
                onClick={() => setIsFullScreen(!isFullScreen)}
                style={{
                  background: isFullScreen ? 'rgba(255, 61, 0, 0.15)' : 'rgba(0, 240, 255, 0.15)',
                  border: `1px solid ${isFullScreen ? 'rgba(255, 61, 0, 0.4)' : 'rgba(0, 240, 255, 0.4)'}`,
                  color: isFullScreen ? 'var(--accent-red)' : 'var(--accent-blue)',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
                title={isFullScreen ? "Exit Full Screen Mode" : "Expand View to Full Screen Laptop Display"}
              >
                {isFullScreen ? <><Minimize size={14} /> Exit Full Screen</> : <><Maximize size={14} /> Expand Full Screen</>}
              </button>
            </div>
          </div>

          <div style={{ flex: 1, position: 'relative' }}>
            {isGenerating ? (
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 50, background: 'rgba(0,240,255,0.05)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 size={48} color="var(--accent-blue)" className="spin-animation" style={{ marginBottom: '1rem' }} />
                <h3 style={{ color: 'var(--accent-blue)', letterSpacing: '2px' }}>SYNTHESIZING POPULATION</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>Applying genetic and clinical constraints...</p>
              </div>
            ) : null}
            <PopulationTwin onSelectPatient={(p) => setActivePatient(p)} activePatientId={activePatient?.id} />
          </div>
        </div>

        {/* Bottom: Parameters or Patient Details */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          {activePatient ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={24} color="var(--accent-blue)" />
                </div>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{activePatient.id}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{activePatient.gender}, {activePatient.age} Y</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '2rem', fontSize: '0.85rem' }}>
                <div>
                  <div style={{ color: 'var(--text-secondary)' }}>Diagnosis</div>
                  <div style={{ fontWeight: 500 }}>{activePatient.cancerType}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-secondary)' }}>Stage</div>
                  <div style={{ fontWeight: 500 }}>{activePatient.stage}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-secondary)' }}>Eligibility Score</div>
                  <div style={{ fontWeight: 500, color: 'var(--accent-blue)' }}>{activePatient.score}%</div>
                </div>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => setActivePatient(null)}
                style={{ background: 'rgba(0, 240, 255, 0.1)', border: '1px solid rgba(0, 240, 255, 0.3)', color: 'var(--accent-blue)' }}
              >
                Close Profile
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '2rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Target Size</label>
                <input
                  type="number"
                  value={targetSize}
                  onChange={(e) => setTargetSize(e.target.value)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '0.5rem', borderRadius: '6px', color: 'white', fontSize: '0.85rem', outline: 'none' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Demographics</label>
                <select
                  value={baseDemographics}
                  onChange={(e) => setBaseDemographics(e.target.value)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '0.5rem', borderRadius: '6px', color: 'white', fontSize: '0.85rem', outline: 'none' }}
                >
                  <option>Global Mix</option>
                  <option>North America</option>
                  <option>Europe Focus</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  <span>Max Age</span>
                  <span style={{ color: 'var(--accent-blue)' }}>{ageMax}</span>
                </label>
                <input
                  type="range"
                  min="18"
                  max="100"
                  value={ageMax}
                  onChange={(e) => setAgeMax(e.target.value)}
                  style={{ width: '100%', accentColor: 'var(--accent-blue)', marginTop: '0.25rem' }}
                />
              </div>
              <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                {isGenerating ? (
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '0.25rem', color: 'var(--accent-blue)' }}>
                      <span>Synthesizing...</span>
                      <span>{generationProgress}%</span>
                    </div>
                    <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${generationProgress}%`, height: '100%', background: 'var(--accent-blue)' }}></div>
                    </div>
                  </div>
                ) : (
                  <button onClick={startGeneration} className="btn btn-primary" style={{ width: '100%', padding: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', fontSize: '0.85rem' }}>
                    <Play size={14} /> Generate
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Chat Assistant */}
      <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <img src="/research_assistant.jpg" alt="AI" style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover', filter: 'hue-rotate(85deg) brightness(1.2)' }} /> AI Assistant
          </h3>
        </div>

        <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {chatHistory?.map((msg, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.75rem', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
              {msg.role === 'assistant' ? (
                <img src="/research_assistant.jpg" alt="AI" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--accent-purple)', filter: 'hue-rotate(85deg) brightness(1.2)' }} />
              ) : (
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '0.7rem', flexShrink: 0 }}>
                  AK
                </div>
              )}
              <div style={{
                background: msg.role === 'assistant' ? 'rgba(255,255,255,0.03)' : 'rgba(0, 102, 255, 0.15)',
                border: msg.role === 'user' ? '1px solid rgba(0, 102, 255, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '0.85rem', lineHeight: 1.5,
                color: msg.role === 'user' ? 'var(--text-primary)' : 'var(--text-secondary)',
                maxWidth: '85%'
              }}>
                {msg.content}
              </div>
            </div>
          ))}
          {isTyping && (
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(157, 78, 221, 0.15)', border: '1px solid var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Loader2 size={14} color="var(--accent-purple)" className="spin-animation" />
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Processing...
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', overflowX: 'auto', paddingBottom: '0.25rem' }} className="hide-scrollbar">
            {suggestedPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleChipClick(prompt)}
                style={{
                  background: 'rgba(0, 240, 255, 0.1)',
                  border: '1px solid rgba(0, 240, 255, 0.2)',
                  color: 'var(--accent-blue)',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(0, 240, 255, 0.2)'}
                onMouseLeave={(e) => e.target.style.background = 'rgba(0, 240, 255, 0.1)'}
              >
                {prompt}
              </button>
            ))}
          </div>
          <form onSubmit={handleChatSubmit} style={{ position: 'relative' }}>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask anything..."
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '0.75rem 2.5rem 0.75rem 1rem', borderRadius: '8px', color: 'white', fontSize: '0.85rem', outline: 'none' }}
            />
            <button type="submit" style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
              <Send size={16} color="var(--text-muted)" />
            </button>
          </form>
        </div>
      </div>

    </div>
  );
};

export default ResearchAssistant;
