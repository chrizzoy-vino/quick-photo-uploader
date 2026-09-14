import { access, mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';

const STORAGE_ROOT = process.env.STORAGE_ROOT ?? './data/albums';

export function albumDirectory(slug: string): string {
  // STORAGE_ROOT comes from an env var (fixed at deploy time via Docker), not user input;
  // the ignore comment stops Turbopack from bundle-tracing the whole project as a precaution.
  return path.join(/* turbopackIgnore: true */ STORAGE_ROOT, slug);
}

export function originalDirectory(slug: string): string {
  return path.join(albumDirectory(slug), 'original');
}

export function displayDirectory(slug: string): string {
  return path.join(albumDirectory(slug), 'display');
}

export function thumbnailDirectory(slug: string): string {
  return path.join(albumDirectory(slug), 'thumb');
}

export async function ensureAlbumDirectories(slug: string): Promise<void> {
  await Promise.all([
    mkdir(originalDirectory(slug), { recursive: true }),
    mkdir(displayDirectory(slug), { recursive: true }),
    mkdir(thumbnailDirectory(slug), { recursive: true }),
  ]);
}

export async function removeAlbumDirectory(slug: string): Promise<void> {
  await rm(albumDirectory(slug), { recursive: true, force: true });
}

export const fsFileExistenceChecker = {
  async exists(filePath: string): Promise<boolean> {
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  },
};

export const fsFileRemover = {
  async remove(filePath: string): Promise<void> {
    await rm(filePath, { force: true });
  },
};

export async function fileSize(filePath: string): Promise<number> {
  const stats = await stat(filePath);
  return stats.size;
}
