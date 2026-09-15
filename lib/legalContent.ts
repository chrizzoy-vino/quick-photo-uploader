import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { marked } from 'marked';

const CONTENT_ROOT = process.env.CONTENT_ROOT ?? './data/content';

/** Reads an operator-provided legal-page markdown file (Impressum, Datenschutz) from
 *  CONTENT_ROOT and renders it to HTML. Returns null if the file doesn't exist yet, so the
 *  caller can fall back to a placeholder instead of failing the request.
 *
 *  These files are never part of the git repo or the built image (see ADR-0010): they're
 *  mounted at runtime from the operator's own `data/content/` directory, since they contain
 *  the operator's real name/address and are edited independently of app deployments. The
 *  markdown comes from a file the operator controls, not from user input. */
export async function readLegalPageHtml(filename: string): Promise<string | null> {
  const filePath = path.join(/* turbopackIgnore: true */ CONTENT_ROOT, filename);
  let markdown: string;
  try {
    markdown = await readFile(filePath, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
  return marked.parse(markdown, { async: false });
}
