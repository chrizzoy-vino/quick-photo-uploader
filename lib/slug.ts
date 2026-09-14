export type SlugResolution =
  | { ok: true; slug: string }
  | { ok: false; reason: 'invalid_length' | 'invalid_chars' | 'reserved' };

const MIN_LENGTH = 3;
const MAX_LENGTH = 50;
const SLUG_PATTERN = /^[a-z0-9-]+$/;

const RESERVED_SLUGS = new Set([
  'api',
  'admin',
  'impressum',
  'datenschutz',
  '_next',
  'static',
  'favicon.ico',
  'robots.txt',
  'sitemap.xml',
]);

export function resolveAlbumSlug(input: string): SlugResolution {
  const slug = input.toLowerCase();

  if (slug.length < MIN_LENGTH || slug.length > MAX_LENGTH) {
    return { ok: false, reason: 'invalid_length' };
  }

  if (!SLUG_PATTERN.test(slug)) {
    return { ok: false, reason: 'invalid_chars' };
  }

  if (RESERVED_SLUGS.has(slug)) {
    return { ok: false, reason: 'reserved' };
  }

  return { ok: true, slug };
}
