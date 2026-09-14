export interface DeletableMediaRecord {
  id: string;
  originalPath: string;
  displayPath: string;
  thumbnailPath: string | null;
}

export interface DeleteMediaRepository {
  findMediaByIds(albumId: string, ids: string[]): Promise<DeletableMediaRecord[]>;
  deleteMediaByIds(ids: string[]): Promise<void>;
  countRemainingMedia(albumId: string): Promise<number>;
  deleteAlbum(albumId: string): Promise<void>;
}

export interface FileRemover {
  remove(path: string): Promise<void>;
}

export interface DeleteMediaResult {
  deletedCount: number;
  albumDeleted: boolean;
}

export async function deleteMedia(
  repo: DeleteMediaRepository,
  fileRemover: FileRemover,
  albumId: string,
  mediaIds: string[],
): Promise<DeleteMediaResult> {
  const records = await repo.findMediaByIds(albumId, mediaIds);

  for (const record of records) {
    await fileRemover.remove(record.originalPath);
    if (record.displayPath !== record.originalPath) {
      await fileRemover.remove(record.displayPath);
    }
    if (record.thumbnailPath) {
      await fileRemover.remove(record.thumbnailPath);
    }
  }

  const idsToDelete = records.map((record) => record.id);
  if (idsToDelete.length > 0) {
    await repo.deleteMediaByIds(idsToDelete);
  }

  const remaining = await repo.countRemainingMedia(albumId);
  let albumDeleted = false;
  if (remaining === 0) {
    await repo.deleteAlbum(albumId);
    albumDeleted = true;
  }

  return { deletedCount: idsToDelete.length, albumDeleted };
}
