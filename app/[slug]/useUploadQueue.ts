'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createEmptyUploadQueueState,
  uploadQueueReducer,
  type UploadItem,
  type UploadQueueEvent,
  type UploadQueueState,
} from '@/lib/uploadQueue';
import { storeOwnerToken } from '@/lib/ownerTokens';
import { checkForDuplicate } from '@/lib/checkDuplicate';

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
  const duplicateCheckAbortByItemId = useRef(new Map<string, AbortController>());
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
    for (const controller of duplicateCheckAbortByItemId.current.values()) {
      controller.abort();
    }
    dispatch({ type: 'CANCEL' });
  }, [dispatch]);

  const retryFailed = useCallback(() => {
    dispatch({ type: 'RETRY_FAILED' });
  }, [dispatch]);

  const startUpload = useCallback(
    (uploadingItem: UploadItem) => {
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
          try {
            const body = JSON.parse(xhr.responseText) as { id?: string; ownerToken?: string };
            if (body.id && body.ownerToken) {
              storeOwnerToken(body.id, body.ownerToken);
            }
          } catch {
            // Response not parseable - upload still counts as successful, just without
            // a later self-delete option for this file
          }
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
    },
    [slug, dispatch, onItemUploaded],
  );

  // As soon as the reducer sets an item to "uploading": first check via the duplicate check
  // (ADR-0007) whether the file already exists in the album, before starting the actual network request.
  useEffect(() => {
    const uploadingItem = state.items.find((item) => item.status === 'uploading');
    if (!uploadingItem || startedIds.current.has(uploadingItem.id)) {
      return;
    }
    startedIds.current.add(uploadingItem.id);

    const controller = new AbortController();
    duplicateCheckAbortByItemId.current.set(uploadingItem.id, controller);

    checkForDuplicate(slug, uploadingItem.file, controller.signal)
      .then((duplicate) => {
        duplicateCheckAbortByItemId.current.delete(uploadingItem.id);
        if (controller.signal.aborted) return;
        if (duplicate) {
          dispatch({
            type: 'FAILURE',
            id: uploadingItem.id,
            error: `Bereits hochgeladen von ${duplicate.uploaderName}`,
          });
          return;
        }
        startUpload(uploadingItem);
      })
      .catch(() => {
        duplicateCheckAbortByItemId.current.delete(uploadingItem.id);
        if (controller.signal.aborted) return;
        // Duplicate check failed (e.g. network error) - attempt the upload anyway; the
        // server-side check in the upload route applies authoritatively again regardless.
        startUpload(uploadingItem);
      });
  }, [state.items, slug, dispatch, startUpload]);

  // Reports a summary toast once no file is running/pending anymore.
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
    const body = JSON.parse(xhr.responseText) as { error?: string; uploaderName?: string };
    switch (body.error) {
      case 'unsupported_file_type':
        return 'Dateityp wird nicht unterstützt';
      case 'invalid_length':
      case 'invalid_chars':
      case 'reserved':
        return 'Ungültiger Album-Name';
      case 'duplicate':
        return body.uploaderName
          ? `Bereits hochgeladen von ${body.uploaderName}`
          : 'Bereits hochgeladen';
      default:
        return 'Upload fehlgeschlagen';
    }
  } catch {
    return 'Upload fehlgeschlagen';
  }
}
