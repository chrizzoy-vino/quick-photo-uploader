'use client';

export interface ToastMessage {
  id: number;
  text: string;
  action?: { label: string; onClick: () => void };
}

export function Toasts({ toasts }: { toasts: ToastMessage[] }) {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 50,
        width: 'min(92vw, 420px)',
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            background: 'var(--color-text)',
            color: 'var(--color-bg)',
            borderRadius: 'var(--radius)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            fontSize: '0.9rem',
          }}
        >
          <span>{toast.text}</span>
          {toast.action ? (
            <button
              onClick={toast.action.onClick}
              style={{
                background: 'transparent',
                color: 'var(--color-accent)',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {toast.action.label}
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
