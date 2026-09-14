import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Quick Photo Uploader',
    short_name: 'Quick Upload',
    description: 'Fotos und Videos schnell in ein gemeinsames Album hochladen.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f7f7f8',
    theme_color: '#2563eb',
    icons: [],
  };
}
