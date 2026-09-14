'use client';

// Speichert pro eigenem Upload (Mediendatei-ID -> Lösch-Token) lokal im Browser, siehe
// "Lösch-Token" in CONTEXT.md. Rein clientseitig: der Server verifiziert das Token ohnehin bei
// jeder Löschanfrage erneut, dieses Modul dient nur dazu, es im Browser wiederzufinden.

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
    // localStorage nicht verfügbar (z.B. privater Modus) - dieser Upload bleibt dann nur über
    // den Admin-Bereich löschbar
  }
}

export function getOwnerToken(mediaId: string): string | undefined {
  return readAll()[mediaId];
}

export function hasOwnerToken(mediaId: string): boolean {
  return getOwnerToken(mediaId) !== undefined;
}
