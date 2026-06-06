'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MagnifyingGlassIcon, TrashIcon, ArrowPathIcon,
  ChatBubbleLeftRightIcon, ChevronLeftIcon,
} from '@heroicons/react/24/outline';
import type { AddToast } from '@/lib/types';

type ChatFile = { name: string; phone: string; modified: string };
type ChatMessage = {
  datetime?: string;
  timestamp?: string;
  user_phone?: string;
  user_name?: string;
  user_message?: string;
  Vertices_response?: string;
  vertices_response?: string;
};

export function ChatsView({ addToast, isMobile }: { addToast: AddToast; isMobile: boolean }) {
  const [files, setFiles]         = useState<ChatFile[]>([]);
  const [selected, setSelected]   = useState<string | null>(null);
  const [messages, setMessages]   = useState<ChatMessage[]>([]);
  const [search, setSearch]       = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [showConv, setShowConv]   = useState(false);
  const msgEndRef                 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/chat').then(r => r.json()).then(d => setFiles(d.files || []));
  }, []);

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadChat = useCallback(async (file: string) => {
    setLoading(true);
    setSelected(file);
    if (isMobile) setShowConv(true);
    const params = new URLSearchParams({ file });
    if (search) params.set('search', search);
    if (startDate) params.set('start', startDate);
    if (endDate) params.set('end', endDate);
    const r = await fetch(`/api/chat?${params}`);
    const d = await r.json();
    setMessages(d.messages || []);
    setLoading(false);
  }, [search, startDate, endDate, isMobile]);

  const deleteChat = async (file: string) => {
    if (!confirm(`Delete all chat history for ${file.replace('.json', '')}?`)) return;
    setDeleting(true);
    const r = await fetch(`/api/chat?file=${file}`, { method: 'DELETE' });
    const d = await r.json();
    if (d.ok) {
      addToast('Chat history deleted', 'success');
      setFiles(prev => prev.filter(f => f.name !== file));
      if (selected === file) { setSelected(null); setMessages([]); setShowConv(false); }
    } else {
      addToast('Failed to delete', 'error');
    }
    setDeleting(false);
  };

  const formatTime = (ts?: string) => {
    if (!ts) return '';
    try { return new Date(ts).toLocaleString(); } catch { return ts; }
  };

  const filteredFiles = files.filter(f =>
    !search || f.phone.includes(search) || f.name.toLowerCase().includes(search.toLowerCase())
  );

  const showList = !isMobile || !showConv;
  const showThread = !isMobile || showConv;

  return (
    <div className="fade-in" style={{
      display: 'flex', gap: 20,
      height: isMobile ? 'auto' : 'calc(100vh - 120px)',
      flexDirection: isMobile ? 'column' : 'row',
    }}>
      {/* File list */}
      {showList && (
        <div className="card" style={{
          width: isMobile ? '100%' : 280, minWidth: isMobile ? 0 : 280,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          height: isMobile ? 'auto' : '100%',
        }}>
          <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 10px', color: 'var(--text)' }}>
              Conversations
            </h2>
            <div style={{ position: 'relative' }}>
              <MagnifyingGlassIcon style={{
                position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)',
                width: 15, height: 15, color: 'var(--text-muted)',
              }} />
              <input className="input" placeholder="Search chats…" value={search}
                onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32, fontSize: 13 }} />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 8, maxHeight: isMobile ? 320 : undefined }}>
            {filteredFiles.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '40px 16px' }}>
                No chat history found
              </div>
            ) : filteredFiles.map(f => (
              <div key={f.name} onClick={() => loadChat(f.name)} style={{
                padding: '10px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 2,
                background: selected === f.name ? 'var(--accent-muted)' : 'transparent',
                border: selected === f.name ? '1px solid var(--accent-border)' : '1px solid transparent',
                transition: 'background 0.12s',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text)' }}>+{f.phone}</div>
                  <button
                    onClick={e => { e.stopPropagation(); deleteChat(f.name); }}
                    disabled={deleting}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}
                  >
                    <TrashIcon style={{ width: 14, height: 14 }} />
                  </button>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                  {new Date(f.modified).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conversation thread */}
      {showThread && (
        <div className="card" style={{
          flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          height: isMobile ? 'calc(100vh - 200px)' : '100%',
        }}>
          {/* Filter bar */}
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid var(--border)',
            display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
          }}>
            {isMobile && (
              <button className="btn-secondary" onClick={() => setShowConv(false)} style={{ padding: '7px 12px', fontSize: 13 }}>
                <ChevronLeftIcon style={{ width: 14, height: 14 }} /> Back
              </button>
            )}
            <input className="input" type="date" value={startDate}
              onChange={e => setStartDate(e.target.value)} style={{ width: 150, fontSize: 13 }} />
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>to</span>
            <input className="input" type="date" value={endDate}
              onChange={e => setEndDate(e.target.value)} style={{ width: 150, fontSize: 13 }} />
            {selected && (
              <button className="btn-primary" onClick={() => loadChat(selected)} style={{ padding: '8px 14px', marginLeft: 'auto' }}>
                <MagnifyingGlassIcon style={{ width: 14, height: 14 }} /> Search
              </button>
            )}
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
            {!selected ? (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: '100%', flexDirection: 'column', gap: 12, color: 'var(--text-muted)',
              }}>
                <ChatBubbleLeftRightIcon style={{ width: 48, height: 48, opacity: 0.3 }} />
                <p style={{ fontSize: 14, margin: 0 }}>Select a conversation to view</p>
              </div>
            ) : loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
                <ArrowPathIcon style={{ width: 24, height: 24, color: 'var(--text-muted)', animation: 'spin 1s linear infinite' }} />
              </div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: 60, fontSize: 14 }}>
                No messages found
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {messages.map((m, i) => (
                  <div key={i}>
                    {m.user_message && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                          {m.user_name || m.user_phone} · {formatTime(m.datetime || m.timestamp)}
                        </div>
                        <div style={{
                          display: 'inline-block',
                          background: 'var(--bg)', border: '1px solid var(--border)',
                          borderRadius: '12px 12px 12px 3px',
                          padding: '10px 14px', fontSize: 13.5, maxWidth: '80%', lineHeight: 1.5,
                          color: 'var(--text)',
                        }}>
                          {m.user_message}
                        </div>
                      </div>
                    )}
                    {(m.Vertices_response || m.vertices_response) && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right', marginBottom: 4 }}>
                            Vertices.AI
                          </div>
                          <div style={{
                            display: 'inline-block',
                            background: 'var(--accent)', color: 'white',
                            borderRadius: '12px 12px 3px 12px',
                            padding: '10px 14px', fontSize: 13.5, maxWidth: '80%', lineHeight: 1.5,
                          }}>
                            {m.Vertices_response || m.vertices_response}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={msgEndRef} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
