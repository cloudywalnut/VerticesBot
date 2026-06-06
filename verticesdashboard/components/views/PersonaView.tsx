'use client';
import { useState, useEffect } from 'react';
import { ArrowPathIcon, CheckIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '@/components/PageHeader';
import type { AddToast } from '@/lib/types';

const TABS = [
  { key: 'short', label: 'Short',  hint: "Brief personality overview. Used as a quick reference for the bot's identity." },
  { key: 'long',  label: 'Long',   hint: 'Full personality for 1-on-1 customer chats. Include communication rules, tone, and all business knowledge.' },
  { key: 'group', label: 'Group',  hint: 'Defines behaviour in WhatsApp group chats — when to respond, how to handle tags.' },
  { key: 'boss',  label: 'Boss',   hint: 'How the bot responds to you (the boss). Functions as an AI assistant rather than a sales persona.' },
];

export function PersonaView({ addToast }: { addToast: AddToast }) {
  const [activeTab, setActiveTab] = useState('short');
  const [contents, setContents]   = useState<Record<string, string>>({});
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [dirty, setDirty]         = useState(false);

  useEffect(() => {
    fetch('/api/persona').then(r => r.json()).then(d => {
      setContents(d);
      setLoading(false);
    });
  }, []);

  const save = async () => {
    setSaving(true);
    const r = await fetch('/api/persona', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: activeTab, content: contents[activeTab] || '' }),
    });
    const d = await r.json();
    if (d.ok) { addToast('Persona saved', 'success'); setDirty(false); }
    else addToast(d.error || 'Save failed', 'error');
    setSaving(false);
  };

  const activeHint = TABS.find(t => t.key === activeTab)?.hint ?? '';
  const wordCount  = (contents[activeTab] || '').split(/\s+/).filter(Boolean).length;
  const charCount  = (contents[activeTab] || '').length;

  return (
    <div className="fade-in">
      <PageHeader title="Persona" subtitle="Define how your bot communicates">
        <button className="btn-primary" onClick={save} disabled={saving || !dirty}>
          {saving ? <ArrowPathIcon style={{ width: 15, height: 15 }} /> : <CheckIcon style={{ width: 15, height: 15 }} />}
          {saving ? 'Saving…' : 'Save Persona'}
        </button>
      </PageHeader>

      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button key={t.key} className={`tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
              {t.label}
              {t.key === activeTab && dirty && <span style={{ marginLeft: 4, opacity: 0.7 }}>•</span>}
            </button>
          ))}
        </div>

        <div style={{
          fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14,
          background: 'var(--bg)', borderRadius: 8, padding: '10px 14px',
          borderLeft: '3px solid var(--accent)',
        }}>
          {activeHint}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            Loading persona files…
          </div>
        ) : (
          <textarea
            className="textarea"
            value={contents[activeTab] || ''}
            onChange={e => { setContents(prev => ({ ...prev, [activeTab]: e.target.value })); setDirty(true); }}
            placeholder={`Write your ${activeTab} persona here…`}
            style={{ minHeight: 400 }}
          />
        )}

        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {wordCount} words · {charCount} chars
          </span>
          {dirty && <span style={{ fontSize: 12, color: 'var(--warning)' }}>Unsaved changes</span>}
        </div>
      </div>
    </div>
  );
}
