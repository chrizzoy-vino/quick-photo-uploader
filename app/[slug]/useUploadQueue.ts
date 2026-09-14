'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createEmptyUploadQueueState,
  uploadQueueReducer,
  type UploadQueueEvent,
  type UploadQueueState,
} from '@/lib/uploadQueue';

export interface UploadSettledSummary {
  succeeded: number;
  failed: number;
}

interface UseUploadQueueOptions {
  slug: string;
  uploaderName: string;
  onItemUploaded: () => void;
  /** `retry` re-queues the failed items from this batch; passed in so callers don't need to
   *  close over this hook's own `retryFailed` return value (which isn't available yet at the
   *  point this option is constructed). */
  onAllSettled: (summary: UploadSettledSummary, retry: () => void) => void;
}

export function useUploadQueue({
  slug,
  uploaderName,
  onItemUploaded,
  onAllSettled,
}: UseUploadQueueOptions) {
  const [state, setState] = useState<UploadQueueState>(createEmptyUploadQueueState());
  const startedIds = useRef(new Set<string>());
  const xhrByItemId = useRef(new Map<string, XMLHttpRequest>());
  const uploaderNameRef = useRef(uploaderName);
  uploaderNameRef.current = uploaderName;
  const wasActiveRef = useRef(false);
  const lastCounts = useRef({ succeeded: 0, failed: 0 });

  const dispatch = useCallback((event: UploadQueueEvent) => {
    setState((current) => uploadQueueReducer(current, event));
  }, []);

  const enqueue = useCallback(
    (files: File[]) => {
      dispatch({ type: 'ENQUEUE', files });
    },
    [dispatch],
  );

  const cancel = useCallback(() => {
    for (const xhr of xhrByItemId.current.values()) {
      xhr.abort();
    }
    dispatch({ type: 'CANCEL' });
  }, [dispatch]);

  const retryFailed = useCallback(() => {
    dispatch({ type: 'RETRY_FAILED' });
  }, [dispatch]);

  // Startet den tatsächlichen Netzwerk-Request, sobald der Reducer ein Item auf "uploading" setzt.
  useEffect(() => {
    const uploadingItem = state.items.find((item) => item.status === 'uploading');
    if (!uploadingItem || startedIds.current.has(uploadingItem.id)) {
      return;
    }
    startedIds.current.add(uploadingItem.id);

    const formData = new FormData();
    formData.append('uploaderName', uploaderNameRef.current);
    formData.append('file', uploadingItem.file);

    const xhr = new XMLHttpRequest();
    xhrByItemId.current.set(uploadingItem.id, xhr);
    xhr.open('POST', `/api/albums/${slug}/upload`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        dispatch({
          type: 'PROGRESS',
          id: uploadingItem.id,
          progress: Math.round((event.loaded / event.total) * 100),
        });
      }
    };
    xhr.onload = () => {
      xhrByItemId.current.delete(uploadingItem.id);
      if (xhr.status >= 200 && xhr.status < 300) {
        dispatch({ type: 'SUCCESS', id: uploadingItem.id });
        onItemUploaded();
      } else {
        dispatch({ type: 'FAILURE', id: uploadingItem.id, error: describeUploadError(xhr) });
      }
    };
    xhr.onerror = () => {
      xhrByItemId.current.delete(uploadingItem.id);
      dispatch({ type: 'FAILURE', id: uploadingItem.id, error: 'Netzwerkfehler' });
    };
    xhr.onabort = () => {
      xhrByItemId.current.delete(uploadingItem.id);
    };
    xhr.send(formData);
  }, [state.items, slug, dispatch, onItemUploaded]);

  // Meldet einen Sammel-Toast, sobald keine Datei mehr läuft/wartet.
  useEffect(() => {
    const isActive = state.items.some(
      (item) => item.status === 'pending' || item.status === 'uploading',
    );

    if (wasActiveRef.current && !isActive && state.items.length > 0) {
      const succeeded = state.items.filter((item) => item.status === 'success').length;
      const failed = state.items.filter((item) => item.status === 'failed').length;
      const deltaSucceeded = succeeded - lastCounts.current.succeeded;
      const deltaFailed = failed - lastCounts.current.failed;
      lastCounts.current = { succeeded, failed };

      if (deltaSucceeded > 0 || deltaFailed > 0) {
        onAllSettled({ succeeded: deltaSucceeded, failed: deltaFailed }, retryFailed);
      }
    }

    wasActiveRef.current = isActive;
  }, [state.items, onAllSettled, retryFailed]);

  return { state, enqueue, cancel, retryFailed };
}

function describeUploadError(xhr: XMLHttpRequest): string {
  try {
    const body = JSON.parse(xhr.responseText) as { error?: string };
    switch (body.error) {
      case 'unsupported_file_type':
        return 'Dateityp wird nicht unterstützt';
      case 'invalid_length':
      case 'invalid_chars':
      case 'reserved':
        return 'Ungültiger Album-Name';
      default:
        return 'Upload fehlgeschlagen';
    }
  } catch {
    return 'Upload fehlgeschlagen';
  }
}
