import type { MediaItem } from '@prisma/client';
import type { DeleteMediaRepository } from './deleteMedia';
import type { GalleryRepository, MediaRecord } from './gallery';
import { prisma } from './prisma';

function toMediaRecord(row: MediaItem): MediaRecord {
  return {
    id: row.id,
    filename: row.filename,
    type: row.type,
    size: row.size,
    uploaderName: row.uploaderName,
    originalPath: row.originalPath,
    displayPath: row.displayPath,
    thumbnailPath: row.thumbnailPath,
    createdAt: row.createdAt,
  };
}

async function deleteMediaByIds(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await prisma.mediaItem.deleteMany({ where: { id: { in: ids } } });
}

async function deleteAlbum(albumId: string): Promise<void> {
  await prisma.album.delete({ where: { id: albumId } }).catch(() => undefined);
}

export const galleryRepository: GalleryRepository = {
  async findAlbumBySlug(slug) {
    return prisma.album.findUnique({ where: { slug }, select: { id: true, slug: true } });
  },

  async listMediaByAlbumId(albumId) {
    const rows = await prisma.mediaItem.findMany({ where: { albumId } });
    return rows.map(toMediaRecord);
  },

  deleteMediaByIds,
  deleteAlbum,
};

export const deleteMediaRepository: DeleteMediaRepository = {
  async findMediaByIds(albumId, ids) {
    const rows = await prisma.mediaItem.findMany({ where: { albumId, id: { in: ids } } });
    return rows.map((row) => ({
      id: row.id,
      originalPath: row.originalPath,
      displayPath: row.displayPath,
      thumbnailPath: row.thumbnailPath,
    }));
  },

  deleteMediaByIds,

  async countRemainingMedia(albumId) {
    return prisma.mediaItem.count({ where: { albumId } });
  },

  deleteAlbum,
};
