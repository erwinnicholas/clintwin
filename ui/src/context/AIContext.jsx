import React, { createContext, useContext, useState } from 'react';
import { explainDecision } from '../services/api';
import toast from 'react-hot-toast';

const AIContext = createContext();

export const useAI = () => {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
};

export const AIProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    {
      role: 'assistant',
      content: 'Hello! I am your Clinical Digital Twin Research Assistant. I can analyze trial pipelines, patient eligibility, and dynamic simulation anomalies. Click any "Explain AI Decision" button across the platform to provide me with context.',
      timestamp: new Date()
    }
  ]);
  const [activeContext, setActiveContext] = useState(null);

  const toggleAssistant = (forceState) => {
    setIsOpen(prev => forceState !== undefined ? forceState : !prev);
  };

  const triggerExplain = async (payload) => {
    if (isProcessing) {
      toast.error("Please wait for the current AI request to complete.");
      return;
    }
    
    setIsOpen(true);
    setActiveContext(payload);
    
    // Add User prompt
    const userPrompt = `Please explain the AI decision to: ${payload.action}. Rationale: ${payload.rationale}`;
    
    setChatHistory(prev => [
      ...prev,
      { role: 'user', content: userPrompt, timestamp: new Date(), contextRef: payload }
    ]);
    
    setIsProcessing(true);
    
    try {
      // Call backend API
      const response = await explainDecision(payload.context_type || "GENERAL_QUERY", payload.action, payload.rationale, payload.belief_state);
      
      // Add Assistant response
      setChatHistory(prev => [
        ...prev,
        { role: 'assistant', content: response.report, timestamp: new Date(), contextRef: payload }
      ]);
      
    } catch (err) {
      console.error("AI Explanation Failed:", err);
      toast.error("Failed to generate AI explanation.");
      setChatHistory(prev => [
        ...prev,
        { role: 'assistant', content: "An error occurred while analyzing the context. Please check your network connection or API keys.", timestamp: new Date() }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const sendMessage = async (msg) => {
    if (isProcessing) {
      toast.error("Please wait for the current AI request to complete.");
      return;
    }

    setChatHistory(prev => [
      ...prev,
      { role: 'user', content: msg, timestamp: new Date() }
    ]);
    
    setIsProcessing(true);
    
    // Fallback simple response for manual chat messages
    setTimeout(() => {
      setChatHistory(prev => [
        ...prev,
        { role: 'assistant', content: `I've received your query: "${msg}". Currently, I am optimized for analyzing explicit clinical contexts via the "Explain" buttons. Please use those to provide me with data payloads!`, timestamp: new Date() }
      ]);
      setIsProcessing(false);
    }, 1500);
  };

  const clearContext = () => {
    setActiveContext(null);
    setChatHistory([{
      role: 'assistant',
      content: 'Context cleared. How else can I assist you?',
      timestamp: new Date()
    }]);
  };

  return (
    <AIContext.Provider value={{
      isOpen,
      isProcessing,
      chatHistory,
      activeContext,
      toggleAssistant,
      triggerExplain,
      sendMessage,
      clearContext
    }}>
      {children}
    </AIContext.Provider>
  );
};
