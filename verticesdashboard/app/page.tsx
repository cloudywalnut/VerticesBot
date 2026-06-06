'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar }       from '@/components/Sidebar';
import { TopBar }        from '@/components/TopBar';
import { ToastContainer } from '@/components/ToastContainer';
import { HomeView }      from '@/components/views/HomeView';
import { ChatsView }     from '@/components/views/ChatsView';
import { PersonaView }   from '@/components/views/PersonaView';
import { MemoryView }    from '@/components/views/MemoryView';
import { PauseView }     from '@/components/views/PauseView';
import { ImagesView }    from '@/components/views/ImagesView';
import { SettingsView }  from '@/components/views/SettingsView';
import { useIsMobile }   from '@/hooks/useIsMobile';
import type { View, WaState, Toast } from '@/lib/types';

export default function Page() {
  const [activeView, setActiveView]             = useState<View>('home');
  const [isDark, setIsDark]                     = useState(false);
  const [waState, setWaState]                   = useState<WaState>(null);
  const [toasts, setToasts]                     = useState<Toast[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      <Sidebar
        active={activeView}
        setActive={setActiveView}
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
          activeView={activeView}
          waState={waState}
          onMenuClick={() => setMobileSidebarOpen(true)}
          isMobile={isMobile}
        />

        <main style={{ flex: 1, overflowY: 'auto', padding: isMobile ? 16 : 28 }}>
          {activeView === 'home'     && <HomeView     addToast={addToast} isMobile={isMobile} />}
          {activeView === 'chats'    && <ChatsView    addToast={addToast} isMobile={isMobile} />}
          {activeView === 'persona'  && <PersonaView  addToast={addToast} />}
          {activeView === 'memory'   && <MemoryView   addToast={addToast} />}
          {activeView === 'pause'    && <PauseView    addToast={addToast} />}
          {activeView === 'images'   && <ImagesView   addToast={addToast} isMobile={isMobile} />}
          {activeView === 'settings' && <SettingsView addToast={addToast} />}
        </main>
      </div>

      <ToastContainer toasts={toasts} remove={removeToast} />
    </div>
  );
}
