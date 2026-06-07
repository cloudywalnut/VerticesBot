'use client';
import { useState, useEffect } from 'react';
import { PhoneIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '@/components/PageHeader';
import type { AddToast } from '@/lib/types';

type PauseData = { paused: string[]; global: boolean };

export function PauseView({ addToast }: { addToast: AddToast }) {
  const [data, setData]         = useState<PauseData>({ paused: [], global: false });
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [newPhone, setNewPhone] = useState('');

  useEffect(() => {
    fetch('/api/pause').then(r => r.json()).then(d => {
      setData(d);
      setLoading(false);
    });
  }, []);

  const persist = async (next: PauseData) => {
    setSaving(true);
    await fetch('/api/pause', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    });
    setSaving(false);
  };

  const toggleGlobal = async () => {
    const next = { ...data, global: !data.global };
    setData(next);
    await persist(next);
    addToast(next.global ? 'Global pause activated' : 'Global pause deactivated', next.global ? 'info' : 'success');
  };

  const addPhone = async () => {
    const phone = newPhone.replace(/\D/g, '');
    if (!phone) return;
    if (data.paused.includes(phone)) { addToast('Number already in list', 'error'); return; }
    const next = { ...data, paused: [...data.paused, phone] };
    setData(next);
    await persist(next);
    addToast(`Paused +${phone}`, 'success');
    setNewPhone('');
  };

  const removePhone = async (phone: string) => {
    const next = { ...data, paused: data.paused.filter(p => p !== phone) };
    setData(next);
    await persist(next);
    addToast(`Unpaused +${phone}`, 'info');
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>Loading…</div>;
  }

  return (
    <div className="fade-in">
      <PageHeader title="Paused Users" subtitle="Control who the bot responds to" />

      {/* Global pause */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>Global Pause</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
              {data.global
                ? 'Bot is paused for everyone. Only the boss can interact.'
                : 'Bot is active and responding to all non-paused users.'}
            </div>
          </div>
          <button
            onClick={toggleGlobal}
            disabled={saving}
            style={{
              width: 52, height: 28, borderRadius: 99, border: 'none', cursor: 'pointer', flexShrink: 0,
              background: data.global ? 'var(--danger)' : 'var(--success)',
              position: 'relative', transition: 'background 0.2s',
            }}
          >
            <span style={{
              position: 'absolute', top: 3, left: data.global ? 27 : 3,
              width: 22, height: 22, borderRadius: '50%',
              background: 'white', transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </button>
        </div>

        {data.global && (
          <div style={{
            marginTop: 14, padding: '10px 14px',
            background: 'var(--danger-muted)', borderRadius: 8,
            border: '1px solid var(--danger-border)',
          }}>
            <span style={{ fontSize: 13, color: 'var(--danger-text)', fontWeight: 500 }}>
              Global pause is ON — the bot is not replying to anyone
            </span>
          </div>
        )}
      </div>

      {/* Individual paused numbers */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
            Individually Paused Users
          </span>
          {data.paused.length > 0 && (
            <span className="badge badge-orange">{data.paused.length}</span>
          )}
        </div>

        <div style={{
          marginBottom: 18, padding: '10px 14px',
          background: 'var(--accent-muted)', border: '1px solid var(--accent-border)',
          borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5,
        }}>
          <strong style={{ color: 'var(--text)' }}>How to get a WhatsApp ID:</strong> When the bot sends you a sales or abuse notification, it includes the user&apos;s WhatsApp ID. Most users will appear as a ID (e.g. <code style={{ fontSize: 12 }}>123456789012345</code>). Copy the full ID from the notification and paste it below.
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <input
            className="input"
            placeholder="WhatsApp ID from notification (e.g. 123456789012345)"
            value={newPhone}
            onChange={e => setNewPhone(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addPhone()}
          />
          <button className="btn-primary" onClick={addPhone} style={{ flexShrink: 0, padding: '9px 16px' }}>
            <PlusIcon style={{ width: 15, height: 15 }} /> Add
          </button>
        </div>

        {data.paused.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '30px 0' }}>
            No individually paused numbers
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.paused.map(phone => (
              <div key={phone} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', background: 'var(--bg)', borderRadius: 8,
                border: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <PhoneIcon style={{ width: 16, height: 16, color: 'var(--text-muted)' }} />
                  <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>+{phone}</span>
                </div>
                <button onClick={() => removePhone(phone)} className="btn-secondary" style={{ padding: '5px 12px', fontSize: 13 }}>
                  <XMarkIcon style={{ width: 14, height: 14 }} /> Unpause
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
