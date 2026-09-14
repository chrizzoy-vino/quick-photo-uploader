'use client';

import { sha256Hex } from './hashFile';

export interface DuplicateInfo {
  uploaderName: string;
}

// Clientseitiger Vorab-Check vor dem eigentlichen Upload (ADR-0007, "Duplikat" in CONTEXT.md) -
// spart die Übertragung der ganzen Datei, wenn sie im Album schon existiert. Nur eine
// Optimierung: die Upload-Route verifiziert den Hash serverseitig ohnehin noch einmal.
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
