import React, { useState, useEffect, useRef } from 'react';
import { specialApi } from '../../api';

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am Cura AI, your personal health assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  async function handleSend() {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    const newMessages = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      // Send only the last few messages for history to stay within tokens
      const history = messages.slice(-6).filter(m => m.role !== 'system');
      const res = await specialApi.chat(userMsg, history);
      setMessages([...newMessages, { role: 'assistant', content: res.response }]);
    } catch (e) {
      setMessages([...newMessages, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again later.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ zIndex: 1000, fontFamily: 'var(--font-body)' }}>
      {/* Floating Button */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="btn btn-primary"
          style={{ 
            position: 'fixed', bottom: 30, right: 30,
            width: 60, height: 60, borderRadius: '50%', fontSize: 24, 
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)', display: 'flex', 
            alignItems: 'center', justifyContent: 'center', padding: 0,
            border: 'none', cursor: 'pointer'
          }}
        >
          💬
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="card fade-up chatbot-window" style={{ 
          display: 'flex', flexDirection: 'column', 
          padding: 0, overflow: 'hidden', boxShadow: '0 12px 48px rgba(0,0,0,0.25)',
          background: 'var(--surface)', border: '1px solid var(--border)'
        }}>
          {/* Header */}
          <div style={{ 
            padding: '16px 20px', background: 'var(--teal)', color: 'white', 
            display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 20 }}>🤖</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Cura AI</div>
                <div style={{ fontSize: 10, opacity: 0.8 }}>Healthcare Assistant</div>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: 18 }}
            >
              ✕
            </button>
          </div>

          {/* Messages area */}
          <div 
            ref={scrollRef}
            style={{ 
              flex: 1, padding: 20, overflowY: 'auto', display: 'flex', 
              flexDirection: 'column', gap: 12, background: 'var(--surface-lt)' 
            }}
          >
            {messages.map((m, i) => (
              <div key={i} style={{ 
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                padding: '10px 14px',
                borderRadius: m.role === 'user' ? '14px 14px 0 14px' : '14px 14px 14px 0',
                background: m.role === 'user' ? 'var(--teal)' : 'white',
                color: m.role === 'user' ? 'white' : 'var(--ink)',
                fontSize: 13,
                lineHeight: 1.5,
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                whiteSpace: 'pre-wrap'
              }}>
                {m.content}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', padding: '10px 14px', background: 'white', borderRadius: '14px 14px 14px 0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <span className="dot-typing">Thinking...</span>
              </div>
            )}
          </div>

          {/* Footer Input */}
          <div style={{ padding: 16, borderTop: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', gap: 8 }}>
            <input 
              className="form-input" 
              placeholder="Ask me anything about health..." 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              style={{ fontSize: 13, height: 40 }}
            />
            <button 
              onClick={handleSend}
              className="btn btn-primary"
              disabled={!input.trim() || loading}
              style={{ height: 40, width: 40, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              🚀
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
