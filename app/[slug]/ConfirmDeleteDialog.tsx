'use client';

import { useTranslations } from 'next-intl';

interface ConfirmDeleteDialogProps {
  count: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDeleteDialog({ count, onCancel, onConfirm }: ConfirmDeleteDialogProps) {
  const t = useTranslations('ConfirmDelete');

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 110,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius)',
          padding: '20px',
          maxWidth: '360px',
          width: '100%',
        }}
      >
        <p style={{ margin: '0 0 16px', fontSize: '0.95rem' }}>
          {count === 1 ? t('single') : t('multiple', { count })}
        </p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              background: 'transparent',
              color: 'var(--color-text)',
              cursor: 'pointer',
            }}
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--color-danger)',
              color: 'var(--color-danger-contrast)',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {t('delete')}
          </button>
        </div>
      </div>
    </div>
  );
}
