import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { LOCALE_COOKIE_NAME, isSupportedLocale, localeFromAcceptLanguage } from '@/lib/locale';

/** No URL-based locale routing (no `[locale]` segment, no path prefix) - see ADR-0011. Album
 *  links like `/wedding-anna` must keep working unchanged, so the locale is resolved from a
 *  cookie (set by the language switcher) or, on a first visit, from the browser's
 *  `Accept-Language` header - never from the URL. */
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;

  const locale = isSupportedLocale(cookieLocale)
    ? cookieLocale
    : localeFromAcceptLanguage((await headers()).get('accept-language'));

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
