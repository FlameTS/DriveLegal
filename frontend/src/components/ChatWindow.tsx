import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Send, Bot, User, HelpCircle, Sparkles, BookOpen } from 'lucide-react';

interface Source {
  section: string;
  title: string;
  description: string;
  state_code: string;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  detectedLanguage?: string;
  sources?: Source[];
}

export const ChatWindow: React.FC = () => {
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Namaste! I am DriveLegal, your AI Traffic Law Assistant. Ask me any traffic law questions, such as: "What is the penalty for driving without a PUC in Delhi?" or "Can a woman ride pillion without a helmet in MP?"'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatMode, setChatMode] = useState<'simple' | 'legal'>('simple');
  const [activeState, setActiveState] = useState('IN');
  const [vehicleType, setVehicleType] = useState('all');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput('');
    const userMsgId = Date.now().toString();

    // Add user message
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, sender: 'user', text: userMsg }
    ]);
    setLoading(true);

    try {
      // Build request body
      // Adjust language param to tell Gemini preferred translation output
      const langParam = language;
      
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMsg,
          state_code: activeState,
          vehicle_type: vehicleType,
          language: chatMode === 'simple' ? `${langParam} (explain simply, like a friendly lawyer helping a friend)` : langParam
        })
      });

      if (!response.ok) {
        throw new Error('Failed to reach AI chatbot API');
      }

      const data = await response.json();
      
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: data.response,
          detectedLanguage: data.detected_language,
          sources: data.sources
        }
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: 'I am experiencing trouble connecting to the traffic law database. Please ensure the backend is running locally on port 8000.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-layout">
      {/* Sidebar Controls */}
      <div className="chat-sidebar">
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} className="text-primary" />
            Chat Configuration
          </h3>

          {/* Chat Mode Toggle */}
          <div className="form-group">
            <label className="form-label">Response Tone</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
              <button
                type="button"
                className={`btn ${chatMode === 'simple' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}
                onClick={() => setChatMode('simple')}
              >
                {t('chatModeSimple')}
              </button>
              <button
                type="button"
                className={`btn ${chatMode === 'legal' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}
                onClick={() => setChatMode('legal')}
              >
                {t('chatModeLegal')}
              </button>
            </div>
          </div>

          {/* Active State Filter for Context */}
          <div className="form-group">
            <label className="form-label">{t('selectState')}</label>
            <select
              className="form-select"
              value={activeState}
              onChange={(e) => setActiveState(e.target.value)}
              style={{ padding: '0.5rem' }}
            >
              <option value="IN">National Rules (India)</option>
              <option value="MP">Madhya Pradesh (MP)</option>
              <option value="DL">Delhi NCR</option>
              <option value="MH">Maharashtra (MH)</option>
              <option value="TN">Tamil Nadu (TN)</option>
              <option value="UP">Uttar Pradesh (UP)</option>
              <option value="KA">Karnataka (KA)</option>
            </select>
          </div>

          {/* Vehicle Type Filter for Context */}
          <div className="form-group">
            <label className="form-label">{t('selectVehicle')}</label>
            <select
              className="form-select"
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              style={{ padding: '0.5rem' }}
            >
              <option value="all">All Vehicles</option>
              <option value="motorcycle">Two-Wheeler</option>
              <option value="car">Four-Wheeler</option>
            </select>
          </div>
        </div>

        {/* Info card */}
        <div className="card" style={{ padding: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <HelpCircle size={14} />
            How this AI works
          </h4>
          <p>
            Unlike general chat systems, DriveLegal retrieves factual laws from our validated state database first. The AI is restricted to explaining ONLY these retrieved codes.
          </p>
        </div>
      </div>

      {/* Main Chat Container */}
      <div className="chat-main">
        {/* Chat Messages Viewport */}
        <div className="chat-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`chat-message-bubble ${msg.sender}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                {msg.sender === 'assistant' ? (
                  <>
                    <Bot size={16} className="text-primary" />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>DriveLegal AI</span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>You</span>
                    <User size={16} className="text-secondary" />
                  </>
                )}
              </div>

              <div className="chat-message-content" style={{ whiteSpace: 'pre-wrap' }}>
                {msg.text}
              </div>

              {/* Citations and Sources list */}
              {msg.sources && msg.sources.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <BookOpen size={12} />
                    Retrieved Database Sources:
                  </div>
                  <div className="chat-sources">
                    {msg.sources.map((src, idx) => (
                      <div
                        key={idx}
                        className="source-badge"
                        title={src.description}
                        onClick={() => alert(`Section: ${src.section}\nTitle: ${src.title}\nState: ${src.state_code}\n\nDescription: ${src.description}`)}
                      >
                        {src.section} ({src.state_code})
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {msg.detectedLanguage && (
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', alignSelf: 'flex-start', marginTop: '0.1rem' }}>
                  Detected Language: {msg.detectedLanguage}
                </span>
              )}
            </div>
          ))}

          {/* Loading Typing indicator */}
          {loading && (
            <div className="typing-indicator">
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input box */}
        <form onSubmit={handleSend} className="chat-input-area">
          <input
            type="text"
            className="form-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('askQuestion')}
            disabled={loading}
            style={{ borderRadius: 'var(--radius-lg)' }}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !input.trim()}
            style={{ padding: '0.75rem', borderRadius: 'var(--radius-full)' }}
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};
export default ChatWindow;
