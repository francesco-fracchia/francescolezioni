import { NextResponse, type NextRequest } from 'next/server';
import { getNodeResources } from '@/lib/node/runtime.mjs';
import { privateAccessAllowed } from './lib/node/private-access.mjs';
import { getVercelResources, vercelRuntimeReady } from '@/lib/vercel/runtime.mjs';
import { previewAllowed, previewPathAllowed } from '@/lib/site-preview.mjs';

export async function proxy(request: NextRequest) {
  const runtime = process.env.APP_RUNTIME;
  if (runtime !== 'node' && runtime !== 'vercel') return NextResponse.next();
  const pathname = new URL(request.url).pathname;
  const headers = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' };
  const allowRequest = (preparation = false, preview = false) => {
    if (runtime !== 'vercel') return NextResponse.next();
    const clean = new Headers(request.headers);
    for (const name of [...clean.keys()]) if (name.startsWith('oai-') || name === 'cf-connecting-ip' || name === 'x-ff-site-preview') clean.delete(name);
    if (preview) {
      clean.set('x-ff-site-preview', '1');
      // A marketing preview never resolves an existing account or opens
      // purchase controls, even on loopback with another app's session cookie.
      clean.delete('cookie');
    }
    return NextResponse.next({ request: { headers: clean }, ...(preparation || preview ? { headers } : {}) });
  };
  if (runtime === 'vercel') {
    // The initial deployment is useful without services, but never accepts
    // requests, trusts OAI headers or creates ephemeral local student data.
    if (['/preparazione', '/anteprima', '/api/anteprima', '/favicon.svg', '/francesco-fracchia-logo.png'].includes(pathname) || pathname.startsWith('/_next/static/')) return allowRequest(['/preparazione', '/anteprima', '/api/anteprima'].includes(pathname));
    const preview = previewAllowed(request);
    if (preview && previewPathAllowed(pathname)) return allowRequest(false, true);
    if (preview && pathname.startsWith('/api/')) return NextResponse.json({ error: 'Anteprima riservata: le funzioni operative sono disattivate.' }, { status: 503, headers });
    if (!vercelRuntimeReady()) {
      if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Piattaforma non ancora configurata.' }, { status: 503, headers });
      if (pathname === '/robots.txt') return new NextResponse('User-agent: *\nDisallow: /\n', { headers: { ...headers, 'Content-Type': 'text/plain' } });
      if (pathname === '/sitemap.xml') return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>', { headers: { ...headers, 'Content-Type': 'application/xml' } });
      const destination = new URL('/preparazione', request.url);
      destination.search = '';
      return NextResponse.redirect(destination, { status: 307, headers });
    }
  }
  try {
    const db = runtime === 'vercel' ? getVercelResources().DB : getNodeResources().DB;
    if (await privateAccessAllowed(request, db)) return allowRequest();
    if (new URL(request.url).pathname.startsWith('/api/')) return NextResponse.json({ error: 'Sito privato durante i preparativi. Accedi come tutor.' }, { status: 403, headers });
    const destination = new URL('/accesso', request.url);
    return NextResponse.redirect(destination, { status: 307, headers });
  } catch {
    return NextResponse.json({ error: 'Piattaforma temporaneamente non disponibile.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
export const config = { matcher: '/:path*' };
