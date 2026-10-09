import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const previewCookieName = 'ff_site_preview';
export const previewLifetime = 4 * 60 * 60;
export const previewHeaders = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow', Vary: 'Cookie' };
export function localPreviewAllowed(request, config = process.env) {
  if (config.APP_RUNTIME !== 'vercel' || config.VERCEL === '1' || config.VERCEL_ENV) return false;
  try { return ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(request.url).hostname); } catch { return false; }
}
export function previewConfigured(config = process.env) {
  return typeof config.SITE_PREVIEW_PASSWORD === 'string' && config.SITE_PREVIEW_PASSWORD.length >= 20 && config.SITE_PREVIEW_PASSWORD.length <= 256;
}
function hash(value) { return createHash('sha256').update(value).digest(); }
function sign(value, config) { return createHmac('sha256', hash('ff-site-preview-v1:' + config.SITE_PREVIEW_PASSWORD)).update(value).digest('base64url'); }
export function validPreviewPassword(value, config = process.env) {
  return previewConfigured(config) && typeof value === 'string' && value.length <= 256 && timingSafeEqual(hash(value), hash(config.SITE_PREVIEW_PASSWORD));
}
export function createPreviewToken(config = process.env, now = Date.now()) {
  if (!previewConfigured(config)) throw new Error('Preview access is not configured');
  const payload = `v1.${Math.floor(now / 1000) + previewLifetime}.${randomBytes(16).toString('base64url')}`;
  return payload + '.' + sign(payload, config);
}
export function previewAllowed(request, config = process.env, now = Date.now()) {
  const values = (request.headers.get('cookie') || '').split(';').map(value => value.trim()).filter(value => value.startsWith(previewCookieName + '=')).map(value => value.slice(previewCookieName.length + 1));
  if (values.length !== 1) return false;
  if (localPreviewAllowed(request, config)) return values[0] === 'local';
  if (!previewConfigured(config)) return false;
  const match = /^(v1\.([0-9]{10})\.[A-Za-z0-9_-]{22})\.([A-Za-z0-9_-]{43})$/.exec(values[0]);
  if (!match) return false;
  const expires = Number(match[2]), current = Math.floor(now / 1000);
  if (expires <= current || expires > current + previewLifetime) return false;
  return timingSafeEqual(Buffer.from(match[3], 'base64url'), Buffer.from(sign(match[1], config), 'base64url'));
}
export function previewCookie(request, token) {
  const secure = !localPreviewAllowed(request);
  return `${previewCookieName}=${token || ''}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${token ? previewLifetime : 0}${secure ? '; Secure' : ''}`;
}
export function previewOriginAllowed(request) {
  return request.headers.get('origin') === new URL(request.url).origin && request.headers.get('sec-fetch-site') !== 'cross-site';
}

// This is an explicit list of marketing pages and assets; never match private
// workspaces, account controls, mutations, signed files or arbitrary extensions.
const pages = new Set(['/', '/catalogo', '/prezzi', '/metodo', '/francesco', '/lodi', '/domande', '/privacy', '/piattaforma', '/percorsi', '/esami', '/maturita', '/contatti', '/incontro', '/invita', '/acquista']);
export function previewPathAllowed(path) {
  return pages.has(path) || /^\/esami\/[a-z0-9-]+$/.test(path) || /^\/lezioni\/(matematica|informatica)$/.test(path) || /^\/images\/[a-z0-9-]+\.(?:jpg|png|svg|webp)$/.test(path) || /^\/illustrations\/[a-z0-9-]+\.svg$/.test(path);
}
