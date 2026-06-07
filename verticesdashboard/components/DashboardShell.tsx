'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar }        from '@/components/Sidebar';
import { TopBar }         from '@/components/TopBar';
import { ToastContainer } from '@/components/ToastContainer';
import { useIsMobile }    from '@/hooks/useIsMobile';
import { DashboardContext } from '@/lib/DashboardContext';
import type { WaState, Toast } from '@/lib/types';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark]                       = useState(false);
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
