'use client';

// Stores, per own upload (media item id -> owner token), locally in the browser, see
// "owner token" in CONTEXT.md. Purely client-side: the server verifies the token again on
// every delete request regardless — this module only exists to look it back up in the browser.

const STORAGE_KEY = 'quick-photo-uploader:owner-tokens';

function readAll(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function storeOwnerToken(mediaId: string, ownerToken: string): void {
  try {
    const all = readAll();
    all[mediaId] = ownerToken;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // localStorage not available (e.g. private mode) - this upload can then only be deleted
    // via the admin area
  }
}

export function getOwnerToken(mediaId: string): string | undefined {
  return readAll()[mediaId];
}

export function hasOwnerToken(mediaId: string): boolean {
  return getOwnerToken(mediaId) !== undefined;
}
