'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SortField } from '@/lib/gallery';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { deleteMediaItems, fetchMediaPage } from './api';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';
import { Lightbox } from './Lightbox';
import { MediaGrid } from './MediaGrid';
import { Toasts, type ToastMessage } from './Toasts';
import { useDisplayName } from './useDisplayName';
import { useUploadQueue } from './useUploadQueue';
import { getOwnerToken, hasOwnerToken } from '@/lib/ownerTokens';
import type { ApiMediaItem, ViewMode } from './types';

const PAGE_SIZE = 30;
const POLL_INTERVAL_MS = 7000;

export function AlbumView({ slug }: { slug: string }) {
  const t = useTranslations('Album');
  const { displayName, setDisplayName } = useDisplayName();

  const SORT_OPTIONS: { value: SortField; label: string }[] = [
    { value: 'uploadTime', label: t('sortNewest') },
    { value: 'filename', label: t('sortFilename') },
    { value: 'type', label: t('sortType') },
    { value: 'size', label: t('sortSize') },
  ];
  const [items, setItems] = useState<ApiMediaItem[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [sortField, setSortField] = useState<SortField>('uploadTime');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  const isRefreshingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const itemsLengthRef = useRef(0);
  itemsLengthRef.current = items.length;
  const nextCursorRef = useRef<number | null>(null);
  nextCursorRef.current = nextCursor;
  const loadingMoreRef = useRef(false);
  const toastIdRef = useRef(0);

  const pushToast = useCallback((text: string, action?: ToastMessage['action']) => {
    const id = ++toastIdRef.current;
    setToasts((current) => [...current, { id, text, action }]);
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  useEffect(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
    fetchMediaPage(slug, { sort: sortField, cursor: 0, limit: PAGE_SIZE })
      .then((page) => {
        setItems(page.items);
        setNextCursor(page.nextCursor);
      })
      .catch(() => pushToast(t('galleryLoadFailed')));
  }, [slug, sortField, pushToast, t]);

  const refresh = useCallback(async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    try {
      const limit = Math.max(itemsLengthRef.current, PAGE_SIZE);
      const page = await fetchMediaPage(slug, { sort: sortField, cursor: 0, limit });
      setItems(page.items);
      setNextCursor(page.nextCursor);
    } catch {
      // Deliberately ignore polling errors silently, the next tick will retry.
    } finally {
      isRefreshingRef.current = false;
    }
  }, [slug, sortField]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  const loadMore = useCallback(async () => {
    if (nextCursorRef.current === null || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    try {
      const page = await fetchMediaPage(slug, {
        sort: sortField,
        cursor: nextCursorRef.current,
        limit: PAGE_SIZE,
      });
      setItems((current) => [...current, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch {
      pushToast(t('moreMediaLoadFailed'));
    } finally {
      loadingMoreRef.current = false;
    }
  }, [slug, sortField, pushToast, t]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        loadMore();
      }
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const handleItemUploaded = useCallback(() => {
    refresh();
  }, [refresh]);

  const handleAllSettled = useCallback(
    (
      { succeeded, failed }: { succeeded: number; failed: number },
      retry: () => void,
    ) => {
      if (failed === 0) {
        pushToast(t('allUploadsSucceeded'));
      } else {
        pushToast(t('uploadsSummary', { succeeded, total: succeeded + failed, failed }), {
          label: t('retry'),
          onClick: retry,
        });
      }
    },
    [pushToast, t],
  );

  const { state: uploadState, enqueue, cancel: cancelUpload } = useUploadQueue({
    slug,
    uploaderName: displayName,
    onItemUploaded: handleItemUploaded,
    onAllSettled: handleAllSettled,
  });

  const handleFilesSelected = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    enqueue(Array.from(fileList));
  };

  const selectableIds = useMemo(
    () => new Set(items.filter((item) => hasOwnerToken(item.id)).map((item) => item.id)),
    [items],
  );

  const handleEnterSelectionMode = (id: string) => {
    if (!selectableIds.has(id)) {
      pushToast(t('onlyOwnUploadsDeletable'));
      return;
    }
    setSelectionMode(true);
    setSelectedIds(new Set([id]));
  };

  const handleToggleSelect = (id: string) => {
    if (!selectableIds.has(id)) return;
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      if (next.size === 0) setSelectionMode(false);
      return next;
    });
  };

  const handleConfirmDelete = async () => {
    setConfirmingDelete(false);
    const ids = Array.from(selectedIds);
    const ownerTokens = Object.fromEntries(
      ids.map((id) => [id, getOwnerToken(id)]).filter((entry): entry is [string, string] => Boolean(entry[1])),
    );
    try {
      await deleteMediaItems(slug, ids, ownerTokens);
      setSelectionMode(false);
      setSelectedIds(new Set());
      await refresh();
    } catch {
      pushToast(t('deleteFailed'));
    }
  };

  const totalInBatch = uploadState.items.length;
  const settledCount = uploadState.items.filter(
    (item) => item.status !== 'pending' && item.status !== 'uploading',
  ).length;
  const uploadingItem = uploadState.items.find((item) => item.status === 'uploading');
  const isUploading = uploadState.items.some(
    (item) => item.status === 'pending' || item.status === 'uploading',
  );
  const overallProgress =
    totalInBatch === 0
      ? 0
      : Math.round(((settledCount + (uploadingItem ? uploadingItem.progress / 100 : 0)) / totalInBatch) * 100);

  return (
    <main style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', paddingBottom: '96px' }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          background: 'var(--color-bg)',
          borderBottom: '1px solid var(--color-border)',
          padding: '12px 16px',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <h1 style={{ fontSize: '1.1rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {slug}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <LanguageSwitcher />
          {editingName ? (
            <input
              autoFocus
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              onBlur={() => {
                setDisplayName(nameDraft);
                setEditingName(false);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  setDisplayName(nameDraft);
                  setEditingName(false);
                }
              }}
              style={{
                fontSize: '0.85rem',
                padding: '4px 8px',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                width: '140px',
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setNameDraft(displayName);
                setEditingName(true);
              }}
              style={{
                fontSize: '0.8rem',
                color: 'var(--color-text-muted)',
                background: 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: '999px',
                padding: '4px 10px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              👤 {displayName || '…'}
            </button>
          )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={sortField}
            onChange={(event) => setSortField(event.target.value as SortField)}
            style={{
              padding: '6px 8px',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              fontSize: '0.85rem',
            }}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setViewMode((mode) => (mode === 'grid' ? 'list' : 'grid'))}
            style={secondaryButtonStyle}
          >
            {viewMode === 'grid' ? t('viewList') : t('viewGrid')}
          </button>

          {selectionMode ? (
            <>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                {t('selectedCount', { count: selectedIds.size })}
              </span>
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                disabled={selectedIds.size === 0}
                style={{ ...secondaryButtonStyle, color: 'var(--color-danger)' }}
              >
                {t('delete')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectionMode(false);
                  setSelectedIds(new Set());
                }}
                style={secondaryButtonStyle}
              >
                {t('cancel')}
              </button>
            </>
          ) : null}
        </div>
      </header>

      <div style={{ flex: 1 }}>
        {items.length === 0 && !isUploading ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              gap: '8px',
              padding: '48px 24px',
              color: 'var(--color-text-muted)',
            }}
          >
            <span style={{ fontSize: '2rem' }}>📷</span>
            <p style={{ margin: 0 }}>{t('emptyTitle')}</p>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>{t('emptyHint')}</p>
          </div>
        ) : (
          <MediaGrid
            slug={slug}
            items={items}
            viewMode={viewMode}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            selectableIds={selectableIds}
            onOpen={setLightboxIndex}
            onToggleSelect={handleToggleSelect}
            onEnterSelectionMode={handleEnterSelectionMode}
          />
        )}
        <div ref={sentinelRef} style={{ height: 1 }} />
      </div>

      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          background: 'var(--color-surface)',
          borderTop: '1px solid var(--color-border)',
          padding: '12px 16px calc(12px + env(safe-area-inset-bottom, 0px))',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {isUploading ? (
          <>
            <div style={{ height: '6px', borderRadius: '999px', background: 'var(--color-border)', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${overallProgress}%`,
                  background: 'var(--color-accent)',
                  transition: 'width 150ms ease',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                {t('uploading', { settled: settledCount, total: totalInBatch })}
              </span>
              <button type="button" onClick={cancelUpload} style={secondaryButtonStyle}>
                {t('cancel')}
              </button>
            </div>
          </>
        ) : (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              style={{ display: 'none' }}
              onChange={(event) => {
                handleFilesSelected(event.target.files);
                event.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: 'var(--color-accent)',
                color: 'var(--color-accent-contrast)',
                border: 'none',
                borderRadius: 'var(--radius)',
                padding: '12px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {t('uploadButton')}
            </button>
          </>
        )}
      </div>

      {lightboxIndex !== null ? (
        <Lightbox
          slug={slug}
          items={items}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      ) : null}

      {confirmingDelete ? (
        <ConfirmDeleteDialog
          count={selectedIds.size}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={handleConfirmDelete}
        />
      ) : null}

      <Toasts toasts={toasts} />
    </main>
  );
}

const secondaryButtonStyle = {
  padding: '6px 10px',
  borderRadius: '8px',
  border: '1px solid var(--color-border)',
  background: 'transparent',
  color: 'var(--color-text)',
  fontSize: '0.85rem',
  cursor: 'pointer',
} as const;
