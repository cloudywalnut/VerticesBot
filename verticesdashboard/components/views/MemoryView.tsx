'use client';
import { useState, useEffect } from 'react';
import { ArrowPathIcon, CheckIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '@/components/PageHeader';
import type { AddToast } from '@/lib/types';

const TABS = [
  {
    key: 'temp',
    label: 'Temporary Memory',
    hint: 'Temporary memory — rules, promotions, or context that may change over time.',
    placeholder: 'Current promotions, temporary rules, recent context…',
  },
  {
    key: 'perm',
    label: 'Permanent Memory',
    hint: 'Permanent memory — fixed facts like company name, locations, contact details.',
    placeholder: 'Company name, address, boss details, fixed business info…',
  },
];

export function MemoryView({ addToast }: { addToast: AddToast }) {
  const [activeTab, setActiveTab] = useState('temp');
  const [contents, setContents]   = useState<Record<string, string>>({});
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [dirty, setDirty]         = useState(false);

  useEffect(() => {
    fetch('/api/memory').then(r => r.json()).then(d => {
      setContents(d);
      setLoading(false);
    });
  }, []);

  const save = async () => {
    setSaving(true);
    const r = await fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: activeTab, content: contents[activeTab] || '' }),
    });
    const d = await r.json();
    if (d.ok) { addToast('Memory saved', 'success'); setDirty(false); }
    else addToast(d.error || 'Save failed', 'error');
    setSaving(false);
  };

  const activeConfig = TABS.find(t => t.key === activeTab)!;
  const wordCount    = (contents[activeTab] || '').split(/\s+/).filter(Boolean).length;

  return (
    <div className="fade-in">
      <PageHeader title="Memory" subtitle="Contextual knowledge injected into every conversation">
        <button className="btn-primary" onClick={save} disabled={saving || !dirty}>
          {saving ? <ArrowPathIcon style={{ width: 15, height: 15 }} /> : <CheckIcon style={{ width: 15, height: 15 }} />}
          {saving ? 'Saving…' : 'Save Memory'}
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
          {activeConfig.hint}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            Loading memory files…
          </div>
        ) : (
          <textarea
            className="textarea"
            value={contents[activeTab] || ''}
            onChange={e => { setContents(prev => ({ ...prev, [activeTab]: e.target.value })); setDirty(true); }}
            placeholder={activeConfig.placeholder}
            style={{ minHeight: 320 }}
          />
        )}

        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{wordCount} words</span>
          {dirty && <span style={{ fontSize: 12, color: 'var(--warning)' }}>Unsaved changes</span>}
        </div>
      </div>
    </div>
  );
}
