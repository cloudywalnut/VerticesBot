'use client';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  HomeIcon, ChatBubbleLeftRightIcon, UserCircleIcon, CircleStackIcon,
  Cog6ToothIcon, PauseIcon, PhotoIcon, SunIcon, MoonIcon,
  ChevronLeftIcon, ChevronRightIcon, XMarkIcon, BeakerIcon,
  ArrowRightStartOnRectangleIcon,
} from '@heroicons/react/24/outline';
import type { WaState } from '@/lib/types';

const NAV_ITEMS: { id: string; label: string; href: string; Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }[] = [
  { id: 'home',     label: 'Dashboard',    href: '/',         Icon: HomeIcon },
  { id: 'chats',    label: 'Chat History', href: '/chats',    Icon: ChatBubbleLeftRightIcon },
  { id: 'persona',  label: 'Persona',      href: '/persona',  Icon: UserCircleIcon },
  { id: 'memory',   label: 'Memory',       href: '/memory',   Icon: CircleStackIcon },
  { id: 'pause',    label: 'Paused Users', href: '/pause',    Icon: PauseIcon },
  { id: 'images',   label: 'Images',       href: '/images',   Icon: PhotoIcon },
  { id: 'test-chat', label: 'Test Chat',    href: '/test-chat', Icon: BeakerIcon },
  { id: 'settings', label: 'Settings',     href: '/settings', Icon: Cog6ToothIcon },
];

const ACCENT_PRESETS = ['#F13223', '#2563EB', '#16A34A', '#7C3AED', '#EA580C', '#0891B2'];

interface SidebarProps {
  isDark: boolean;
  toggleTheme: () => void;
  waState: WaState;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onClose: () => void;
  isMobile: boolean;
  accentColor: string;
  onAccentChange: (hex: string) => void;
}

export function Sidebar({
  isDark, toggleTheme, waState,
  collapsed, onToggleCollapse, mobileOpen, onClose, isMobile,
  accentColor, onAccentChange,
}: SidebarProps) {
  const pathname = usePathname();
  const router   = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const activeId = pathname === '/' ? 'home' : pathname.slice(1).split('/')[0];

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
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>Admin Panel</div>
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
          {NAV_ITEMS.map(({ id, label, href, Icon }) => (
            <button
              key={id}
              className={`nav-item ${activeId === id ? 'active' : ''}`}
              onClick={() => { router.push(href); if (isMobile) onClose(); }}
              title={slim ? label : undefined}
              style={slim ? { justifyContent: 'center', padding: 10, marginBottom: 4 } : {}}
            >
              <Icon className="nav-icon" style={{ width: 18, height: 18, flexShrink: 0 }} />
              {!slim && label}
            </button>
          ))}
        </nav>

        {/* Accent color picker */}
        <div style={{ padding: slim ? '10px 6px' : '10px 14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {slim ? (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: accentColor, border: '2px solid rgba(255,255,255,0.25)' }} />
            </div>
          ) : (
            <>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
                Brand Color
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                {ACCENT_PRESETS.map(color => (
                  <button
                    key={color}
                    onClick={() => onAccentChange(color)}
                    title={color}
                    style={{
                      width: 18, height: 18, borderRadius: '50%', padding: 0,
                      background: color, border: 'none', cursor: 'pointer', flexShrink: 0,
                      outline: accentColor.toLowerCase() === color.toLowerCase() ? '2px solid white' : '2px solid transparent',
                      outlineOffset: 2,
                      transition: 'outline 0.15s',
                    }}
                  />
                ))}
                <label title="Custom color" style={{ width: 18, height: 18, borderRadius: '50%', cursor: 'pointer', flexShrink: 0, border: '1.5px dashed rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', lineHeight: 1 }}>+</span>
                  <input
                    type="color"
                    value={accentColor}
                    onChange={e => onAccentChange(e.target.value)}
                    style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                  />
                </label>
              </div>
            </>
          )}
        </div>

        {/* Theme toggle */}
        <div style={{ padding: slim ? '5px 0px' : '5px 0px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
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

        {/* Logout */}
        <div style={{ padding: slim ? '5px 0px' : '5px 0px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            className="nav-item"
            onClick={handleLogout}
            title={slim ? 'Sign out' : undefined}
            style={{ width: '100%', color: 'rgba(255,100,100,0.75)', ...(slim ? { justifyContent: 'center', padding: 10 } : {}) }}
          >
            <ArrowRightStartOnRectangleIcon style={{ width: 18, height: 18 }} />
            {!slim && 'Sign out'}
          </button>
        </div>
      </aside>
    </>
  );
}
