import type { SortDirection, SortField } from '@/lib/gallery';
import type { ApiMediaItem } from './types';

export interface FetchMediaOptions {
  sort: SortField;
  direction?: SortDirection;
  cursor?: number;
  limit?: number;
}

export async function fetchMediaPage(
  slug: string,
  options: FetchMediaOptions,
): Promise<{ items: ApiMediaItem[]; nextCursor: number | null }> {
  const params = new URLSearchParams();
  params.set('sort', options.sort);
  if (options.direction) params.set('direction', options.direction);
  if (options.cursor !== undefined) params.set('cursor', String(options.cursor));
  if (options.limit !== undefined) params.set('limit', String(options.limit));

  const res = await fetch(`/api/albums/${slug}/media?${params.toString()}`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error('Failed to load the gallery.');
  }
  return res.json();
}

export async function deleteMediaItems(
  slug: string,
  ids: string[],
  ownerTokens: Record<string, string>,
): Promise<{ deletedCount: number; albumDeleted: boolean; unauthorizedCount: number }> {
  const res = await fetch(`/api/albums/${slug}/media`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, ownerTokens }),
  });
  if (!res.ok) {
    throw new Error('Delete failed.');
  }
  return res.json();
}
