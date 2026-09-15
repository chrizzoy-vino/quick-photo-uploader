import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import heicConvert from 'heic-convert';
import sharp from 'sharp';

export type MediaKind = 'PHOTO' | 'VIDEO';

const PHOTO_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.gif']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.webm', '.m4v', '.3gp', '.avi']);

/** Extensions that browsers can't reliably render and that we convert for display. */
const CONVERTIBLE_PHOTO_EXTENSIONS = new Set(['.heic', '.heif']);
const CONVERTIBLE_VIDEO_EXTENSIONS = new Set(['.mov']);

export function detectMediaKind(filename: string): MediaKind | null {
  const ext = path.extname(filename).toLowerCase();
  if (PHOTO_EXTENSIONS.has(ext)) return 'PHOTO';
  if (VIDEO_EXTENSIONS.has(ext)) return 'VIDEO';
  return null;
}

export function needsDisplayConversion(kind: MediaKind, filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return kind === 'PHOTO' ? CONVERTIBLE_PHOTO_EXTENSIONS.has(ext) : CONVERTIBLE_VIDEO_EXTENSIONS.has(ext);
}

/** Converts a HEIC/HEIF photo to a JPEG at `displayPath`. */
export async function createDisplayVersionForPhoto(
  originalPath: string,
  displayPath: string,
): Promise<void> {
  const inputBuffer = await readFile(originalPath);
  const outputBuffer = await heicConvert({ buffer: inputBuffer, format: 'JPEG', quality: 0.9 });
  await writeFile(displayPath, Buffer.from(outputBuffer));
}

export async function createThumbnailForPhoto(
  sourcePath: string,
  thumbnailPath: string,
): Promise<void> {
  // .autoOrient() bakes the EXIF orientation into the pixels before .jpeg() discards the
  // metadata on write - otherwise the thumbnail (unlike the original, which browsers rotate
  // correctly based on the EXIF tag) would stay unrotated.
  await sharp(sourcePath)
    .autoOrient()
    .resize(480, 480, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 70 })
    .toFile(thumbnailPath);
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args, { stdio: 'ignore' });
    proc.on('error', reject);
    proc.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });
}

/**
 * Re-encodes a video to H.264/AAC in an .mp4 container for broad browser compatibility.
 * A plain container remux (`-c copy`) isn't enough: a .mov can carry codecs (e.g. HEVC)
 * that many browsers still can't decode, so we transcode the streams rather than just
 * repackaging them. This runs in the background (see `after()` in the upload route), so
 * the extra CPU time doesn't block the upload response.
 */
export async function createDisplayVersionForVideo(
  originalPath: string,
  displayPath: string,
): Promise<void> {
  await runFfmpeg([
    '-y',
    '-i',
    originalPath,
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '23',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-movflags',
    '+faststart',
    displayPath,
  ]);
}

export async function createThumbnailForVideo(
  sourcePath: string,
  thumbnailPath: string,
): Promise<void> {
  await runFfmpeg([
    '-y',
    '-ss',
    '00:00:01',
    '-i',
    sourcePath,
    '-frames:v',
    '1',
    '-vf',
    'scale=480:-1',
    thumbnailPath,
  ]);
}
