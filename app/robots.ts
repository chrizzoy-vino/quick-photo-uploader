import type { MetadataRoute } from 'next';

// Albums are meant to be found only via a shared link, not via search engines —
// see also the X-Robots-Tag header in proxy.ts.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      disallow: '/',
    },
  };
}
