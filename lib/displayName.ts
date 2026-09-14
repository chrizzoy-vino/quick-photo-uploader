const ADJECTIVES = [
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
];

const ANIMALS = [
  'Pinguin',
  'Waschbär',
  'Otter',
  'Igel',
  'Flamingo',
  'Faultier',
  'Dachs',
  'Eichhörnchen',
  'Koala',
  'Erdmännchen',
];

const MAX_DISPLAY_NAME_LENGTH = 30;

export function generateRandomDisplayName(random: () => number = Math.random): string {
  const adjective = ADJECTIVES[Math.floor(random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(random() * ANIMALS.length)];
  return `${adjective} ${animal}`;
}

export function sanitizeDisplayName(input: string, fallback: string): string {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return fallback;
  }
  return trimmed.slice(0, MAX_DISPLAY_NAME_LENGTH);
}
