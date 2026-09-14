import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveAlbumSlug } from '@/lib/slug';

export const runtime = 'nodejs';

const HASH_PATTERN = /^[0-9a-f]{64}$/;

// Clientseitiger Vorab-Check vor dem eigentlichen Upload (ADR-0007) - vermeidet unnötige
// Datenübertragung, ist aber nur eine Optimierung. Die verbindliche Prüfung passiert erst in der
// Upload-Route anhand des serverseitig aus den tatsächlichen Datei-Bytes berechneten Hash.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: rawSlug } = await params;
  const resolution = resolveAlbumSlug(rawSlug);
  if (!resolution.ok) {
    return NextResponse.json({ error: resolution.reason }, { status: 400 });
  }

  const hash = new URL(request.url).searchParams.get('hash');
  if (!hash || !HASH_PATTERN.test(hash)) {
    return NextResponse.json({ error: 'invalid_hash' }, { status: 400 });
  }

  const album = await prisma.album.findUnique({
    where: { slug: resolution.slug },
    select: { id: true },
  });
  if (!album) {
    return NextResponse.json({ duplicate: false });
  }

  const existing = await prisma.mediaItem.findFirst({
    where: { albumId: album.id, contentHash: hash },
    select: { uploaderName: true, createdAt: true },
  });

  if (!existing) {
    return NextResponse.json({ duplicate: false });
  }

  return NextResponse.json({
    duplicate: true,
    uploaderName: existing.uploaderName,
    createdAt: existing.createdAt,
  });
}
