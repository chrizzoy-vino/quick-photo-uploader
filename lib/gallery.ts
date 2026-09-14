export type SortField = 'uploadTime' | 'filename' | 'type' | 'size';
export type SortDirection = 'asc' | 'desc';

export interface MediaRecord {
  id: string;
  filename: string;
  type: 'PHOTO' | 'VIDEO';
  size: number;
  uploaderName: string;
  originalPath: string;
  displayPath: string;
  thumbnailPath: string | null;
  createdAt: Date;
}

export interface GalleryRepository {
  findAlbumBySlug(slug: string): Promise<{ id: string; slug: string } | null>;
  listMediaByAlbumId(albumId: string): Promise<MediaRecord[]>;
  deleteMediaByIds(ids: string[]): Promise<void>;
  deleteAlbum(albumId: string): Promise<void>;
}

export interface FileExistenceChecker {
  exists(path: string): Promise<boolean>;
}

export interface GetAlbumWithMediaOptions {
  sort?: SortField;
  direction?: SortDirection;
  cursor?: number;
  limit?: number;
}

export interface GalleryPage {
  albumId: string;
  slug: string;
  items: MediaRecord[];
  nextCursor: number | null;
}

const DEFAULT_DIRECTIONS: Record<SortField, SortDirection> = {
  uploadTime: 'desc',
  filename: 'asc',
  type: 'asc',
  size: 'desc',
};

const DEFAULT_LIMIT = 50;

export async function getAlbumWithMedia(
  repo: GalleryRepository,
  fileChecker: FileExistenceChecker,
  slug: string,
  options: GetAlbumWithMediaOptions = {},
): Promise<GalleryPage | null> {
  const album = await repo.findAlbumBySlug(slug);
  if (!album) {
    return null;
  }

  const allMedia = await repo.listMediaByAlbumId(album.id);

  const existenceChecks = await Promise.all(
    allMedia.map(async (item) => ({
      item,
      exists: await fileChecker.exists(item.originalPath),
    })),
  );

  const missingIds = existenceChecks.filter((check) => !check.exists).map((check) => check.item.id);
  const remaining = existenceChecks.filter((check) => check.exists).map((check) => check.item);

  if (missingIds.length > 0) {
    await repo.deleteMediaByIds(missingIds);
  }

  if (remaining.length === 0) {
    await repo.deleteAlbum(album.id);
    return null;
  }

  const sorted = sortMedia(remaining, options.sort ?? 'uploadTime', options.direction);
  const limit = options.limit ?? DEFAULT_LIMIT;
  const cursor = options.cursor ?? 0;
  const page = sorted.slice(cursor, cursor + limit);
  const nextCursor = cursor + limit < sorted.length ? cursor + limit : null;

  return { albumId: album.id, slug: album.slug, items: page, nextCursor };
}

function sortMedia(
  items: MediaRecord[],
  field: SortField,
  direction?: SortDirection,
): MediaRecord[] {
  const dir = direction ?? DEFAULT_DIRECTIONS[field];
  return [...items].sort((a, b) => {
    let comparison = 0;
    switch (field) {
      case 'uploadTime':
        comparison = a.createdAt.getTime() - b.createdAt.getTime();
        break;
      case 'filename':
        comparison = a.filename.localeCompare(b.filename);
        break;
      case 'type':
        comparison = a.type.localeCompare(b.type);
        break;
      case 'size':
        comparison = a.size - b.size;
        break;
    }
    return dir === 'asc' ? comparison : -comparison;
  });
}
