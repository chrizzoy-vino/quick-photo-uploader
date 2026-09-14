import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serveFile } from '@/lib/serve-file';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { id } = await params;
  const media = await prisma.mediaItem.findUnique({ where: { id } });
  if (!media || !media.thumbnailPath) {
    return NextResponse.json({ error: 'not_ready' }, { status: 404 });
  }

  return serveFile(media.thumbnailPath, {
    'Content-Type': 'image/jpeg',
    'Cache-Control': 'private, max-age=31536000, immutable',
  });
}
