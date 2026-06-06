'use client';
import { XMarkIcon, CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import type { Toast } from '@/lib/types';

// Toast backgrounds are always dark so white text stays legible in both themes
const TOAST_BG = {
  success: '#16A34A',
  error:   '#DC2626',
  info:    '#374151',
} as const;

export function ToastContainer({
  toasts,
  remove,
}: {
  toasts: Toast[];
  remove: (id: number) => void;
}) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {toasts.map(t => (
        <div key={t.id} className="fade-in" style={{
          background: TOAST_BG[t.type],
          color: 'white', borderRadius: 10, padding: '12px 18px',
          fontSize: 14, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          minWidth: 240, maxWidth: 360,
        }}>
          {t.type === 'success' && <CheckIcon style={{ width: 16, height: 16, flexShrink: 0 }} />}
          {t.type === 'error' && <ExclamationTriangleIcon style={{ width: 16, height: 16, flexShrink: 0 }} />}
          <span style={{ flex: 1 }}>{t.message}</span>
          <button
            onClick={() => remove(t.id)}
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 0, opacity: 0.7 }}
          >
            <XMarkIcon style={{ width: 14, height: 14 }} />
          </button>
        </div>
      ))}
    </div>
  );
}
