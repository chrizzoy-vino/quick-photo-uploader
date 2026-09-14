import { describe, expect, it } from 'vitest';
import { deleteMedia, type DeleteMediaRepository, type DeletableMediaRecord } from './deleteMedia';

function makeRecord(overrides: Partial<DeletableMediaRecord> & { id: string }): DeletableMediaRecord {
  return {
    originalPath: `/albums/test/original/${overrides.id}.jpg`,
    displayPath: `/albums/test/original/${overrides.id}.jpg`,
    thumbnailPath: `/albums/test/thumb/${overrides.id}.jpg`,
    ownerToken: `token-${overrides.id}`,
    ...overrides,
  };
}

class FakeRepository implements DeleteMediaRepository {
  deletedIds: string[] = [];
  deletedAlbumIds: string[] = [];

  constructor(
    private records: DeletableMediaRecord[],
    private remainingAfterDelete: number,
  ) {}

  async findMediaByIds(_albumId: string, ids: string[]) {
    return this.records.filter((r) => ids.includes(r.id));
  }

  async deleteMediaByIds(ids: string[]) {
    this.deletedIds.push(...ids);
  }

  async countRemainingMedia(_albumId: string) {
    return this.remainingAfterDelete;
  }

  async deleteAlbum(albumId: string) {
    this.deletedAlbumIds.push(albumId);
  }
}

class FakeFileRemover {
  removedPaths: string[] = [];
  async remove(path: string) {
    this.removedPaths.push(path);
  }
}

describe('deleteMedia', () => {
  it('removes original, display and thumbnail files for each deleted item', async () => {
    const record = makeRecord({
      id: 'a',
      displayPath: '/albums/test/display/a.jpg',
    });
    const repo = new FakeRepository([record], 1);
    const fileRemover = new FakeFileRemover();

    await deleteMedia(repo, fileRemover, 'album-1', ['a']);

    expect(fileRemover.removedPaths).toEqual([
      '/albums/test/original/a.jpg',
      '/albums/test/display/a.jpg',
      '/albums/test/thumb/a.jpg',
    ]);
  });

  it('does not remove the display file twice when it is the same as the original', async () => {
    const record = makeRecord({ id: 'a' });
    const repo = new FakeRepository([record], 1);
    const fileRemover = new FakeFileRemover();

    await deleteMedia(repo, fileRemover, 'album-1', ['a']);

    expect(fileRemover.removedPaths).toEqual([
      '/albums/test/original/a.jpg',
      '/albums/test/thumb/a.jpg',
    ]);
  });

  it('deletes the DB rows for the requested ids and reports the deleted count', async () => {
    const repo = new FakeRepository([makeRecord({ id: 'a' }), makeRecord({ id: 'b' })], 0);
    const fileRemover = new FakeFileRemover();

    const result = await deleteMedia(repo, fileRemover, 'album-1', ['a', 'b']);

    expect(repo.deletedIds).toEqual(['a', 'b']);
    expect(result.deletedCount).toBe(2);
  });

  it('deletes the album once no media remains', async () => {
    const repo = new FakeRepository([makeRecord({ id: 'a' })], 0);
    const fileRemover = new FakeFileRemover();

    const result = await deleteMedia(repo, fileRemover, 'album-1', ['a']);

    expect(repo.deletedAlbumIds).toEqual(['album-1']);
    expect(result.albumDeleted).toBe(true);
  });

  it('keeps the album when media remains after deletion', async () => {
    const repo = new FakeRepository([makeRecord({ id: 'a' })], 3);
    const fileRemover = new FakeFileRemover();

    const result = await deleteMedia(repo, fileRemover, 'album-1', ['a']);

    expect(repo.deletedAlbumIds).toEqual([]);
    expect(result.albumDeleted).toBe(false);
  });

  it('only deletes records the authorizer approves, leaving the rest untouched', async () => {
    const repo = new FakeRepository(
      [makeRecord({ id: 'a', ownerToken: 'correct' }), makeRecord({ id: 'b', ownerToken: 'other' })],
      1,
    );
    const fileRemover = new FakeFileRemover();

    const result = await deleteMedia(
      repo,
      fileRemover,
      'album-1',
      ['a', 'b'],
      (record) => record.ownerToken === 'correct',
    );

    expect(repo.deletedIds).toEqual(['a']);
    expect(fileRemover.removedPaths).toEqual([
      '/albums/test/original/a.jpg',
      '/albums/test/thumb/a.jpg',
    ]);
    expect(result.deletedCount).toBe(1);
    expect(result.unauthorizedCount).toBe(1);
  });

  it('defaults to authorizing everything when no authorizer is given', async () => {
    const repo = new FakeRepository([makeRecord({ id: 'a' })], 0);
    const fileRemover = new FakeFileRemover();

    const result = await deleteMedia(repo, fileRemover, 'album-1', ['a']);

    expect(result.deletedCount).toBe(1);
    expect(result.unauthorizedCount).toBe(0);
  });
});
