'use client';

import { sha256Hex } from './hashFile';

export interface DuplicateInfo {
  uploaderName: string;
}

// Client-side pre-check before the actual upload (ADR-0007, "Duplicate" in CONTEXT.md) - saves
// transferring the whole file if it already exists in the album. Just an optimization: the
// upload route verifies the hash server-side again regardless.
export async function checkForDuplicate(
  slug: string,
  file: File,
  signal?: AbortSignal,
): Promise<DuplicateInfo | null> {
  const hash = await sha256Hex(file);
  if (signal?.aborted) {
    return null;
  }

  const response = await fetch(`/api/albums/${slug}/media/duplicate?hash=${hash}`, { signal });
  if (!response.ok) {
    throw new Error('duplicate_check_failed');
  }

  const body = (await response.json()) as { duplicate: boolean; uploaderName?: string };
  return body.duplicate && body.uploaderName ? { uploaderName: body.uploaderName } : null;
}
