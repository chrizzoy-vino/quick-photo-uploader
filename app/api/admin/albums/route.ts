import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';
import { adminRepository } from '@/lib/repositories';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const albums = await adminRepository.listAlbums();
  return NextResponse.json({ albums });
}
