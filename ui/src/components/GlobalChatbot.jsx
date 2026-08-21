import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, X, MessageSquare, Maximize2, Minimize2 } from 'lucide-react';
import { useGlobalData } from '../context/GlobalDataContext';
import { generateAssistantResponse } from '../services/llmService';
import { useLocation } from 'react-router-dom';

const GlobalChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  const { metrics, monitoringStats, activePatient } = useGlobalData();
  const location = useLocation();


  // Drag State
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0, moved: false });

  const handlePointerDown = (e) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, offsetX: offset.x, offsetY: offset.y, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragStart.current.moved = true;
    setOffset({ x: dragStart.current.offsetX + dx, y: dragStart.current.offsetY + dy });
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (!dragStart.current.moved) {
      setIsOpen(true);
    }
  };

  const handleChipClick = (prompt) => {
    setChatInput(prompt);
  };

  const getSuggestedPrompts = () => {
    const path = location.pathname;
    const basePrompts = [`Summarize the current page`, `What is the status of PAT-4022?`];

    if (path.includes('/dashboard/assistant')) {
      return [`Summarize the current page`, `Set target population to 1000`, `What are the active clinical targets?`];
    } else if (path.includes('/dashboard/monitoring')) {
      return [`Summarize the current page`, `What is the server CPU load?`, `Are there any critical alerts?`];
    } else if (path.includes('/dashboard/reports')) {
      return [`Summarize the current page`, `What is the total eligible patient count?`, `Explain the compliance metrics.`];
    } else if (path.includes('/dashboard/patients')) {
      return [`Summarize the current page`, `What is the status of PAT-1192?`, `Filter for Stage 3 patients.`];
    }

    return [...basePrompts, `What are the global metrics?`];
  };

  const suggestedPrompts = getSuggestedPrompts();

  const [chatHistory, setChatHistory] = useState([
    { role: 'assistant', content: "Hello! I am your global ClinTwin Assistant. You can ask me about system metrics, current active pages, or query a specific patient (e.g. 'What is PAT-4022 diagnosis?')." }
  ]);

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');
    setIsTyping(true);

    // Call real (or smart mock) LLM Service
    const botResponse = await generateAssistantResponse(userMessage, {
      metrics,
      monitoringStats,
      currentRoute: location.pathname,
      activePatient
    });

    setChatHistory(prev => [...prev, { role: 'assistant', content: botResponse }]);
    setIsTyping(false);
  };

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isTyping, isOpen, isExpanded]);

  // Hide the global chatbot on the Research Assistant page because that page IS a giant chatbot UI
  if (location.pathname === '/dashboard/assistant' || !isVisible) {
    return null;
  }

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'var(--accent-blue)',
            border: 'none',
            boxShadow: '0 4px 20px rgba(0, 240, 255, 0.4)',
            cursor: isDragging ? 'grabbing' : 'grab',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            transform: `translate(${offset.x}px, ${offset.y}px) ${isDragging ? 'scale(1.05)' : 'scale(1)'}`,
            transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            touchAction: 'none' // Prevent scrolling while dragging on mobile
          }}
          onMouseEnter={(e) => { if (!isDragging) e.currentTarget.style.transform = `translate(${offset.x}px, ${offset.y}px) scale(1.1)` }}
          onMouseLeave={(e) => { if (!isDragging) e.currentTarget.style.transform = `translate(${offset.x}px, ${offset.y}px) scale(1)` }}
        >
          <img
            src="/research_assistant.jpg"
            alt="AI Assistant"
            draggable={false}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              objectFit: 'cover',
              filter: 'hue-rotate(90deg) brightness(1.1)',
              userSelect: 'none'
            }}
          />
          <div 
            onClick={(e) => { e.stopPropagation(); setIsVisible(false); }}
            style={{ 
              position: 'absolute', top: '-5px', right: '-5px', width: '20px', height: '20px', 
              background: 'var(--bg-tertiary)', borderRadius: '50%', border: '1px solid var(--border-color)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10000 
            }}
          >
            <X size={12} color="var(--text-muted)" />
          </div>
        </button>
      )}

      {/* Chat Window Panel */}
      {isOpen && (
        <div
          className="glass-panel fade-in"
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            width: isExpanded ? '450px' : '350px',
            height: isExpanded ? '600px' : '450px',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 9999,
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            border: '1px solid rgba(0, 240, 255, 0.3)',
            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}
        >
          {/* Header */}
          <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <img
                src="/research_assistant.jpg"
                alt="AI"
                style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', filter: 'hue-rotate(90deg) brightness(1.1)' }}
              />
              <span style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--text-primary)' }}>Global AI Assistant</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(0,0,0,0.1)' }}>
            {chatHistory.map((msg, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.75rem', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                {msg.role === 'assistant' ? (
                  <img src="/research_assistant.jpg" alt="AI" style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--accent-blue)', filter: 'hue-rotate(90deg) brightness(1.1)' }} />
                ) : (
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '0.6rem', flexShrink: 0 }}>
                    U
                  </div>
                )}
                <div style={{
                  background: msg.role === 'assistant' ? 'rgba(255,255,255,0.05)' : 'rgba(0, 240, 255, 0.15)',
                  border: msg.role === 'user' ? '1px solid rgba(0, 240, 255, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                  padding: '0.75rem', borderRadius: '12px', fontSize: '0.85rem', lineHeight: 1.4,
                  color: msg.role === 'user' ? 'white' : 'var(--text-secondary)',
                  maxWidth: '85%'
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(0, 240, 255, 0.15)', border: '1px solid var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Loader2 size={12} color="var(--accent-blue)" className="spin-animation" />
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Analyzing context...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.3)' }}>
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
                placeholder="Ask about metrics, patients, or this page..."
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '0.75rem 2.5rem 0.75rem 1rem', borderRadius: '24px', color: 'white', fontSize: '0.85rem', outline: 'none' }}
              />
              <button type="submit" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <Send size={16} color="var(--accent-blue)" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default GlobalChatbot;
