import { NextResponse, type NextRequest } from 'next/server';
import { getNodeResources } from '@/lib/node/runtime.mjs';
import { privateAccessAllowed } from './lib/node/private-access.mjs';
import { getVercelResources, vercelRuntimeReady } from '@/lib/vercel/runtime.mjs';
import { previewAllowed, previewPathAllowed } from '@/lib/site-preview.mjs';
import { recoveryPath } from '@/lib/page-recovery';

export async function proxy(request: NextRequest) {
  const runtime = process.env.APP_RUNTIME;
  if (runtime !== 'node' && runtime !== 'vercel') return NextResponse.next();
  const pathname = new URL(request.url).pathname;
  const apiRequest = pathname === '/api' || pathname.startsWith('/api/');
  const headers = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' };
  const allowRequest = (preparation = false, preview = false, status = 200) => {
    if (runtime !== 'vercel') return NextResponse.next(preparation ? {status,headers} : undefined);
    const clean = new Headers(request.headers);
    for (const name of [...clean.keys()]) if (name.startsWith('oai-') || name === 'cf-connecting-ip' || name === 'x-ff-site-preview') clean.delete(name);
    if (preview) {
      clean.set('x-ff-site-preview', '1');
      // A marketing preview never resolves an existing account or opens
      // purchase controls, even on loopback with another app's session cookie.
      clean.delete('cookie');
    }
    return NextResponse.next({ status, request: { headers: clean }, ...(preparation || preview ? { headers } : {}) });
  };
  // This screen and its assets must not depend on a working database/session.
  // It contains no account data or operational controls.
  if (pathname === '/indisponibile') {
    const response = allowRequest(true, false, 503);
    response.headers.set('Retry-After', '60');
    return response;
  }
  if (pathname.startsWith('/_next/static/') ||
      ['/favicon.svg', '/favicon.ico', '/apple-touch-icon.png', '/francesco-fracchia-logo.png', '/francesco-fracchia-logo-256.webp', '/francesco-fracchia-logo-512.webp', '/francesco-fracchia-logo-768.webp'].includes(pathname)) return allowRequest();
  if (runtime === 'vercel') {
    // The initial deployment is useful without services, but never accepts
    // requests, trusts OAI headers or creates ephemeral local student data.
    if (['/preparazione', '/privacy', '/anteprima', '/api/anteprima', '/favicon.svg', '/favicon.ico', '/apple-touch-icon.png', '/francesco-fracchia-logo.png', '/francesco-fracchia-logo-256.webp', '/francesco-fracchia-logo-512.webp', '/francesco-fracchia-logo-768.webp'].includes(pathname) || pathname.startsWith('/_next/static/')) {
      const publicPrivacy = pathname === '/privacy' && process.env.VERCEL_ENV === 'production' && process.env.SITE_VISIBILITY === 'public' && vercelRuntimeReady();
      return allowRequest(!publicPrivacy && ['/preparazione', '/privacy', '/anteprima', '/api/anteprima'].includes(pathname));
    }
    const preview = previewAllowed(request);
    if (preview && previewPathAllowed(pathname)) return allowRequest(false, true);
    if (preview && apiRequest && !(pathname==='/api/calendari/lezioni'&&['GET','HEAD'].includes(request.method))) return NextResponse.json({ error: 'Anteprima riservata: le funzioni operative sono disattivate.' }, { status: 503, headers });
    if (!vercelRuntimeReady()) {
      if (apiRequest) return NextResponse.json({ error: 'Piattaforma non ancora configurata.' }, { status: 503, headers });
      if (pathname === '/robots.txt') return new NextResponse('User-agent: *\nDisallow: /\n', { headers: { ...headers, 'Content-Type': 'text/plain' } });
      if (pathname === '/sitemap.xml') return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>', { headers: { ...headers, 'Content-Type': 'application/xml' } });
      const destination = new URL('/preparazione', request.url);
      destination.search = '';
      return NextResponse.redirect(destination, { status: 307, headers });
    }
  }
  // Search-control documents contain no account data. In private mode they
  // serve the explicit crawl block/empty sitemap instead of a login redirect.
  // The unconfigured Vercel branch above still serves its closed documents.
  if (pathname === '/robots.txt' || pathname === '/sitemap.xml') return allowRequest();
  try {
    const db = runtime === 'vercel' ? getVercelResources().DB : getNodeResources().DB;
    if (await privateAccessAllowed(request, db)) return allowRequest();
    if (apiRequest) return NextResponse.json({ error: 'Sito privato durante i preparativi. Accedi come tutor.' }, { status: 403, headers });
    // Configuring the data services must not turn the visitor landing page
    // into a login screen. Keep account and purchase flows behind login.
    const preparation = runtime === 'vercel' && pathname !== '/acquista' && previewPathAllowed(pathname);
    const destination = new URL(preparation ? '/preparazione' : '/accesso', request.url);
    return NextResponse.redirect(destination, { status: 307, headers });
  } catch {
    if (apiRequest) return NextResponse.json({ error: 'Piattaforma temporaneamente non disponibile.' }, { status: 503, headers });
    const destination = new URL('/indisponibile', request.url);
    destination.searchParams.set('da', recoveryPath(pathname));
    return NextResponse.rewrite(destination, {status:503,headers:{...headers,'Retry-After':'60'}});
  }
}
export const config = { matcher: '/:path*' };
