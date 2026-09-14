import { NextResponse } from 'next/server';
import { deleteMedia } from '@/lib/deleteMedia';
import { getAlbumWithMedia, type SortField } from '@/lib/gallery';
import { deleteMediaRepository, galleryRepository } from '@/lib/repositories';
import { resolveAlbumSlug } from '@/lib/slug';
import { fsFileExistenceChecker, fsFileRemover, removeAlbumDirectory } from '@/lib/storage';

export const runtime = 'nodejs';

const SORT_FIELDS: SortField[] = ['uploadTime', 'filename', 'type', 'size'];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: rawSlug } = await params;
  const resolution = resolveAlbumSlug(rawSlug);
  if (!resolution.ok) {
    return NextResponse.json({ error: resolution.reason }, { status: 400 });
  }

  const url = new URL(request.url);
  const sortParam = url.searchParams.get('sort') ?? 'uploadTime';
  const sort = SORT_FIELDS.includes(sortParam as SortField) ? (sortParam as SortField) : 'uploadTime';
  const directionParam = url.searchParams.get('direction');
  const direction = directionParam === 'asc' || directionParam === 'desc' ? directionParam : undefined;
  const cursorParam = url.searchParams.get('cursor');
  const cursor = cursorParam ? Number.parseInt(cursorParam, 10) : undefined;
  const limitParam = url.searchParams.get('limit');
  const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;

  // Checked before reconciliation so we can tell "never existed" apart from "just became
  // empty" below — only the latter should trigger removing the on-disk album directory.
  const albumExistedBefore = await galleryRepository.findAlbumBySlug(resolution.slug);

  const page = await getAlbumWithMedia(galleryRepository, fsFileExistenceChecker, resolution.slug, {
    sort,
    direction,
    cursor,
    limit,
  });

  if (!page) {
    if (albumExistedBefore) {
      await removeAlbumDirectory(resolution.slug).catch(() => undefined);
    }
    return NextResponse.json({ items: [], nextCursor: null });
  }

  return NextResponse.json({
    items: page.items.map((item) => ({
      id: item.id,
      filename: item.filename,
      type: item.type,
      size: item.size,
      uploaderName: item.uploaderName,
      hasThumbnail: item.thumbnailPath !== null,
      createdAt: item.createdAt,
    })),
    nextCursor: page.nextCursor,
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: rawSlug } = await params;
  const resolution = resolveAlbumSlug(rawSlug);
  if (!resolution.ok) {
    return NextResponse.json({ error: resolution.reason }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as { ids?: unknown } | null;
  const ids = Array.isArray(body?.ids) ? body!.ids.filter((id): id is string => typeof id === 'string') : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: 'no_ids' }, { status: 400 });
  }

  const album = await galleryRepository.findAlbumBySlug(resolution.slug);
  if (!album) {
    return NextResponse.json({ error: 'album_not_found' }, { status: 404 });
  }

  const result = await deleteMedia(deleteMediaRepository, fsFileRemover, album.id, ids);

  if (result.albumDeleted) {
    await removeAlbumDirectory(resolution.slug).catch(() => undefined);
  }

  return NextResponse.json(result);
}
