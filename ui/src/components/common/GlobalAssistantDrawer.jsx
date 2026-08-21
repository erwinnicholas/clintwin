import React, { useState, useRef, useEffect } from 'react';
import { useAI } from '../../context/AIContext';
import { Send, Loader2, X, Trash2, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const GlobalAssistantDrawer = () => {
  const { isOpen, isProcessing, chatHistory, toggleAssistant, sendMessage, clearContext } = useAI();
  const [input, setInput] = useState('');
  const chatEndRef = useRef(null);

  // Auto-scroll to bottom when chat updates
  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isProcessing, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    sendMessage(input.trim());
    setInput('');
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: '400px',
      height: '100vh',
      background: 'var(--bg-secondary)',
      borderLeft: '1px solid var(--border-color)',
      boxShadow: '-10px 0 50px rgba(0,0,0,0.5)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 10000,
      animation: 'slideInRight 0.3s ease-out'
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg-primary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(157, 78, 221, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--accent-purple)' }}>
            <Bot size={18} color="var(--accent-purple)" />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>AI Assistant Copilot</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Context-Aware Clinical Explainer</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={clearContext} title="Clear Context" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}>
            <Trash2 size={16} />
          </button>
          <button onClick={() => toggleAssistant(false)} title="Close Drawer" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}>
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {chatHistory.map((msg, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.75rem', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
            {msg.role === 'assistant' ? (
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(157, 78, 221, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--accent-purple)', flexShrink: 0 }}>
                <Bot size={14} color="var(--accent-purple)" />
              </div>
            ) : (
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '0.7rem', flexShrink: 0 }}>
                ME
              </div>
            )}
            <div style={{ 
              background: msg.role === 'assistant' ? 'rgba(255,255,255,0.03)' : 'rgba(0, 102, 255, 0.15)', 
              border: msg.role === 'user' ? '1px solid rgba(0, 102, 255, 0.3)' : '1px solid rgba(255,255,255,0.05)',
              padding: '0.75rem 1rem', 
              borderRadius: '12px', 
              borderTopRightRadius: msg.role === 'user' ? 0 : '12px',
              borderTopLeftRadius: msg.role === 'assistant' ? 0 : '12px',
              fontSize: '0.85rem', 
              color: msg.role === 'user' ? 'var(--text-primary)' : 'var(--text-secondary)',
              maxWidth: '85%',
              lineHeight: '1.5'
            }}>
              {msg.role === 'assistant' ? (
                 // Use Markdown for AI responses
                 <div className="markdown-body" style={{ color: 'inherit', fontSize: 'inherit' }}>
                   <ReactMarkdown>{msg.content}</ReactMarkdown>
                 </div>
              ) : (
                msg.content
              )}
              {msg.contextRef && (
                <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed rgba(255,255,255,0.1)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  <span style={{ color: 'var(--accent-purple)', fontWeight: 600 }}>Attached Context:</span> {msg.contextRef.action}
                </div>
              )}
            </div>
          </div>
        ))}
        {isProcessing && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(157, 78, 221, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Loader2 size={14} color="var(--accent-purple)" className="spin-animation" />
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Analyzing clinical context...
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
        <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isProcessing}
            placeholder={isProcessing ? "AI is processing..." : "Ask the copilot..."} 
            style={{ 
              width: '100%', 
              background: 'rgba(255,255,255,0.05)', 
              border: '1px solid var(--border-color)', 
              padding: '0.8rem 2.5rem 0.8rem 1rem', 
              borderRadius: '20px', 
              color: 'white', 
              fontSize: '0.85rem', 
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          <button 
            type="submit" 
            disabled={isProcessing || !input.trim()}
            style={{ 
              position: 'absolute', 
              right: '6px', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              background: input.trim() && !isProcessing ? 'var(--accent-purple)' : 'rgba(255,255,255,0.1)', 
              border: 'none', 
              width: '28px', 
              height: '28px', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: input.trim() && !isProcessing ? 'pointer' : 'default',
              transition: 'background 0.2s'
            }}
          >
            <Send size={14} color="white" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default GlobalAssistantDrawer;
