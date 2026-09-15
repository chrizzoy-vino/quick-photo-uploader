import type { MetadataRoute } from 'next';
import { getTranslations } from 'next-intl/server';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations('Manifest');
  return {
    name: 'Quick Photo Uploader',
    short_name: 'Quick Upload',
    description: t('description'),
    start_url: '/',
    display: 'standalone',
    background_color: '#f7f7f8',
    theme_color: '#2563eb',
    icons: [],
  };
}
