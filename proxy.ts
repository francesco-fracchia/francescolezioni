import { NextResponse, type NextRequest } from 'next/server';
import { getNodeResources } from '@/lib/node/runtime.mjs';
import { privateAccessAllowed } from './lib/node/private-access.mjs';

export async function proxy(request: NextRequest) {
  if (process.env.APP_RUNTIME !== 'node') return NextResponse.next();
  try {
    if (await privateAccessAllowed(request, getNodeResources().DB)) return NextResponse.next();
    const headers = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' };
    if (new URL(request.url).pathname.startsWith('/api/')) return NextResponse.json({ error: 'Sito privato durante i preparativi. Accedi come tutor.' }, { status: 403, headers });
    const destination = new URL('/accesso', request.url);
    return NextResponse.redirect(destination, { status: 307, headers });
  } catch {
    return NextResponse.json({ error: 'Piattaforma temporaneamente non disponibile.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
export const config = { matcher: '/:path*' };
