'use client';

import { useCallback, useEffect, useState } from 'react';

interface AdminAlbum {
  slug: string;
  mediaCount: number;
  totalSize: number;
  lastActivity: string;
}

export function AdminView() {
  const [albums, setAlbums] = useState<AdminAlbum[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/admin/albums', { cache: 'no-store' });
      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }
      if (!res.ok) throw new Error('load_failed');
      const data = (await res.json()) as { albums: AdminAlbum[] };
      setAlbums(data.albums);
    } catch {
      setError('Alben konnten nicht geladen werden.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (slug: string) => {
    if (
      !window.confirm(
        `Album "${slug}" mit allen Mediendateien unwiderruflich löschen? Das kann nicht rückgängig gemacht werden.`,
      )
    ) {
      return;
    }
    setPendingSlug(slug);
    setError(null);
    try {
      const res = await fetch(`/api/admin/albums/${slug}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('delete_failed');
      await load();
    } catch {
      setError(`Album "${slug}" konnte nicht gelöscht werden.`);
    } finally {
      setPendingSlug(null);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  };

  return (
    <main style={{ maxWidth: '860px', margin: '0 auto', padding: '24px 16px 64px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.3rem', margin: 0 }}>Admin-Bereich</h1>
        <button type="button" onClick={handleLogout} style={secondaryButtonStyle}>
          Abmelden
        </button>
      </div>

      {error ? (
        <p style={{ color: 'var(--color-danger)', fontSize: '0.9rem' }}>{error}</p>
      ) : null}

      {albums === null ? (
        <p style={{ color: 'var(--color-text-muted)' }}>Lädt…</p>
      ) : albums.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)' }}>Aktuell existieren keine Alben.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
                <th style={cellStyle}>Album</th>
                <th style={cellStyle}>Dateien</th>
                <th style={cellStyle}>Größe</th>
                <th style={cellStyle}>Letzte Aktivität</th>
                <th style={cellStyle} />
              </tr>
            </thead>
            <tbody>
              {albums.map((album) => (
                <tr key={album.slug} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={cellStyle}>
                    <a href={`/${album.slug}`} target="_blank" rel="noreferrer">
                      {album.slug}
                    </a>
                  </td>
                  <td style={cellStyle}>{album.mediaCount}</td>
                  <td style={cellStyle}>{formatSize(album.totalSize)}</td>
                  <td style={cellStyle}>{formatDate(album.lastActivity)}</td>
                  <td style={cellStyle}>
                    <button
                      type="button"
                      onClick={() => handleDelete(album.slug)}
                      disabled={pendingSlug === album.slug}
                      style={{ ...secondaryButtonStyle, color: 'var(--color-danger)' }}
                    >
                      🗑️ Löschen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

const cellStyle = { padding: '8px 10px' } as const;

const secondaryButtonStyle = {
  padding: '6px 10px',
  borderRadius: '8px',
  border: '1px solid var(--color-border)',
  background: 'transparent',
  color: 'var(--color-text)',
  fontSize: '0.85rem',
  cursor: 'pointer',
} as const;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
}
