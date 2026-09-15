import { NextResponse, type NextRequest } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';

// As of Next.js 16, the proxy runs on the Node.js runtime by default (no `export const runtime`
// possible/needed) — that's enough for node:crypto in lib/adminAuth.ts.

const IS_DEV = process.env.NODE_ENV === 'development';

// No nonce-based CSP (see the Next.js docs on "Content Security Policy"): that would force
// every page into dynamic rendering (no more static optimization) - disproportionate for this
// small, low-traffic app with no dangerouslySetInnerHTML/third-party scripts.
// 'unsafe-inline' on script-src is Next.js' own documented approach for apps without a strict
// nonce requirement; 'unsafe-eval' only in dev mode, because React uses it to reconstruct
// server error stacks in the browser (not needed in production).
const SECURITY_HEADERS: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=15552000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // Albums and media items are only reachable via a shared link, not meant to be indexed -
  // as a header rather than just a <meta> tag, because this also applies to image/video
  // responses (where no HTML <meta> is possible). robots.txt (app/robots.ts) covers crawling.
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Content-Security-Policy': [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${IS_DEV ? " 'unsafe-eval'" : ''}`,
    // 'unsafe-inline' for style-src: the app sets styles mostly via inline `style` attributes.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "media-src 'self' blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
};

function withSecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

const UPLOAD_PATH = /^\/api\/albums\/[^/]+\/upload$/;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
// Deliberately generous (see the ADR discussion): several guests can share one IP
// (shared event Wi-Fi), and individual guests often upload many photos/videos in a row.
const UPLOAD_RATE_LIMIT_MAX = 300;

// Much stricter than the upload limit: this isn't about accidental collisions between
// guests, it's about slowing down brute-force attempts against ADMIN_SECRET.
const ADMIN_LOGIN_PATH = '/api/admin/login';
const ADMIN_LOGIN_RATE_LIMIT_MAX = 10;

// Process-local counters: fine for this app's single-instance homelab deployment, not
// intended for distributed/multi-instance hosting.
function createRateLimiter(max: number) {
  const counters = new Map<string, { count: number; windowStart: number }>();
  return function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const entry = counters.get(ip);
    if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
      counters.set(ip, { count: 1, windowStart: now });
      return false;
    }
    entry.count += 1;
    return entry.count > max;
  };
}

const isUploadRateLimited = createRateLimiter(UPLOAD_RATE_LIMIT_MAX);
const isAdminLoginRateLimited = createRateLimiter(ADMIN_LOGIN_RATE_LIMIT_MAX);

function clientIp(request: NextRequest): string {
  return (
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

// Deliberately NOT x-forwarded-proto: Next.js synthesizes this header itself based on the
// actual (unencrypted) socket connection when it's missing - that would, e.g., permanently
// redirect `next dev` over http://localhost to a nonexistent HTTPS. CF-Visitor is only ever
// set by Cloudflare itself and reliably reflects the scheme the client actually used.
function isPlainHttpBehindCloudflare(request: NextRequest): boolean {
  const cfVisitor = request.headers.get('cf-visitor');
  if (!cfVisitor) return false;
  try {
    return (JSON.parse(cfVisitor) as { scheme?: string }).scheme === 'http';
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPlainHttpBehindCloudflare(request)) {
    const httpsUrl = new URL(request.url);
    httpsUrl.protocol = 'https:';
    return withSecurityHeaders(NextResponse.redirect(httpsUrl, 308));
  }

  if (
    UPLOAD_PATH.test(pathname) &&
    request.method === 'POST' &&
    isUploadRateLimited(clientIp(request))
  ) {
    return withSecurityHeaders(NextResponse.json({ error: 'rate_limited' }, { status: 429 }));
  }

  if (
    pathname === ADMIN_LOGIN_PATH &&
    request.method === 'POST' &&
    isAdminLoginRateLimited(clientIp(request))
  ) {
    return withSecurityHeaders(NextResponse.json({ error: 'rate_limited' }, { status: 429 }));
  }

  if (pathname.startsWith('/admin') && pathname !== '/admin/login' && !isAdminRequest(request)) {
    return withSecurityHeaders(NextResponse.redirect(new URL('/admin/login', request.url)));
  }

  if (
    pathname.startsWith('/api/admin') &&
    pathname !== '/api/admin/login' &&
    !isAdminRequest(request)
  ) {
    return withSecurityHeaders(NextResponse.json({ error: 'unauthorized' }, { status: 401 }));
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
