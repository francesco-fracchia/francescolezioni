import { createHash } from 'node:crypto';

export async function privateAccessAllowed(request, database, visibility = process.env.SITE_VISIBILITY) {
  if (visibility === 'public') return true;
  const pathname = new URL(request.url).pathname;
  // Only the login form, its assets and account/password controls are public
  // during preparation. Free slots, contact forms and files stay inaccessible.
  if (['/accesso', '/account', '/api/accesso', '/favicon.svg', '/francesco-fracchia-logo.png'].includes(pathname) || pathname.startsWith('/_next/static/')) return true;
  const values = (request.headers.get('cookie') || '').split(';').map(value => value.trim()).filter(value => value.startsWith('ff_session=')).map(value => value.slice(11));
  if (values.length !== 1 || !/^[A-Za-z0-9_-]{43}$/.test(values[0])) return false;
  const digest = createHash('sha256').update(values[0]).digest('hex');
  const account = await database.prepare("SELECT a.id FROM accounts a JOIN account_sessions s ON s.account_id=a.id AND s.auth_version=a.auth_version WHERE s.token_hash=? AND s.expires_at>? AND a.status='active' AND a.role='tutor' AND a.must_change_password=0").bind(digest, Date.now()).first();
  return !!account;
}
