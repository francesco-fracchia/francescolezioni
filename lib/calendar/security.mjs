import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

export class CalendarError extends Error {
  constructor(message, status = 503) { super(message); this.status = status; }
}
export const calendarHeaders = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow, noarchive', 'Referrer-Policy': 'no-referrer', Vary: 'Cookie' };
export const tokenHash = token => createHash('sha256').update(token).digest('hex');
export const newCalendarToken = () => randomBytes(32).toString('base64url');
export function calendarKeyReady(key) { return typeof key === 'string' && /^[a-f0-9]{64}$/.test(key); }
function connectionKey(key) {
  if (!calendarKeyReady(key)) throw new CalendarError('Il collegamento dei calendari non è ancora configurato sul server.');
  return Buffer.from(key, 'hex');
}
export function sealCalendarValue(value, key, accountId, purpose) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', connectionKey(key), iv);
  cipher.setAAD(Buffer.from(`ff-calendar-v1:${accountId}:${purpose}`));
  const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), data.toString('base64url')].join('.');
}
export function openCalendarValue(encoded, key, accountId, purpose) {
  try {
    const [version, iv, tag, value, extra] = String(encoded).split('.');
    if (version !== 'v1' || extra !== undefined || !iv || !tag || !value) throw Error();
    const decipher = createDecipheriv('aes-256-gcm', connectionKey(key), Buffer.from(iv, 'base64url'));
    decipher.setAAD(Buffer.from(`ff-calendar-v1:${accountId}:${purpose}`));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(value, 'base64url')), decipher.final()]).toString('utf8'));
  } catch { throw new CalendarError('Collegamento non leggibile. Ricollega il calendario o rigenera il link.'); }
}
