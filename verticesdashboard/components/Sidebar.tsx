'use client';
import Image from 'next/image';
import {
  HomeIcon, ChatBubbleLeftRightIcon, UserCircleIcon, CircleStackIcon,
  Cog6ToothIcon, PauseIcon, PhotoIcon, SunIcon, MoonIcon,
  ChevronLeftIcon, ChevronRightIcon, XMarkIcon,
} from '@heroicons/react/24/outline';
import type { View, WaState } from '@/lib/types';

const NAV_ITEMS: { id: View; label: string; Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }[] = [
  { id: 'home',     label: 'Dashboard',    Icon: HomeIcon },
  { id: 'chats',    label: 'Chat History', Icon: ChatBubbleLeftRightIcon },
  { id: 'persona',  label: 'Persona',      Icon: UserCircleIcon },
  { id: 'memory',   label: 'Memory',       Icon: CircleStackIcon },
  { id: 'pause',    label: 'Paused Users', Icon: PauseIcon },
  { id: 'images',   label: 'Images',       Icon: PhotoIcon },
  { id: 'settings', label: 'Settings',     Icon: Cog6ToothIcon },
];

interface SidebarProps {
  active: View;
  setActive: (v: View) => void;
  isDark: boolean;
  toggleTheme: () => void;
  waState: WaState;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onClose: () => void;
  isMobile: boolean;
}

export function Sidebar({
  active, setActive, isDark, toggleTheme, waState,
  collapsed, onToggleCollapse, mobileOpen, onClose, isMobile,
}: SidebarProps) {
  const isOnline = waState === 'open';
  const slim = collapsed && !isMobile;
  const width = isMobile ? 260 : (collapsed ? 60 : 220);

  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && mobileOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 99,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)',
          }}
        />
      )}

      <aside style={{
        width, minWidth: width,
        background: 'var(--sidebar-bg)',
        display: 'flex', flexDirection: 'column',
        height: '100vh',
        position: isMobile ? 'fixed' : 'relative',
        top: 0, left: isMobile ? (mobileOpen ? 0 : -260) : 0,
        zIndex: isMobile ? 100 : 1,
        flexShrink: 0,
        transition: 'width 0.2s ease, left 0.25s ease',
        overflow: 'hidden',
      }}>

        {/* Logo + collapse toggle */}
        <div style={{
          padding: slim ? '22px 0 16px' : '22px 18px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center',
          justifyContent: slim ? 'center' : 'space-between',
        }}>
          {slim ? (
            <Image src="/V-White-NOBG.png" alt="Vertices" width={28} height={28} style={{ objectFit: 'contain' }} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden', flex: 1 }}>
              <Image src="/V-White-NOBG.png" alt="Vertices" width={28} height={28} style={{ objectFit: 'contain', flexShrink: 0 }} />
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                  Vertices.AI
                </div>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Admin Panel</div>
              </div>
            </div>
          )}

          {!isMobile && (
            <button
              onClick={onToggleCollapse}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: slim ? 0 : '0 0 0 8px', flexShrink: 0 }}
            >
              {collapsed
                ? <ChevronRightIcon style={{ width: 15, height: 15 }} />
                : <ChevronLeftIcon style={{ width: 15, height: 15 }} />}
            </button>
          )}

          {isMobile && (
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: 4 }}>
              <XMarkIcon style={{ width: 18, height: 18 }} />
            </button>
          )}
        </div>

        {/* Bot status pill — hidden when slim */}
        {!slim && (
          <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '8px 12px',
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: isOnline ? 'var(--success)' : waState === 'close' ? 'var(--warning)' : 'var(--neutral-text)',
              }} className={isOnline ? 'pulse-green' : ''} />
              <span style={{
                fontSize: 12.5, fontWeight: 500,
                color: isOnline ? 'var(--success-light)' : 'rgba(255,255,255,0.45)',
              }}>
                {isOnline ? 'Bot Online' : waState === 'close' ? 'Reconnecting…' : 'Bot Offline'}
              </span>
            </div>
          </div>
        )}

        {/* Nav items */}
        <nav style={{ flex: 1, padding: slim ? '12px 6px' : '12px 10px', overflowY: 'auto' }}>
          {NAV_ITEMS.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`nav-item ${active === id ? 'active' : ''}`}
              onClick={() => { setActive(id); if (isMobile) onClose(); }}
              title={slim ? label : undefined}
              style={slim ? { justifyContent: 'center', padding: 10, marginBottom: 4 } : {}}
            >
              <Icon className="nav-icon" style={{ width: 18, height: 18, flexShrink: 0 }} />
              {!slim && label}
            </button>
          ))}
        </nav>

        {/* Theme toggle */}
        <div style={{ padding: slim ? '12px 6px' : '12px 10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            className="nav-item"
            onClick={toggleTheme}
            title={slim ? (isDark ? 'Light Mode' : 'Dark Mode') : undefined}
            style={{ width: '100%', ...(slim ? { justifyContent: 'center', padding: 10 } : {}) }}
          >
            {isDark
              ? <SunIcon style={{ width: 18, height: 18 }} />
              : <MoonIcon style={{ width: 18, height: 18 }} />}
            {!slim && (isDark ? 'Light Mode' : 'Dark Mode')}
          </button>
        </div>
      </aside>
    </>
  );
}
