'use client';
import { Bars3Icon } from '@heroicons/react/24/outline';
import type { View, WaState } from '@/lib/types';

const TITLES: Record<View, string> = {
  home:     'Dashboard',
  chats:    'Chat History',
  persona:  'Persona',
  memory:   'Memory',
  pause:    'Paused Users',
  images:   'Images',
  settings: 'Settings',
};

interface TopBarProps {
  activeView: View;
  waState: WaState;
  onMenuClick: () => void;
  isMobile: boolean;
}

export function TopBar({ activeView, waState, onMenuClick, isMobile }: TopBarProps) {
  const isOnline = waState === 'open';

  return (
    <header style={{
      height: 56, flexShrink: 0,
      display: 'flex', alignItems: 'center',
      padding: '0 20px', gap: 12,
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
    }}>
      {isMobile && (
        <button
          onClick={onMenuClick}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', padding: 4, flexShrink: 0 }}
        >
          <Bars3Icon style={{ width: 22, height: 22 }} />
        </button>
      )}

      <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
        {TITLES[activeView]}
      </span>

      <div style={{ marginLeft: 'auto' }}>
        <span className={`badge ${isOnline ? 'badge-green' : 'badge-gray'}`}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: isOnline ? 'var(--success)' : 'var(--neutral-text)',
          }} />
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>
    </header>
  );
}
