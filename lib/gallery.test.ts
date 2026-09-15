import { describe, expect, it } from 'vitest';
import { getAlbumWithMedia, type GalleryRepository, type MediaRecord } from './gallery';

function makeMedia(overrides: Partial<MediaRecord> & { id: string }): MediaRecord {
  return {
    filename: 'file.jpg',
    type: 'PHOTO',
    size: 100,
    uploaderName: 'Happy Penguin',
    originalPath: `/albums/test/original/${overrides.id}.jpg`,
    displayPath: `/albums/test/display/${overrides.id}.jpg`,
    thumbnailPath: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

class FakeRepository implements GalleryRepository {
  deletedMediaIds: string[] = [];
  deletedAlbumIds: string[] = [];

  constructor(
    private album: { id: string; slug: string } | null,
    private media: MediaRecord[],
  ) {}

  async findAlbumBySlug(slug: string) {
    return this.album && this.album.slug === slug ? this.album : null;
  }

  async listMediaByAlbumId(albumId: string) {
    if (!this.album || this.album.id !== albumId) return [];
    return this.media.filter((m) => !this.deletedMediaIds.includes(m.id));
  }

  async deleteMediaByIds(ids: string[]) {
    this.deletedMediaIds.push(...ids);
  }

  async deleteAlbum(albumId: string) {
    this.deletedAlbumIds.push(albumId);
  }
}

class FakeFileChecker {
  constructor(private missingPaths: Set<string> = new Set()) {}
  async exists(path: string) {
    return !this.missingPaths.has(path);
  }
}

describe('getAlbumWithMedia', () => {
  it('returns null when the album does not exist', async () => {
    const repo = new FakeRepository(null, []);
    const result = await getAlbumWithMedia(repo, new FakeFileChecker(), 'unknown-album');
    expect(result).toBeNull();
  });

  it('returns media sorted newest-first by default', async () => {
    const older = makeMedia({ id: 'a', createdAt: new Date('2026-01-01T00:00:00Z') });
    const newer = makeMedia({ id: 'b', createdAt: new Date('2026-01-02T00:00:00Z') });
    const repo = new FakeRepository({ id: 'album-1', slug: 'test' }, [older, newer]);

    const result = await getAlbumWithMedia(repo, new FakeFileChecker(), 'test');

    expect(result?.items.map((m) => m.id)).toEqual(['b', 'a']);
  });

  it('sorts by filename ascending when requested', async () => {
    const b = makeMedia({ id: 'b', filename: 'banana.jpg' });
    const a = makeMedia({ id: 'a', filename: 'apple.jpg' });
    const repo = new FakeRepository({ id: 'album-1', slug: 'test' }, [b, a]);

    const result = await getAlbumWithMedia(repo, new FakeFileChecker(), 'test', {
      sort: 'filename',
    });

    expect(result?.items.map((m) => m.id)).toEqual(['a', 'b']);
  });

  it('removes media whose original file no longer exists on disk', async () => {
    const present = makeMedia({ id: 'present' });
    const missing = makeMedia({ id: 'missing' });
    const repo = new FakeRepository({ id: 'album-1', slug: 'test' }, [present, missing]);
    const fileChecker = new FakeFileChecker(new Set([missing.originalPath]));

    const result = await getAlbumWithMedia(repo, fileChecker, 'test');

    expect(result?.items.map((m) => m.id)).toEqual(['present']);
    expect(repo.deletedMediaIds).toEqual(['missing']);
  });

  it('deletes the whole album once every media item is gone', async () => {
    const onlyItem = makeMedia({ id: 'only' });
    const repo = new FakeRepository({ id: 'album-1', slug: 'test' }, [onlyItem]);
    const fileChecker = new FakeFileChecker(new Set([onlyItem.originalPath]));

    const result = await getAlbumWithMedia(repo, fileChecker, 'test');

    expect(result).toBeNull();
    expect(repo.deletedAlbumIds).toEqual(['album-1']);
  });

  it('paginates results and reports a next cursor', async () => {
    const items = ['a', 'b', 'c'].map((id) => makeMedia({ id }));
    const repo = new FakeRepository({ id: 'album-1', slug: 'test' }, items);

    const firstPage = await getAlbumWithMedia(repo, new FakeFileChecker(), 'test', {
      sort: 'filename',
      limit: 2,
    });
    expect(firstPage?.items.map((m) => m.id)).toEqual(['a', 'b']);
    expect(firstPage?.nextCursor).toBe(2);

    const secondPage = await getAlbumWithMedia(repo, new FakeFileChecker(), 'test', {
      sort: 'filename',
      limit: 2,
      cursor: firstPage!.nextCursor!,
    });
    expect(secondPage?.items.map((m) => m.id)).toEqual(['c']);
    expect(secondPage?.nextCursor).toBeNull();
  });
});
