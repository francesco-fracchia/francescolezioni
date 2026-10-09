import { createPreviewToken, localPreviewAllowed, previewConfigured, previewCookie, previewHeaders, previewOriginAllowed, validPreviewPassword } from '@/lib/site-preview.mjs';

const reply = (body: unknown, status = 200, cookie?: string) => Response.json(body, { status, headers: { ...previewHeaders, ...(cookie ? { 'Set-Cookie': cookie } : {}) } });
export async function POST(request: Request) {
  if (process.env.APP_RUNTIME !== 'vercel') return reply({ error: 'Accesso non disponibile.' }, 404);
  if (!previewOriginAllowed(request)) return reply({ error: 'Richiesta non consentita.' }, 403);
  const local = localPreviewAllowed(request);
  if (!local && !previewConfigured()) return reply({ error: 'L’accesso riservato non è ancora attivo.' }, 503);
  try {
    const reader = request.body?.getReader();
    if (!reader) return reply({ error: 'Richiesta non valida.' }, 400);
    const chunks: Uint8Array[] = []; let size = 0;
    try {
      while (true) {
        const chunk = await reader.read(); if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > 2048) { await reader.cancel(); return reply({ error: 'Richiesta troppo grande.' }, 413); }
        chunks.push(chunk.value);
      }
    } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const body = JSON.parse(new TextDecoder().decode(bytes));
    if (!local && !validPreviewPassword(body?.password)) return reply({ error: 'Password non corretta.' }, 401);
    const token = local ? 'local' : createPreviewToken();
    return reply({ ok: true, destination: '/' }, 200, previewCookie(request, token));
  } catch { return reply({ error: 'Richiesta non valida.' }, 400); }
}
export async function DELETE(request: Request) {
  if (process.env.APP_RUNTIME !== 'vercel') return reply({ error: 'Accesso non disponibile.' }, 404);
  if (!previewOriginAllowed(request)) return reply({ error: 'Richiesta non consentita.' }, 403);
  return reply({ ok: true }, 200, previewCookie(request, null));
}
