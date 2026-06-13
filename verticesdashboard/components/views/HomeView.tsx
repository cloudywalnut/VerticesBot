'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  PlayIcon, StopIcon, ArrowPathIcon, ClockIcon,
  PhoneIcon, EyeIcon, EyeSlashIcon,
} from '@heroicons/react/24/outline';
import type { AddToast, WaState } from '@/lib/types';

type StatusData = { running: boolean; waState: WaState; uptime: number | null };

export function HomeView({ addToast, isMobile }: { addToast: AddToast; isMobile: boolean }) {
  const [status, setStatus]   = useState<StatusData | null>(null);
  const [qrSrc, setQrSrc]     = useState(`/api/qr?t=${Date.now()}`);
  const [showQr, setShowQr]   = useState(true);
  const [busy, setBusy]       = useState(false);

  const { running, waState, uptime } = status ?? { running: false, waState: null, uptime: null };

  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch('/api/bot/status');
      setStatus(await r.json());
    } catch { setStatus({ running: false, waState: null, uptime: null }); }
  }, []);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 15000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  // Auto-refresh QR image in sync with Baileys' ~20s rotation
  useEffect(() => {
    if (waState !== 'qr') return;
    const id = setInterval(() => setQrSrc(`/api/qr?t=${Date.now()}`), 5_000);
    return () => clearInterval(id);
  }, [waState]);

  const startBot = async () => {
    setBusy(true);
    try {
      const r = await fetch('/api/bot/start', { method: 'POST' });
      const d = await r.json();
      if (d.ok) { setQrSrc(`/api/qr?t=${Date.now()}`); addToast('Bot started — scan QR to connect', 'success'); }
      else addToast(d.message || 'Failed to start bot', 'error');
    } catch { addToast('Failed to start bot', 'error'); }
    finally { await fetchStatus(); setBusy(false); }
  };

  const stopBot = async () => {
    setBusy(true);
    try {
      const r = await fetch('/api/bot/stop', { method: 'POST' });
      const d = await r.json();
      if (d.ok) addToast('Bot stopped', 'info');
      else addToast(d.message || 'Failed to stop bot', 'error');
    } catch { addToast('Failed to stop bot', 'error'); }
    finally { await fetchStatus(); setBusy(false); }
  };

  const restartBot = async () => {
    setBusy(true);
    try {
      const r = await fetch('/api/bot/restart', { method: 'POST' });
      const d = await r.json();
      if (d.ok) { setQrSrc(`/api/qr?t=${Date.now()}`); addToast('Bot restarted — scan new QR to connect', 'info'); }
      else addToast(d.message || 'Failed to restart bot', 'error');
    } catch { addToast('Failed to restart bot', 'error'); }
    finally { await fetchStatus(); setBusy(false); }
  };

  const uiLabel = !status          ? 'Checking…'
    : !running                     ? 'Offline'
    : waState === 'open'           ? 'Online'
    : waState === 'close'          ? 'Reconnecting…'
    : waState === 'qr'             ? 'Scan QR'
    : /* running, no waState yet */ 'Starting…';

  const dotColor = waState === 'open' ? 'var(--success)'
    : !running                        ? 'var(--danger)'
    : 'var(--warning)';

  const formatUptime = (s: number) => {
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
    return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Dashboard</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Monitor and control your WhatsApp AI bot
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '380px 1fr', gap: 20, alignItems: 'start' }}>

        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Status */}
          <div className="card" style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
              Bot Status
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: dotColor }}
                className={waState === 'open' ? 'pulse-green' : ''} />
              <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{uiLabel}</span>
            </div>
          </div>

          {/* Uptime */}
          <div className="card" style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
              Uptime
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ClockIcon style={{ width: 20, height: 20, color: uptime ? 'var(--accent)' : 'var(--text-muted)' }} />
              <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>
                {uptime ? formatUptime(uptime) : '—'}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="card" style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
              Controls
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-primary" onClick={startBot} disabled={running || busy} style={{ flex: 1, justifyContent: 'center' }}>
                <PlayIcon style={{ width: 15, height: 15 }} /> Start
              </button>
              <button className="btn-danger" onClick={stopBot} disabled={!running || busy} style={{ flex: 1, justifyContent: 'center' }}>
                <StopIcon style={{ width: 15, height: 15 }} /> Stop
              </button>
              <button className="btn-secondary" onClick={restartBot} disabled={busy} style={{ flex: 1, justifyContent: 'center' }}>
                <ArrowPathIcon style={{ width: 15, height: 15 }} /> Restart
              </button>
            </div>
          </div>

        </div>

        {/* Right column: QR */}
        <div className="card" style={{ padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text)' }}>WhatsApp QR Code</h2>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                {waState === 'open'
                  ? 'Bot is connected — no scan needed.'
                  : waState === 'qr'
                  ? 'Scan this QR code with WhatsApp to connect.'
                  : 'Start the bot to generate a QR code.'}
              </p>
            </div>
            {waState === 'qr' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-secondary" onClick={() => setQrSrc(`/api/qr?t=${Date.now()}`)} style={{ padding: '8px 14px' }}>
                  <ArrowPathIcon style={{ width: 15, height: 15 }} /> Refresh QR
                </button>
                <button className="btn-secondary" onClick={() => setShowQr(v => !v)} style={{ padding: '8px 14px' }}>
                  {showQr ? <EyeSlashIcon style={{ width: 15, height: 15 }} /> : <EyeIcon style={{ width: 15, height: 15 }} />}
                  {showQr ? 'Hide' : 'Show'}
                </button>
              </div>
            )}
          </div>

          {waState === 'open' ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <span className="badge badge-green" style={{ fontSize: 14, padding: '10px 24px', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} className="pulse-green" />
                Connected to WhatsApp
              </span>
            </div>
          ) : waState === 'qr' && showQr ? (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ position: 'relative', display: 'inline-block', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                  background: 'var(--accent)', opacity: 0.8, zIndex: 2,
                  animation: 'qr-scan 3s ease-in-out infinite',
                }} />
                <img src={qrSrc} alt="WhatsApp QR Code"
                  style={{ display: 'block', width: 260, height: 260, objectFit: 'contain', background: 'white' }} />
              </div>
            </div>
          ) : (
            <div style={{
              width: 260, height: 260, borderRadius: 12, margin: '0 auto',
              border: '2px dashed var(--border)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 12, color: 'var(--text-muted)',
            }}>
              <PhoneIcon style={{ width: 40, height: 40, opacity: 0.3 }} />
              <div style={{ textAlign: 'center', fontSize: 13 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  {waState === 'close' ? 'Reconnecting…' : 'No QR Available'}
                </div>
                <div>
                  {waState === 'close'
                    ? 'Bot is attempting to reconnect to WhatsApp.'
                    : 'Start the bot to generate a QR code.'}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
