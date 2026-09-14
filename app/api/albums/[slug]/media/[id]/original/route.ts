import path from 'node:path';
import { NextResponse } from 'next/server';
import { mimeTypeForExtension } from '@/lib/mime';
import { prisma } from '@/lib/prisma';
import { serveFile } from '@/lib/serve-file';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { id } = await params;
  const media = await prisma.mediaItem.findUnique({ where: { id } });
  if (!media) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return serveFile(media.originalPath, {
    'Content-Type': mimeTypeForExtension(path.extname(media.originalPath)),
    'Content-Disposition': `attachment; filename="${encodeURIComponent(media.filename)}"`,
  });
}
