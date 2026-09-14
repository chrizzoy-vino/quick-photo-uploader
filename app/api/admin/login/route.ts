import { NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminSessionCookieValue,
  isAdminConfigured,
  isValidAdminSecret,
} from '@/lib/adminAuth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: 'admin_not_configured' }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as { secret?: unknown } | null;
  const secret = typeof body?.secret === 'string' ? body.secret : '';

  if (!secret || !isValidAdminSecret(secret)) {
    return NextResponse.json({ error: 'invalid_secret' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSessionCookieValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
