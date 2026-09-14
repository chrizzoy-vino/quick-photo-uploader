'use client';

import type { PointerEvent as ReactPointerEvent } from 'react';
import { useRef } from 'react';
import type { ApiMediaItem, ViewMode } from './types';

const LONG_PRESS_MS = 500;
const MOVE_CANCEL_THRESHOLD = 10;

interface MediaGridProps {
  slug: string;
  items: ApiMediaItem[];
  viewMode: ViewMode;
  selectionMode: boolean;
  selectedIds: Set<string>;
  onOpen: (index: number) => void;
  onToggleSelect: (id: string) => void;
  onEnterSelectionMode: (id: string) => void;
}

export function MediaGrid({
  slug,
  items,
  viewMode,
  selectionMode,
  selectedIds,
  onOpen,
  onToggleSelect,
  onEnterSelectionMode,
}: MediaGridProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns:
          viewMode === 'grid' ? 'repeat(auto-fill, minmax(110px, 1fr))' : '1fr',
        gap: viewMode === 'grid' ? '4px' : '2px',
        padding: '4px',
      }}
    >
      {items.map((item, index) => (
        <MediaTile
          key={item.id}
          slug={slug}
          item={item}
          viewMode={viewMode}
          selected={selectedIds.has(item.id)}
          selectionMode={selectionMode}
          onOpen={() => onOpen(index)}
          onToggleSelect={() => onToggleSelect(item.id)}
          onEnterSelectionMode={() => onEnterSelectionMode(item.id)}
        />
      ))}
    </div>
  );
}

function MediaTile({
  slug,
  item,
  viewMode,
  selected,
  selectionMode,
  onOpen,
  onToggleSelect,
  onEnterSelectionMode,
}: {
  slug: string;
  item: ApiMediaItem;
  viewMode: ViewMode;
  selected: boolean;
  selectionMode: boolean;
  onOpen: () => void;
  onToggleSelect: () => void;
  onEnterSelectionMode: () => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressedRef = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handlePointerDown = (event: ReactPointerEvent) => {
    longPressedRef.current = false;
    startPos.current = { x: event.clientX, y: event.clientY };
    timerRef.current = setTimeout(() => {
      longPressedRef.current = true;
      onEnterSelectionMode();
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (event: ReactPointerEvent) => {
    const dx = event.clientX - startPos.current.x;
    const dy = event.clientY - startPos.current.y;
    if (Math.hypot(dx, dy) > MOVE_CANCEL_THRESHOLD) {
      clearTimer();
    }
  };

  const handlePointerUp = () => {
    clearTimer();
    if (longPressedRef.current) {
      return;
    }
    if (selectionMode) {
      onToggleSelect();
    } else {
      onOpen();
    }
  };

  const thumbnailUrl = `/api/albums/${slug}/media/${item.id}/thumbnail`;

  return (
    <button
      type="button"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={clearTimer}
      onContextMenu={(event) => event.preventDefault()}
      style={{
        position: 'relative',
        aspectRatio: viewMode === 'grid' ? '1 / 1' : undefined,
        display: 'flex',
        alignItems: 'center',
        gap: viewMode === 'list' ? '12px' : undefined,
        padding: viewMode === 'list' ? '8px' : 0,
        border: 'none',
        background: 'var(--color-surface)',
        cursor: 'pointer',
        overflow: 'hidden',
        borderRadius: viewMode === 'grid' ? '6px' : 0,
        textAlign: 'left',
        userSelect: 'none',
        touchAction: 'pan-y',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: viewMode === 'grid' ? '100%' : '64px',
          height: viewMode === 'grid' ? '100%' : '64px',
          flexShrink: 0,
        }}
      >
        {item.hasThumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt=""
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--color-border)',
              color: 'var(--color-text-muted)',
              fontSize: '1.5rem',
            }}
          >
            {item.type === 'VIDEO' ? '🎬' : '🖼️'}
          </div>
        )}

        {item.type === 'VIDEO' && item.hasThumbnail ? (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                width: viewMode === 'grid' ? 36 : 24,
                height: viewMode === 'grid' ? 36 : 24,
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: viewMode === 'grid' ? '1rem' : '0.7rem',
                paddingLeft: '2px',
              }}
            >
              ▶
            </div>
          </div>
        ) : null}
      </div>

      {viewMode === 'list' ? (
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: '0.9rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.filename}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            {formatSize(item.size)} · {item.uploaderName}
          </div>
        </div>
      ) : null}

      {selectionMode ? (
        <div
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 22,
            height: 22,
            borderRadius: '50%',
            border: '2px solid #fff',
            background: selected ? 'var(--color-accent)' : 'rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '0.75rem',
          }}
        >
          {selected ? '✓' : ''}
        </div>
      ) : null}
    </button>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
