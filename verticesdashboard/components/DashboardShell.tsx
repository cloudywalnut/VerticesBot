'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar }        from '@/components/Sidebar';
import { TopBar }         from '@/components/TopBar';
import { ToastContainer } from '@/components/ToastContainer';
import { useIsMobile }    from '@/hooks/useIsMobile';
import { DashboardContext } from '@/lib/DashboardContext';
import type { WaState, Toast } from '@/lib/types';

// ── Accent color helpers ──────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function darkenHex(hex: string, amount = 0.12): string {
  return '#' + hexToRgb(hex)
    .map(v => Math.max(0, Math.round(v * (1 - amount))).toString(16).padStart(2, '0'))
    .join('');
}

function applyAccent(hex: string) {
  const [r, g, b] = hexToRgb(hex);
  const root = document.documentElement;
  root.style.setProperty('--accent',       hex);
  root.style.setProperty('--accent-rgb',   `${r}, ${g}, ${b}`);
  root.style.setProperty('--accent-hover', darkenHex(hex));
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark]                       = useState(false);
  const [accentColor, setAccentColor]             = useState('#F13223');
  const [waState, setWaState]                     = useState<WaState>(null);
  const [toasts, setToasts]                       = useState<Toast[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed]   = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const isMobile   = useIsMobile();
  const toastIdRef = useRef(0);

  useEffect(() => {
    const stored = localStorage.getItem('vertices-theme');
    if (stored === 'dark') {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }

    // Load accent color from settings
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        const color = d.settings?.ACCENT_COLOR;
        if (color) { applyAccent(color); setAccentColor(color); }
      })
      .catch(() => {});
  }, []);

  const changeAccent = useCallback((hex: string) => {
    applyAccent(hex);
    setAccentColor(hex);
    fetch('/api/settings', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ updates: { ACCENT_COLOR: hex } }),
    }).catch(() => {});
  }, []);

  const toggleTheme = () => {
    setIsDark(prev => {
      const next = !prev;
      document.documentElement.classList.toggle('dark', next);
      localStorage.setItem('vertices-theme', next ? 'dark' : 'light');
      return next;
    });
  };

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    const poll = async () => {
      try {
        const r = await fetch('/api/bot/status');
        const d = await r.json();
        setWaState(d.running ? (d.waState ?? null) : null);
      } catch { setWaState(null); }
    };
    poll();
    const t = setInterval(poll, 15000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!isMobile) setMobileSidebarOpen(false);
  }, [isMobile]);

  return (
    <DashboardContext.Provider value={{ addToast, isMobile }}>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
        <Sidebar
          isDark={isDark}
          toggleTheme={toggleTheme}
          waState={waState}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(v => !v)}
          mobileOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
          isMobile={isMobile}
          accentColor={accentColor}
          onAccentChange={changeAccent}
        />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <TopBar
            waState={waState}
            onMenuClick={() => setMobileSidebarOpen(true)}
            isMobile={isMobile}
          />
          <main style={{ flex: 1, overflowY: 'auto', padding: isMobile ? 16 : 28 }}>
            {children}
          </main>
        </div>

        <ToastContainer toasts={toasts} remove={removeToast} />
      </div>
    </DashboardContext.Provider>
  );
}
