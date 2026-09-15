'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { useEffect, useRef } from 'react';
import type { ApiMediaItem } from './types';

interface LightboxProps {
  slug: string;
  items: ApiMediaItem[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

const SWIPE_THRESHOLD = 50;

export function Lightbox({ slug, items, index, onClose, onNavigate }: LightboxProps) {
  const t = useTranslations('Lightbox');
  const item = items[index];
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft' && index > 0) onNavigate(index - 1);
      if (event.key === 'ArrowRight' && index < items.length - 1) onNavigate(index + 1);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [index, items.length, onClose, onNavigate]);

  if (!item) return null;

  const displayUrl = `/api/albums/${slug}/media/${item.id}/display`;
  const originalUrl = `/api/albums/${slug}/media/${item.id}/original`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        if (touchStartX.current === null) return;
        const deltaX = (event.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
        touchStartX.current = null;
        if (deltaX > SWIPE_THRESHOLD && index > 0) onNavigate(index - 1);
        if (deltaX < -SWIPE_THRESHOLD && index < items.length - 1) onNavigate(index + 1);
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.92)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={t('close')}
        style={closeButtonStyle}
      >
        ✕
      </button>

      <a
        href={originalUrl}
        download
        style={{ ...navButtonStyle, right: 16, left: 'auto', top: 16, bottom: 'auto', textDecoration: 'none' }}
        aria-label={t('downloadOriginal')}
      >
        ⬇︎
      </a>

      {index > 0 ? (
        <button
          type="button"
          onClick={() => onNavigate(index - 1)}
          aria-label={t('previous')}
          style={{ ...navButtonStyle, left: 8 }}
        >
          ‹
        </button>
      ) : null}

      {index < items.length - 1 ? (
        <button
          type="button"
          onClick={() => onNavigate(index + 1)}
          aria-label={t('next')}
          style={{ ...navButtonStyle, right: 8 }}
        >
          ›
        </button>
      ) : null}

      <div
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        {item.type === 'VIDEO' ? (
          <video
            key={item.id}
            src={displayUrl}
            controls
            autoPlay
            style={{ maxWidth: '92vw', maxHeight: '78vh' }}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={item.id}
            src={displayUrl}
            alt={item.filename}
            style={{ maxWidth: '92vw', maxHeight: '78vh', objectFit: 'contain' }}
          />
        )}
        <div style={{ color: '#e5e5e5', fontSize: '0.85rem', textAlign: 'center' }}>
          {item.filename} · {item.uploaderName}
        </div>
      </div>
    </div>
  );
}

const navButtonStyle: CSSProperties = {
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  width: 44,
  height: 44,
  borderRadius: '50%',
  border: 'none',
  background: 'rgba(255,255,255,0.15)',
  color: '#fff',
  fontSize: '1.5rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};

const closeButtonStyle: CSSProperties = {
  position: 'absolute',
  top: 16,
  left: 16,
  width: 40,
  height: 40,
  borderRadius: '50%',
  border: 'none',
  background: 'rgba(255,255,255,0.15)',
  color: '#fff',
  fontSize: '1.1rem',
  cursor: 'pointer',
};
