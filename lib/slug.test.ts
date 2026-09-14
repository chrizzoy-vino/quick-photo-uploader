import { describe, expect, it } from 'vitest';
import { resolveAlbumSlug } from './slug';

describe('resolveAlbumSlug', () => {
  it('accepts a simple lowercase slug', () => {
    expect(resolveAlbumSlug('album-test')).toEqual({ ok: true, slug: 'album-test' });
  });

  it('lowercases mixed-case input', () => {
    expect(resolveAlbumSlug('Album-Test')).toEqual({ ok: true, slug: 'album-test' });
  });

  it('rejects slugs shorter than 3 characters', () => {
    expect(resolveAlbumSlug('ab')).toEqual({ ok: false, reason: 'invalid_length' });
  });

  it('rejects slugs longer than 50 characters', () => {
    expect(resolveAlbumSlug('a'.repeat(51))).toEqual({ ok: false, reason: 'invalid_length' });
  });

  it('accepts a slug at the 50 character boundary', () => {
    const slug = 'a'.repeat(50);
    expect(resolveAlbumSlug(slug)).toEqual({ ok: true, slug });
  });

  it('rejects characters outside lowercase letters, digits and hyphen', () => {
    expect(resolveAlbumSlug('album_test')).toEqual({ ok: false, reason: 'invalid_chars' });
    expect(resolveAlbumSlug('album test')).toEqual({ ok: false, reason: 'invalid_chars' });
    expect(resolveAlbumSlug('albüm-test')).toEqual({ ok: false, reason: 'invalid_chars' });
  });

  it('rejects reserved system paths', () => {
    expect(resolveAlbumSlug('api')).toEqual({ ok: false, reason: 'reserved' });
    expect(resolveAlbumSlug('ADMIN')).toEqual({ ok: false, reason: 'reserved' });
    expect(resolveAlbumSlug('impressum')).toEqual({ ok: false, reason: 'reserved' });
    expect(resolveAlbumSlug('datenschutz')).toEqual({ ok: false, reason: 'reserved' });
  });
});
