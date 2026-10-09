import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AsyncLocalStorage } from 'node:async_hooks';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { createLocalSitesAuth } from '../build/local-sites-auth.mjs';

function request(url = '/', { host = '127.0.0.1:5173', remote = '127.0.0.1', ...headers } = {}) {
  return { url, method: 'GET', headers: { host, ...headers }, rawHeaders: Object.entries({ host, ...headers }).flat(), socket: { remoteAddress: remote } };
}
function run(req) {
  const headers = new Map();
  const response = { statusCode: 200, setHeader: (key, value) => headers.set(key, value), end() {} };
  let continued = false;
  createLocalSitesAuth()(req, response, () => { continued = true; });
  return { ...response, headers, continued };
}
test('Next development sign-in remains explicit, loopback-only and strips forged identity', () => {
  let req = request('/', { 'oai-authenticated-user-email': 'forged@example.com' });
  run(req);
  assert.equal(req.headers['oai-authenticated-user-email'], undefined);
  req = request('/', { cookie: '__sites_local_auth=1; ff_session=preserved' });
  assert.equal(run(req).continued, true);
  assert.equal(req.headers['oai-authenticated-user-email'], 'seedy@sites.test');
  assert.equal(req.headers.cookie, 'ff_session=preserved');
  for (const options of [{ host: 'example.com' }, { remote: '192.0.2.1' }]) {
    req = request('/', { ...options, cookie: '__sites_local_auth=1', 'oai-authenticated-user-email': 'forged@example.com' });
    run(req);
    assert.equal(req.headers['oai-authenticated-user-email'], undefined);
    assert.equal(run(request('/signin-with-chatgpt', options)).statusCode, 403);
  }
  req = request('/', { cookie: '__sites_local_auth=1; __sites_local_auth=1' });
  run(req);
  assert.equal(req.headers['oai-authenticated-user-id'], undefined);
  assert.equal(run(request('/signin-with-chatgpt', { origin: 'https://evil.example' })).statusCode, 403);
  const signedIn = run(request('/signin-with-chatgpt?return_to=https%3A%2F%2Fevil.example'));
  assert.equal(signedIn.headers.get('Location'), '/');
  assert.match(signedIn.headers.get('Set-Cookie'), /HttpOnly; SameSite=Lax/);
  const prefetched = run(request('/signin-with-chatgpt', { purpose: 'prefetch' }));
  assert.equal(prefetched.statusCode, 204);
  assert.equal(prefetched.headers.get('Set-Cookie'), undefined);
  assert.match(run(request('/signout-with-chatgpt')).headers.get('Set-Cookie'), /Max-Age=0/);
});

test('Next runtime bindings are lazy and stay inside each request', async () => {
  const contexts = new AsyncLocalStorage();
  globalThis.__nextRuntimeContext = () => {
    const context = contexts.getStore();
    if (!context) throw new Error('No request context');
    return context;
  };
  try {
    const source = (await readFile(new URL('../lib/runtime-env.ts', import.meta.url), 'utf8'))
      .replace("import { getVercelResources } from '@/lib/vercel/runtime.mjs';", 'const getVercelResources = () => { throw new Error("Unexpected Vercel runtime"); };')
      .replace("import { getNodeResources } from '@/lib/node/runtime.mjs';", 'const getNodeResources = () => { throw new Error("Unexpected Node runtime"); };')
      .replace("import { getCloudflareContext } from '@opennextjs/cloudflare';", 'const getCloudflareContext = globalThis.__nextRuntimeContext;');
    const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
    const { env } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
    assert.throws(() => env.DB, /No request context/);
    const values = await Promise.all(['first', 'second'].map(id => contexts.run({ env: { DB: id } }, async () => {
      await new Promise(resolve => setTimeout(resolve, id === 'first' ? 15 : 1));
      return env.DB;
    })));
    assert.deepEqual(values, ['first', 'second']);
    assert.throws(() => env.DB, /No request context/);
  } finally {
    delete globalThis.__nextRuntimeContext;
  }
});

test('Worker derives forwarded origin from Request.url, never client headers', async () => {
  globalThis.__nextWorkerTest = { fetch: (request, env, ctx) => ({ request, env, ctx }) };
  try {
    const source = (await readFile(new URL('../build/sites-next-worker.mjs', import.meta.url), 'utf8'))
      .replace("import worker from '../.open-next/worker.js';", 'const worker = globalThis.__nextWorkerTest;')
      .replace("export * from '../.open-next/worker.js';", '');
    const { default: worker } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
    const env = { DB: 'request-only' }, ctx = { props: {} };
    const result = worker.fetch(new Request('https://site.example/api/accesso', {
      method: 'POST', body: 'payload', headers: {
        host: 'evil.example', 'x-forwarded-host': 'evil.example',
        'x-forwarded-proto': 'http', origin: 'https://evil.example',
        cookie: 'ff_session=preserved',
      },
    }), env, ctx);
    assert.equal(result.request.url, 'https://site.example/api/accesso');
    assert.equal(result.request.headers.get('host'), 'site.example');
    assert.equal(result.request.headers.get('x-forwarded-host'), 'site.example');
    assert.equal(result.request.headers.get('x-forwarded-proto'), 'https');
    assert.equal(result.request.headers.get('origin'), 'https://evil.example');
    assert.equal(result.request.headers.get('cookie'), 'ff_session=preserved');
    assert.equal(await result.request.text(), 'payload');
    assert.equal(result.env, env);
    assert.equal(result.ctx, ctx);
  } finally { delete globalThis.__nextWorkerTest; }
});
