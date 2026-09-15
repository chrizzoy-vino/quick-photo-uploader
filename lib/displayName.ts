import type { Locale } from './locale';

const ADJECTIVES: Record<Locale, string[]> = {
  en: [
    'Happy',
    'Quick',
    'Brave',
    'Clumsy',
    'Curious',
    'Sleepy',
    'Wild',
    'Sly',
    'Lucky',
    'Goofy',
  ],
  de: [
    'Fröhlicher',
    'Flinker',
    'Mutiger',
    'Schusseliger',
    'Neugieriger',
    'Verschlafener',
    'Wilder',
    'Listiger',
    'Glücklicher',
    'Tollpatschiger',
  ],
};

const ANIMALS: Record<Locale, string[]> = {
  en: ['Penguin', 'Raccoon', 'Otter', 'Hedgehog', 'Flamingo', 'Sloth', 'Badger', 'Squirrel', 'Koala', 'Meerkat'],
  de: ['Pinguin', 'Waschbär', 'Otter', 'Igel', 'Flamingo', 'Faultier', 'Dachs', 'Eichhörnchen', 'Koala', 'Erdmännchen'],
};

const MAX_DISPLAY_NAME_LENGTH = 30;

export function generateRandomDisplayName(random: () => number = Math.random, locale: Locale = 'en'): string {
  const adjective = ADJECTIVES[locale][Math.floor(random() * ADJECTIVES[locale].length)];
  const animal = ANIMALS[locale][Math.floor(random() * ANIMALS[locale].length)];
  return `${adjective} ${animal}`;
}

export function sanitizeDisplayName(input: string, fallback: string): string {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return fallback;
  }
  return trimmed.slice(0, MAX_DISPLAY_NAME_LENGTH);
}
