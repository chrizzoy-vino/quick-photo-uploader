import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveAlbumSlug } from '@/lib/slug';

export const runtime = 'nodejs';

const HASH_PATTERN = /^[0-9a-f]{64}$/;

// Client-side pre-check before the actual upload (ADR-0007) - avoids unnecessary
// data transfer, but is only an optimization. The authoritative check happens in the
// upload route, based on a hash computed server-side from the actual file bytes.
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
