import { createHmac, timingSafeEqual } from 'node:crypto';

function signature(body, secret) {
  if (typeof secret !== 'string' || secret.length < 32) throw new Error('Upload signing unavailable');
  return createHmac('sha256', secret).update('ff-private-upload-v1\n' + body).digest();
}
export function signUploadClaim(claim, secret) {
  const body = Buffer.from(JSON.stringify(claim)).toString('base64url');
  return body + '.' + signature(body, secret).toString('base64url');
}
export function readUploadClaim(value, secret, now = Date.now()) {
  if (typeof value !== 'string' || value.length > 3000) throw new Error('Invalid upload authorization');
  const parts = value.split('.');
  if (parts.length !== 2 || !parts.every(p => /^[\w-]+$/.test(p))) throw new Error('Invalid upload authorization');
  const received = Buffer.from(parts[1], 'base64url'), expected = signature(parts[0], secret);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) throw new Error('Invalid upload authorization');
  const claim = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
  if (!Number.isSafeInteger(claim.expires) || claim.expires < now) throw new Error('Upload authorization expired');
  return claim;
}
