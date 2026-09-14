import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { NextResponse } from 'next/server';

export async function serveFile(
  filePath: string,
  headers: Record<string, string>,
): Promise<Response> {
  try {
    const stats = await stat(filePath);
    const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
    return new Response(stream, {
      headers: { ...headers, 'Content-Length': String(stats.size) },
    });
  } catch {
    return NextResponse.json({ error: 'file_missing' }, { status: 404 });
  }
}
