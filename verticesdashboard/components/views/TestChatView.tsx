'use client';
import { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '@/components/PageHeader';
import type { AddToast } from '@/lib/types';

type PersonaType = 'long' | 'short' | 'boss';

interface Message {
  role: 'user' | 'bot';
  text: string;
  ts: string;
}

interface HistoryEntry {
  user: string;
  bot: string;
}

const PERSONA_TABS: { key: PersonaType; label: string; hint: string }[] = [
  { key: 'long',  label: 'Long',  hint: 'Full customer-facing persona — used for 1-on-1 WhatsApp chats' },
  { key: 'short', label: 'Short', hint: 'Condensed persona — quick reference' },
  { key: 'boss',  label: 'Boss',  hint: 'Your personal AI assistant mode — how the bot responds to you' },
];

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function TestChatView({ addToast }: { addToast: AddToast }) {
  const [personaType, setPersonaType] = useState<PersonaType>('long');
  const [messages,    setMessages]    = useState<Message[]>([]);
  const [history,     setHistory]     = useState<HistoryEntry[]>([]);
  const [input,       setInput]       = useState('');
  const [sending,     setSending]     = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const switchPersona = (p: PersonaType) => {
    setPersonaType(p);
    setMessages([]);
    setHistory([]);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setMessages(prev => [...prev, { role: 'user', text, ts: nowTime() }]);
    setInput('');
    setSending(true);

    try {
      const r = await fetch('/api/test-chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: text, history, personaType }),
      });
      const d = await r.json();
      if (d.error) {
        addToast(d.error, 'error');
        setMessages(prev => prev.slice(0, -1));
        setInput(text);
      } else {
        setMessages(prev => [...prev, { role: 'bot', text: d.reply, ts: nowTime() }]);
        setHistory(prev => [...prev, { user: text, bot: d.reply }]);
      }
    } catch (err: any) {
      addToast(err.message || 'Request failed', 'error');
      setMessages(prev => prev.slice(0, -1));
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const reset = () => {
    setMessages([]);
    setHistory([]);
    setInput('');
  };

  const activeHint = PERSONA_TABS.find(t => t.key === personaType)?.hint ?? '';

  return (
    <div className="fade-in">
      <PageHeader title="Test Chat" subtitle="Preview how your bot responds using your saved persona">
        <button className="btn-secondary" onClick={reset} style={{ padding: '8px 16px' }}>
          <ArrowPathIcon style={{ width: 14, height: 14 }} />
          Reset
        </button>
      </PageHeader>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>

        {/* Persona selector */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          background: 'var(--surface)',
        }}>
          {PERSONA_TABS.map(t => (
            <button
              key={t.key}
              className={`tab ${personaType === t.key ? 'active' : ''}`}
              onClick={() => switchPersona(t.key)}
            >
              {t.label}
            </button>
          ))}
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>{activeHint}</span>
        </div>

        {/* Chat area */}
        <div style={{
          minHeight: 420,
          maxHeight: 520,
          overflowY: 'auto',
          padding: '20px 20px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          background: 'var(--bg)',
        }}>
          {messages.length === 0 && !sending && (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              minHeight: 300, flexDirection: 'column', gap: 8,
            }}>
              <div style={{ fontSize: 28 }}>💬</div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', textAlign: 'center' }}>
                Send a message to see how your bot responds
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}>
              <div style={{
                maxWidth: '72%',
                padding: '10px 14px',
                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: msg.role === 'user' ? 'var(--accent)' : 'var(--surface)',
                color: msg.role === 'user' ? '#fff' : 'var(--text)',
                fontSize: 14,
                lineHeight: 1.55,
                boxShadow: 'var(--shadow-card)',
                border: msg.role === 'bot' ? '1px solid var(--border)' : 'none',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {msg.text}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, paddingInline: 4 }}>
                {msg.role === 'bot' ? `Bot · ${msg.ts}` : msg.ts}
              </div>
            </div>
          ))}

          {sending && (
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <div style={{
                padding: '12px 16px',
                borderRadius: '16px 16px 16px 4px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-card)',
                display: 'flex',
                gap: 5,
                alignItems: 'center',
              }}>
                {[0, 1, 2].map(i => (
                  <span key={i} style={{
                    display: 'inline-block',
                    width: 7, height: 7,
                    borderRadius: '50%',
                    background: 'var(--text-muted)',
                    animation: `bounce 0.9s ${i * 0.15}s infinite ease-in-out`,
                  }} />
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          gap: 10,
          alignItems: 'flex-end',
          background: 'var(--surface)',
        }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
            disabled={sending}
            style={{
              flex: 1,
              minHeight: 44,
              maxHeight: 120,
              resize: 'none',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '10px 12px',
              fontSize: 14,
              fontFamily: 'inherit',
              color: 'var(--text)',
              outline: 'none',
              lineHeight: 1.5,
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-muted)';
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          <button
            className="btn-primary"
            onClick={send}
            disabled={!input.trim() || sending}
            style={{ padding: '10px 16px', flexShrink: 0, alignSelf: 'flex-end' }}
          >
            <PaperAirplaneIcon style={{ width: 16, height: 16 }} />
          </button>
        </div>

      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50%       { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
