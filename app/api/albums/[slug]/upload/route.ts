import Busboy from 'busboy';
import { createWriteStream } from 'node:fs';
import { rm } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { finished } from 'node:stream/promises';
import type { ReadableStream as NodeWebReadableStream } from 'node:stream/web';
import path from 'node:path';
import { after, NextResponse } from 'next/server';
import { createHash, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { sanitizeDisplayName } from '@/lib/displayName';
import {
  createDisplayVersionForPhoto,
  createDisplayVersionForVideo,
  createThumbnailForPhoto,
  createThumbnailForVideo,
  detectMediaKind,
  needsDisplayConversion,
  type MediaKind,
} from '@/lib/media-processing';
import { prisma } from '@/lib/prisma';
import { resolveAlbumSlug } from '@/lib/slug';
import {
  displayDirectory,
  ensureAlbumDirectories,
  originalDirectory,
  thumbnailDirectory,
} from '@/lib/storage';

export const runtime = 'nodejs';

interface UploadedFile {
  mediaId: string;
  filename: string;
  ext: string;
  originalPath: string;
  mediaKind: MediaKind;
  size: number;
  contentHash: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: rawSlug } = await params;
  const resolution = resolveAlbumSlug(rawSlug);
  if (!resolution.ok) {
    return NextResponse.json({ error: resolution.reason }, { status: 400 });
  }
  const slug = resolution.slug;

  const contentType = request.headers.get('content-type');
  if (!contentType || !request.body) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  await ensureAlbumDirectories(slug);

  let uploaderNameField = '';
  let uploadedFile: UploadedFile | null = null;
  let rejection: { status: number; error: string } | null = null;
  let fileWritePromise: Promise<void> = Promise.resolve();
  // Tracked as soon as we know the on-disk path, independent of `uploadedFile` (which is only
  // set once the write finishes) — so a partial file left behind by a cancelled upload still
  // gets cleaned up in the catch block below.
  let partialOriginalPath: string | null = null;
  let fileFieldSeen = false;

  const busboy = Busboy({ headers: { 'content-type': contentType } });

  busboy.on('field', (name, value) => {
    if (name === 'uploaderName') {
      uploaderNameField = value;
    }
  });

  busboy.on('file', (name, fileStream, info) => {
    if (name !== 'file' || fileFieldSeen) {
      // Only one file per upload request is supported; drain and ignore anything else.
      fileStream.resume();
      return;
    }
    fileFieldSeen = true;

    const mediaKind = detectMediaKind(info.filename);
    if (!mediaKind) {
      rejection = { status: 415, error: 'unsupported_file_type' };
      fileStream.resume();
      return;
    }

    const mediaId = randomUUID();
    const ext = path.extname(info.filename).toLowerCase();
    const originalPath = path.join(originalDirectory(slug), `${mediaId}${ext}`);
    partialOriginalPath = originalPath;

    let size = 0;
    // Server-seitig verifizierter Hash für den Duplikat-Vergleich (ADR-0007) - unabhängig davon,
    // was ein Client vorab per Duplikat-Check-Endpoint berechnet hat.
    const hash = createHash('sha256');
    fileStream.on('data', (chunk: Buffer) => {
      size += chunk.length;
      hash.update(chunk);
    });

    const writeStream = createWriteStream(originalPath);
    fileWritePromise = new Promise<void>((resolve, reject) => {
      // `.pipe()` does not forward source errors to the destination automatically, so without
      // this the write stream would stay open forever if the incoming request errors/aborts.
      fileStream.once('error', (err) => {
        writeStream.destroy(err);
        reject(err);
      });
      writeStream.once('error', reject);
      writeStream.once('finish', resolve);
      fileStream.pipe(writeStream);
    }).then(() => {
      uploadedFile = {
        mediaId,
        filename: info.filename,
        ext,
        originalPath,
        mediaKind,
        size,
        contentHash: hash.digest('hex'),
      };
    });
  });

  const busboyDone = new Promise<void>((resolve, reject) => {
    busboy.on('close', () => resolve());
    busboy.on('error', reject);
  });

  try {
    const bodyStream = request.body as unknown as NodeWebReadableStream<Uint8Array>;
    await finished(Readable.fromWeb(bodyStream).pipe(busboy));
    await busboyDone;
    await fileWritePromise;
  } catch {
    const cleanupPath = uploadedFile ? (uploadedFile as UploadedFile).originalPath : partialOriginalPath;
    if (cleanupPath) {
      await rm(cleanupPath, { force: true });
    }
    return NextResponse.json({ error: 'upload_failed' }, { status: 400 });
  }

  if (rejection) {
    const { status, error } = rejection as { status: number; error: string };
    return NextResponse.json({ error }, { status });
  }

  if (!uploadedFile) {
    return NextResponse.json({ error: 'no_file' }, { status: 400 });
  }

  const file = uploadedFile as UploadedFile;
  const uploaderName = sanitizeDisplayName(uploaderNameField, 'Anonym');
  const ownerToken = randomUUID();

  const album = await prisma.album.upsert({
    where: { slug },
    create: { slug },
    update: {},
  });

  let media;
  try {
    media = await prisma.mediaItem.create({
      data: {
        albumId: album.id,
        filename: file.filename,
        type: file.mediaKind,
        size: file.size,
        uploaderName,
        ownerToken,
        contentHash: file.contentHash,
        originalPath: file.originalPath,
        displayPath: file.originalPath,
        thumbnailPath: null,
      },
    });
  } catch (error) {
    // Verstößt gegen den Unique-Index auf (albumId, contentHash) - siehe "Duplikat" in
    // CONTEXT.md / ADR-0007. Greift auch, wenn der clientseitige Vorab-Check das Duplikat aus
    // einem Wettlauf zweier gleichzeitiger Uploads nicht erkannt hat.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      await rm(file.originalPath, { force: true });
      const existing = await prisma.mediaItem.findFirst({
        where: { albumId: album.id, contentHash: file.contentHash },
        select: { uploaderName: true, createdAt: true },
      });
      return NextResponse.json(
        {
          error: 'duplicate',
          uploaderName: existing?.uploaderName ?? null,
          createdAt: existing?.createdAt ?? null,
        },
        { status: 409 },
      );
    }
    throw error;
  }

  after(() => processMediaInBackground(slug, media.id, file));

  return NextResponse.json(
    {
      id: media.id,
      filename: media.filename,
      type: media.type,
      size: media.size,
      uploaderName: media.uploaderName,
      createdAt: media.createdAt,
      ownerToken: media.ownerToken,
    },
    { status: 201 },
  );
}

async function processMediaInBackground(slug: string, mediaId: string, file: UploadedFile) {
  const thumbnailPath = path.join(thumbnailDirectory(slug), `${file.mediaId}.jpg`);
  let displayPath = file.originalPath;

  try {
    if (needsDisplayConversion(file.mediaKind, file.filename)) {
      if (file.mediaKind === 'PHOTO') {
        displayPath = path.join(displayDirectory(slug), `${file.mediaId}.jpg`);
        await createDisplayVersionForPhoto(file.originalPath, displayPath);
      } else {
        displayPath = path.join(displayDirectory(slug), `${file.mediaId}.mp4`);
        await createDisplayVersionForVideo(file.originalPath, displayPath);
      }
    }
  } catch (error) {
    console.warn(`Konnte Anzeige-Version für ${mediaId} nicht erzeugen:`, error);
    displayPath = file.originalPath;
  }

  try {
    if (file.mediaKind === 'PHOTO') {
      await createThumbnailForPhoto(displayPath, thumbnailPath);
    } else {
      await createThumbnailForVideo(file.originalPath, thumbnailPath);
    }
  } catch (error) {
    console.warn(`Konnte Vorschaubild für ${mediaId} nicht erzeugen:`, error);
    await prisma.mediaItem.update({ where: { id: mediaId }, data: { displayPath } }).catch(() => undefined);
    return;
  }

  await prisma.mediaItem
    .update({ where: { id: mediaId }, data: { displayPath, thumbnailPath } })
    .catch(() => undefined);
}
