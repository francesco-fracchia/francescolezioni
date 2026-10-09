import { createServer } from 'node:http';
import path from 'node:path';
import next from 'next';
import { getNodeResources, dataDirectory } from '../lib/node/runtime.mjs';
import { openDatabase } from '../lib/node/database.mjs';
import { migrateDatabase } from '../lib/node/migrations.mjs';
import { createFirstTutor } from '../lib/node/bootstrap.mjs';
import { readFileSync } from 'node:fs';

process.env.APP_RUNTIME = 'node';
process.env.NODE_ENV = 'production';
process.umask(0o077);
const built = JSON.parse(readFileSync(path.resolve('.next/required-server-files.json'), 'utf8'));
if (built.config.env?.APP_RUNTIME !== 'node') throw new Error('Run npm run build:hostinger before starting the independent runtime.');
const origin = new URL(process.env.SITE_ORIGIN || '');
if (origin.protocol !== 'https:' || origin.origin !== process.env.SITE_ORIGIN || origin.username || origin.password) throw new Error('SITE_ORIGIN must be the exact HTTPS origin.');
if (process.env.SITE_VISIBILITY !== 'public' && process.env.PUBLIC_SITE_INDEXING === 'true') throw new Error('A private site cannot enable indexing.');
const root = dataDirectory();
if (process.env.HOSTINGER_AUTO_MIGRATE === '1') {
  const db = openDatabase(path.join(root, 'platform.sqlite'), { mustExist: false });
  try { migrateDatabase(db, path.resolve('drizzle')); } finally { db.close(); }
}
const { DB } = getNodeResources();
if (!await DB.prepare("SELECT id FROM accounts WHERE role='tutor' AND status='active'").first()) {
  await createFirstTutor(DB, process.env.HOSTINGER_BOOTSTRAP_EMAIL, process.env.HOSTINGER_BOOTSTRAP_PASSWORD);
}
delete process.env.HOSTINGER_BOOTSTRAP_PASSWORD;
delete process.env.HOSTINGER_BOOTSTRAP_EMAIL;
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
const hostname = process.env.HOSTINGER_BIND_ADDRESS || '0.0.0.0';
// Next uses these values when constructing Request.url. The actual listener
// has its separate internal PORT behind Hostinger's HTTPS reverse proxy.
const app = next({ dev: false, hostname: origin.hostname, port: Number(origin.port || 443) });
await app.prepare();
const handle = app.getRequestHandler();
const server = createServer((request, response) => {
  // The configured origin replaces client-supplied forwarding headers. Both
  // CSRF comparisons and Secure cookies see the same public HTTPS origin.
  for (const key of Object.keys(request.headers)) if (key.startsWith('oai-') || key.startsWith('x-forwarded-') || key === 'forwarded' || key === 'cf-connecting-ip') delete request.headers[key];
  request.headers.host = origin.host;
  request.headers['x-forwarded-host'] = origin.host;
  request.headers['x-forwarded-proto'] = 'https';
  request.headers['x-forwarded-port'] = origin.port || '443';
  // Per-email/global persisted rate limits remain active. Do not trust an IP
  // supplied by the visitor; configure proxy-specific IP handling separately.
  handle(request, response).catch(() => { if (!response.headersSent) response.writeHead(503, { 'Cache-Control': 'no-store' }); response.end(); });
});
server.listen(port, hostname, () => console.log(`Hostinger runtime listening on port ${port}; ${process.env.SITE_VISIBILITY === 'public' ? 'public' : 'private'} access.`));
async function stop() {
  server.close();
  await app.close();
  DB.close();
  process.exit(0);
}
process.once('SIGTERM', stop);
process.once('SIGINT', stop);
