import { createHmac, timingSafeEqual } from 'node:crypto';

export const ADMIN_SESSION_COOKIE = 'qpu_admin_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const ADMIN_SESSION_MAX_AGE_SECONDS = SESSION_TTL_MS / 1000;

function getSecret(): string {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    throw new Error('ADMIN_SECRET ist nicht gesetzt');
  }
  return secret;
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_SECRET);
}

/** Compares the string entered on the admin login with the configured admin secret. */
export function isValidAdminSecret(candidate: string): boolean {
  return isAdminConfigured() && safeEqual(candidate, getSecret());
}

/** Generates the signed, time-limited cookie value for an admin session — no server-side
 *  session store needed, the validity is embedded (signed) in the value itself. */
export function createAdminSessionCookieValue(): string {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = String(expiresAt);
  return `${payload}.${sign(payload, getSecret())}`;
}

function isValidAdminSessionCookieValue(value: string | undefined): boolean {
  if (!value || !isAdminConfigured()) return false;
  const separatorIndex = value.lastIndexOf('.');
  if (separatorIndex === -1) return false;
  const payload = value.slice(0, separatorIndex);
  const signature = value.slice(separatorIndex + 1);
  if (!safeEqual(signature, sign(payload, getSecret()))) return false;
  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

function extractCookieValue(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(';')) {
    const separatorIndex = part.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = part.slice(0, separatorIndex).trim();
    if (key === name) return decodeURIComponent(part.slice(separatorIndex + 1).trim());
  }
  return undefined;
}

/** Checks whether an incoming request carries a valid administrator session. Deliberately
 *  "fails closed" (no access) when ADMIN_SECRET is not configured. */
export function isAdminRequest(request: Request): boolean {
  try {
    const value = extractCookieValue(request.headers.get('cookie'), ADMIN_SESSION_COOKIE);
    return isValidAdminSessionCookieValue(value);
  } catch {
    return false;
  }
}
