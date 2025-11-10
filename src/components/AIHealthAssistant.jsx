// AI Health Assistant Component
// Chat interface for conversational Q&A about health data

import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageCircle, Send, X, Bot, User, Loader2,
  Sparkles, AlertCircle
} from 'lucide-react';
import { answerHealthQuestion, generateContentStream } from '../utils/aiInsights';
import { isGeminiAvailable } from '../utils/geminiClient';

const theme = {
  background: {
    primary: '#0a0a0a',
    secondary: '#111111',
    card: 'rgba(255, 255, 255, 0.03)',
  },
  border: {
    primary: 'rgba(255, 255, 255, 0.08)',
  },
  text: {
    primary: '#ffffff',
    secondary: 'rgba(255, 255, 255, 0.7)',
    tertiary: 'rgba(255, 255, 255, 0.5)',
  },
  accent: {
    primary: '#6366f1',
    secondary: '#8b5cf6',
  }
};

const AIHealthAssistant = ({ isOpen, onClose, allHealthData }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm your AI health assistant. I can help you understand your health data, explain patterns, and answer questions. What would you like to know?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !allHealthData) return;

    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      if (!isGeminiAvailable()) {
        throw new Error('AI service is not available. The API key may not be loaded. Please ensure you have a .env file with REACT_APP_GEMINI_API_KEY and restart the development server (stop and run "npm start" again).');
      }

      const response = await answerHealthQuestion(input.trim(), allHealthData);
      
      const assistantMessage = {
        role: 'assistant',
        content: response.answer,
        timestamp: new Date(),
        sources: response.sources
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      setError(err.message);
      const errorMessage = {
        role: 'assistant',
        content: `I apologize, but I encountered an error: ${err.message}. Please try again or rephrase your question.`,
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedQuestions = [
    "Why am I so tired this week?",
    "What's affecting my sleep quality?",
    "How does my activity level impact my mood?",
    "What patterns do you see in my health data?",
    "Are there any anomalies I should be concerned about?"
  ];

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div 
        className="bg-black rounded-2xl border shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col"
        style={{ borderColor: theme.border.primary }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: theme.border.primary }}>
          <div className="flex items-center gap-3">
            <div 
              className="p-2 rounded-lg"
              style={{ 
                background: `linear-gradient(135deg, ${theme.accent.primary} 0%, ${theme.accent.secondary} 100%)`
              }}
            >
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: theme.text.primary }}>
                AI Health Assistant
              </h2>
              <p className="text-xs" style={{ color: theme.text.tertiary }}>
                Ask me anything about your health data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: theme.text.secondary }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ 
                    background: `linear-gradient(135deg, ${theme.accent.primary} 0%, ${theme.accent.secondary} 100%)`
                  }}
                >
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              
              <div 
                className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                  message.role === 'user' 
                    ? 'rounded-tr-sm' 
                    : 'rounded-tl-sm'
                }`}
                style={{
                  backgroundColor: message.role === 'user'
                    ? theme.accent.primary
                    : message.isError
                    ? 'rgba(239, 68, 68, 0.1)'
                    : theme.background.card,
                  borderColor: message.isError ? 'rgba(239, 68, 68, 0.3)' : theme.border.primary,
                  borderWidth: '1px',
                  color: theme.text.primary
                }}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                {message.sources && message.sources.correlations?.length > 0 && (
                  <div className="mt-2 pt-2 border-t" style={{ borderColor: theme.border.primary }}>
                    <p className="text-xs mb-1" style={{ color: theme.text.tertiary }}>
                      Based on:
                    </p>
                    <ul className="text-xs space-y-1" style={{ color: theme.text.secondary }}>
                      {message.sources.correlations.slice(0, 2).map((corr, i) => (
                        <li key={i}>
                          • {corr.metric1Label} → {corr.metric2Label} ({corr.correlation > 0 ? '+' : ''}{corr.correlation.toFixed(2)})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="text-xs mt-2" style={{ color: theme.text.tertiary }}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              {message.role === 'user' && (
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: theme.background.card }}
                >
                  <User className="w-4 h-4" style={{ color: theme.text.secondary }} />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ 
                  background: `linear-gradient(135deg, ${theme.accent.primary} 0%, ${theme.accent.secondary} 100%)`
                }}
              >
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div 
                className="rounded-2xl rounded-tl-sm px-4 py-3"
                style={{
                  backgroundColor: theme.background.card,
                  borderColor: theme.border.primary,
                  borderWidth: '1px'
                }}
              >
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: theme.accent.primary }} />
                  <span className="text-sm" style={{ color: theme.text.secondary }}>
                    Analyzing your data...
                  </span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div 
              className="rounded-lg p-3 flex items-center gap-2"
              style={{ 
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderColor: 'rgba(239, 68, 68, 0.3)',
                borderWidth: '1px'
              }}
            >
              <AlertCircle className="w-4 h-4" style={{ color: '#ef4444' }} />
              <span className="text-sm" style={{ color: '#ef4444' }}>
                {error}
              </span>
            </div>
          )}

          {messages.length === 1 && (
            <div className="mt-4">
              <p className="text-xs mb-3" style={{ color: theme.text.tertiary }}>
                Suggested questions:
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((question, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(question)}
                    className="px-3 py-1.5 rounded-lg text-xs transition-all hover:scale-105"
                    style={{
                      backgroundColor: theme.background.card,
                      borderColor: theme.border.primary,
                      borderWidth: '1px',
                      color: theme.text.secondary
                    }}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t" style={{ borderColor: theme.border.primary }}>
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about your health data..."
                rows={1}
                className="w-full px-4 py-3 pr-12 rounded-lg border resize-none focus:outline-none focus:ring-2 transition-all text-sm"
                style={{
                  backgroundColor: theme.background.secondary,
                  borderColor: theme.border.primary,
                  color: theme.text.primary,
                  maxHeight: '120px'
                }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading || !allHealthData}
              className="p-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: input.trim() && !isLoading && allHealthData
                  ? `linear-gradient(135deg, ${theme.accent.primary} 0%, ${theme.accent.secondary} 100%)`
                  : theme.background.card,
                color: 'white'
              }}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          {!allHealthData && (
            <p className="text-xs mt-2" style={{ color: theme.text.tertiary }}>
              <AlertCircle className="w-3 h-3 inline mr-1" />
              Health data not loaded. Please wait for data to load.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIHealthAssistant;

