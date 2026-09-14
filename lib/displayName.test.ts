import { describe, expect, it } from 'vitest';
import { generateRandomDisplayName, sanitizeDisplayName } from './displayName';

describe('generateRandomDisplayName', () => {
  it('combines an adjective and an animal with a space, given a deterministic random source', () => {
    // random() always returns 0 -> picks the first entry of each list
    const name = generateRandomDisplayName(() => 0);
    expect(name).toMatch(/^\S+ \S+$/);
  });

  it('picks different entries for different random values', () => {
    const first = generateRandomDisplayName(() => 0);
    const second = generateRandomDisplayName(() => 0.999);
    expect(first).not.toEqual(second);
  });
});

describe('sanitizeDisplayName', () => {
  it('trims surrounding whitespace', () => {
    expect(sanitizeDisplayName('  Anna  ', 'Fallback Name')).toBe('Anna');
  });

  it('falls back when the input is empty after trimming', () => {
    expect(sanitizeDisplayName('   ', 'Fallback Name')).toBe('Fallback Name');
  });

  it('truncates names longer than 30 characters', () => {
    const long = 'a'.repeat(40);
    expect(sanitizeDisplayName(long, 'Fallback Name')).toBe('a'.repeat(30));
  });
});
