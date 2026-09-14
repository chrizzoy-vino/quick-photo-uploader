import { describe, expect, it } from 'vitest';
import {
  createEmptyUploadQueueState,
  uploadQueueReducer,
  type UploadQueueState,
} from './uploadQueue';

function fileStub(name: string): File {
  return { name } as File;
}

describe('uploadQueueReducer', () => {
  it('starts the first item uploading immediately when the queue was empty', () => {
    const state = uploadQueueReducer(createEmptyUploadQueueState(), {
      type: 'ENQUEUE',
      files: [fileStub('a.jpg'), fileStub('b.jpg')],
    });

    expect(state.items[0]?.status).toBe('uploading');
    expect(state.items[1]?.status).toBe('pending');
  });

  it('starts the next pending item once the current one succeeds', () => {
    let state: UploadQueueState = uploadQueueReducer(createEmptyUploadQueueState(), {
      type: 'ENQUEUE',
      files: [fileStub('a.jpg'), fileStub('b.jpg')],
    });
    const firstId = state.items[0]!.id;

    state = uploadQueueReducer(state, { type: 'SUCCESS', id: firstId });

    expect(state.items[0]?.status).toBe('success');
    expect(state.items[0]?.progress).toBe(100);
    expect(state.items[1]?.status).toBe('uploading');
  });

  it('starts the next pending item once the current one fails', () => {
    let state: UploadQueueState = uploadQueueReducer(createEmptyUploadQueueState(), {
      type: 'ENQUEUE',
      files: [fileStub('a.jpg'), fileStub('b.jpg')],
    });
    const firstId = state.items[0]!.id;

    state = uploadQueueReducer(state, { type: 'FAILURE', id: firstId, error: 'Netzwerkfehler' });

    expect(state.items[0]?.status).toBe('failed');
    expect(state.items[0]?.error).toBe('Netzwerkfehler');
    expect(state.items[1]?.status).toBe('uploading');
  });

  it('updates progress for the uploading item', () => {
    let state: UploadQueueState = uploadQueueReducer(createEmptyUploadQueueState(), {
      type: 'ENQUEUE',
      files: [fileStub('a.jpg')],
    });
    const id = state.items[0]!.id;

    state = uploadQueueReducer(state, { type: 'PROGRESS', id, progress: 42 });

    expect(state.items[0]?.progress).toBe(42);
  });

  it('cancelling discards the in-flight item and all still-pending items, keeping already-succeeded ones', () => {
    let state: UploadQueueState = uploadQueueReducer(createEmptyUploadQueueState(), {
      type: 'ENQUEUE',
      files: [fileStub('a.jpg'), fileStub('b.jpg'), fileStub('c.jpg')],
    });
    const firstId = state.items[0]!.id;
    state = uploadQueueReducer(state, { type: 'SUCCESS', id: firstId });

    state = uploadQueueReducer(state, { type: 'CANCEL' });

    expect(state.items[0]?.status).toBe('success');
    expect(state.items[1]?.status).toBe('cancelled');
    expect(state.items[2]?.status).toBe('cancelled');
  });

  it('retrying failed items requeues them and resumes uploading if idle', () => {
    let state: UploadQueueState = uploadQueueReducer(createEmptyUploadQueueState(), {
      type: 'ENQUEUE',
      files: [fileStub('a.jpg')],
    });
    const id = state.items[0]!.id;
    state = uploadQueueReducer(state, { type: 'FAILURE', id, error: 'oops' });

    state = uploadQueueReducer(state, { type: 'RETRY_FAILED' });

    expect(state.items[0]?.status).toBe('uploading');
    expect(state.items[0]?.error).toBeUndefined();
  });
});
