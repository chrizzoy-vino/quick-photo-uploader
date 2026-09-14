import { notFound } from 'next/navigation';
import { resolveAlbumSlug } from '@/lib/slug';
import { AlbumView } from './AlbumView';

export default async function AlbumPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const resolution = resolveAlbumSlug(rawSlug);

  if (!resolution.ok) {
    notFound();
  }

  return <AlbumView slug={resolution.slug} />;
}
