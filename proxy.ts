import { NextResponse, type NextRequest } from 'next/server';
import { isAdminRequest } from '@/lib/adminAuth';

// Proxy laeuft seit Next.js 16 standardmaessig mit Node.js-Runtime (kein `export const runtime`
// moeglich/noetig) — reicht fuer node:crypto in lib/adminAuth.ts.

const IS_DEV = process.env.NODE_ENV === 'development';

// Kein Nonce-basiertes CSP (siehe Next.js-Doku "Content Security Policy"): das würde jede Seite
// zu dynamischem Rendering zwingen (keine statische Optimierung mehr) - für diese kleine,
// wenig frequentierte App ohne dangerouslySetInnerHTML/Drittanbieter-Skripte unverhältnismäßig.
// 'unsafe-inline' bei script-src ist Next.js' eigener dokumentierter Weg für Apps ohne strikten
// Nonce-Bedarf; 'unsafe-eval' nur im Dev-Modus, weil React dafür Server-Fehler-Stacks im Browser
// rekonstruiert (in Produktion nicht nötig).
const SECURITY_HEADERS: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=15552000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${IS_DEV ? " 'unsafe-eval'" : ''}`,
    // 'unsafe-inline' fuer style-src: die App setzt Styles ueberwiegend als inline `style`-Attribute.
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
// Grosszuegig bemessen (siehe ADR-Diskussion): mehrere Gaeste koennen sich eine IP teilen
// (gemeinsames Event-WLAN), und einzelne Gaeste laden oft viele Fotos/Videos am Stueck hoch.
const RATE_LIMIT_MAX = 300;

// Prozesslokaler Zaehler: passend fuer die Single-Instance-Homelab-Deployment dieser App, nicht
// fuer verteiltes/Multi-Instance-Hosting gedacht.
const uploadCounters = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = uploadCounters.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    uploadCounters.set(ip, { count: 1, windowStart: now });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

function clientIp(request: NextRequest): string {
  return (
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

// Bewusst NICHT x-forwarded-proto: Next.js synthetisiert diesen Header selbst anhand der
// tatsaechlichen (unverschluesselten) Socket-Verbindung, wenn er fehlt - das haette z.B. `next
// dev` ueber http://localhost dauerhaft auf ein nicht existierendes HTTPS umgeleitet. CF-Visitor
// wird nur von Cloudflare selbst gesetzt und spiegelt zuverlaessig das vom Client genutzte Schema.
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

  if (UPLOAD_PATH.test(pathname) && request.method === 'POST' && isRateLimited(clientIp(request))) {
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
