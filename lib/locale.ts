export const SUPPORTED_LOCALES = ['en', 'de'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE_NAME = 'NEXT_LOCALE';

export function isSupportedLocale(value: string | undefined | null): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale);
}

/** Picks a supported locale from a raw `Accept-Language` header, e.g. `de-DE,de;q=0.9,en;q=0.8`.
 *  Falls back to DEFAULT_LOCALE for anything that isn't recognizably German - see ADR-0011. */
export function localeFromAcceptLanguage(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const primary = acceptLanguage.split(',')[0]?.trim().toLowerCase();
  if (primary?.startsWith('de')) return 'de';
  return DEFAULT_LOCALE;
}
