import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';
import { deleteMedia } from '@/lib/deleteMedia';
import { deleteMediaRepository, galleryRepository } from '@/lib/repositories';
import { resolveAlbumSlug } from '@/lib/slug';
import { fsFileRemover, removeAlbumDirectory } from '@/lib/storage';

export const runtime = 'nodejs';

/** Löscht ein ganzes Album als Administrator — technisch: alle seine Mediendateien löschen,
 *  wodurch das Album gemäß seiner Definition (CONTEXT.md) aufhört zu existieren. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { slug: rawSlug } = await params;
  const resolution = resolveAlbumSlug(rawSlug);
  if (!resolution.ok) {
    return NextResponse.json({ error: resolution.reason }, { status: 400 });
  }

  const album = await galleryRepository.findAlbumBySlug(resolution.slug);
  if (!album) {
    return NextResponse.json({ error: 'album_not_found' }, { status: 404 });
  }

  const media = await galleryRepository.listMediaByAlbumId(album.id);
  const result = await deleteMedia(
    deleteMediaRepository,
    fsFileRemover,
    album.id,
    media.map((item) => item.id),
  );

  if (result.albumDeleted) {
    await removeAlbumDirectory(resolution.slug).catch(() => undefined);
  }

  return NextResponse.json(result);
}
