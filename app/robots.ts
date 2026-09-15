import type { MetadataRoute } from 'next';

// Alben sind ausschließlich per geteiltem Link gedacht, nicht zum Auffinden ueber
// Suchmaschinen - siehe auch den X-Robots-Tag-Header in proxy.ts.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      disallow: '/',
    },
  };
}
