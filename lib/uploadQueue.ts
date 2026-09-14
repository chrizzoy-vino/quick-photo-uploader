export type UploadItemStatus = 'pending' | 'uploading' | 'success' | 'failed' | 'cancelled';

export interface UploadItem {
  id: string;
  file: File;
  status: UploadItemStatus;
  progress: number;
  error?: string;
}

export interface UploadQueueState {
  items: UploadItem[];
}

export type UploadQueueEvent =
  | { type: 'ENQUEUE'; files: File[] }
  | { type: 'PROGRESS'; id: string; progress: number }
  | { type: 'SUCCESS'; id: string }
  | { type: 'FAILURE'; id: string; error: string }
  | { type: 'CANCEL' }
  | { type: 'RETRY_FAILED' };

let nextId = 0;
function createId(): string {
  nextId += 1;
  return `upload-${nextId}`;
}

export function createEmptyUploadQueueState(): UploadQueueState {
  return { items: [] };
}

function isIdle(items: UploadItem[]): boolean {
  return !items.some((item) => item.status === 'uploading');
}

function startNextPending(items: UploadItem[]): UploadItem[] {
  if (!isIdle(items)) {
    return items;
  }
  const nextIndex = items.findIndex((item) => item.status === 'pending');
  if (nextIndex === -1) {
    return items;
  }
  return items.map((item, index) =>
    index === nextIndex ? { ...item, status: 'uploading' } : item,
  );
}

export function uploadQueueReducer(
  state: UploadQueueState,
  event: UploadQueueEvent,
): UploadQueueState {
  switch (event.type) {
    case 'ENQUEUE': {
      const newItems: UploadItem[] = event.files.map((file) => ({
        id: createId(),
        file,
        status: 'pending',
        progress: 0,
      }));
      return { items: startNextPending([...state.items, ...newItems]) };
    }

    case 'PROGRESS': {
      const items = state.items.map((item) =>
        item.id === event.id ? { ...item, progress: event.progress } : item,
      );
      return { items };
    }

    case 'SUCCESS': {
      const items = state.items.map((item) =>
        item.id === event.id ? { ...item, status: 'success' as const, progress: 100 } : item,
      );
      return { items: startNextPending(items) };
    }

    case 'FAILURE': {
      const items = state.items.map((item) =>
        item.id === event.id
          ? { ...item, status: 'failed' as const, error: event.error }
          : item,
      );
      return { items: startNextPending(items) };
    }

    case 'CANCEL': {
      const items = state.items.map((item) =>
        item.status === 'pending' || item.status === 'uploading'
          ? { ...item, status: 'cancelled' as const }
          : item,
      );
      return { items };
    }

    case 'RETRY_FAILED': {
      const items = state.items.map((item) =>
        item.status === 'failed'
          ? { ...item, status: 'pending' as const, progress: 0, error: undefined }
          : item,
      );
      return { items: startNextPending(items) };
    }

    default:
      return state;
  }
}
