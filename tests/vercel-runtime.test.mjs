import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { openDatabase } from '../lib/node/database.mjs';
import { createRemoteDatabase } from '../lib/vercel/database.mjs';
import { createRemoteBucket } from '../lib/vercel/bucket.mjs';
import { vercelResourcesConfigured, vercelRuntimeReady } from '../lib/vercel/runtime.mjs';
import { privateAccessAllowed } from '../lib/node/private-access.mjs';

const accountId = 'a'.repeat(32), databaseId = '00000000-0000-4000-8000-000000000001';
test('Vercel preview cannot send real email or payments even with production configuration', async () => {
  const keys = ['APP_RUNTIME', 'VERCEL_ENV', 'PUBLIC_SITE_INDEXING', 'NOTIFICATIONS_MODE', 'PAYMENT_LIVE_ENABLED', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'RESEND_API_KEY'];
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  const source = (await readFile(new URL('../lib/runtime-env.ts', import.meta.url), 'utf8'))
    .replace("import { getCloudflareContext } from '@opennextjs/cloudflare';", 'const getCloudflareContext = () => { throw Error("Unexpected Cloudflare runtime"); };')
    .replace("import { getNodeResources } from '@/lib/node/runtime.mjs';", 'const getNodeResources = () => { throw Error("Unexpected local runtime"); };')
    .replace("import { getVercelResources } from '@/lib/vercel/runtime.mjs';", 'const getVercelResources = () => { throw Error("Configuration reads must not access data"); };');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
  const { env } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
  try {
    Object.assign(process.env, { APP_RUNTIME: 'vercel', VERCEL_ENV: 'preview', PUBLIC_SITE_INDEXING: 'true', NOTIFICATIONS_MODE: 'live', PAYMENT_LIVE_ENABLED: '1', STRIPE_SECRET_KEY: 'fixture', STRIPE_WEBHOOK_SECRET: 'fixture', RESEND_API_KEY: 'fixture' });
    assert.equal(env.PUBLIC_SITE_INDEXING, 'false');
    assert.equal(env.NOTIFICATIONS_MODE, 'preview');
    assert.equal(env.PAYMENT_LIVE_ENABLED, '0');
    for (const key of ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'RESEND_API_KEY']) assert.equal(env[key], undefined);
  } finally {
    for (const key of keys) if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
  }
});
test('Remote D1 sends bound statements as one batch and preserves RETURNING and rollback contract', async () => {
  const local = openDatabase(':memory:', { mustExist: false });
  local.sql.exec('CREATE TABLE balances(id TEXT PRIMARY KEY, amount INTEGER NOT NULL)');
  let calls = 0;
  const remote = createRemoteDatabase({ accountId, databaseId, token: 'fixture', fetcher: async (url, options) => {
    calls++;
    assert.equal(url, `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`);
    assert.equal(options.headers.Authorization, 'Bearer fixture');
    assert.equal(options.redirect, 'error');
    assert.equal(options.cache, 'no-store');
    const { batch } = JSON.parse(options.body);
    try { return Response.json({ success: true, result: await local.batch(batch.map(s => local.prepare(s.sql).bind(...s.params))) }); }
    catch { return Response.json({ success: false, errors: [{ message: 'private SQL details' }] }, { status: 400 }); }
  } });
  try {
    const id = "student' OR 1=1 --";
    let results = await remote.batch([remote.prepare('INSERT INTO balances VALUES(?,?) RETURNING id,amount').bind(id, 20), remote.prepare('SELECT amount FROM balances WHERE id=?').bind(id)]);
    assert.equal(calls, 1);
    assert.equal(results[0].results[0].amount, 20);
    assert.equal(results[0].meta.changes, 1);
    assert.equal(results[1].meta.changes, 0);
    const before = calls;
    await assert.rejects(remote.batch([remote.prepare('UPDATE balances SET amount=0'), remote.prepare('INSERT INTO balances VALUES(?,?)').bind(id, 5)]), /Remote database query failed/);
    assert.equal(calls, before + 1); // uncertain writes are never replayed
    assert.equal(await remote.prepare('SELECT amount FROM balances').first('amount'), 20);
    assert.equal(await remote.prepare('SELECT amount FROM balances WHERE id=?').bind('absent').first(), null);
    const other = createRemoteDatabase({ accountId, databaseId, token: 'fixture' });
    await assert.rejects(remote.batch([other.prepare('SELECT 1')]), /another database/);
    assert.throws(() => remote.prepare('SELECT ?').bind(NaN), /Unsupported/);
  } finally { local.close(); }
});

test('Remote archive remains private, validates ranges and pins downloads to the selected object version', async () => {
  const calls = [];
  const fixture = new TextEncoder().encode('0123456789');
  const bucket = createRemoteBucket({ accountId, bucket: 'private-materials', accessKeyId: 'fixture', secretAccessKey: 'fixture', client: { async send(command) {
    calls.push(command);
    assert.equal(command.input.Bucket, 'private-materials');
    assert.equal(command.input.ACL, undefined);
    if (command.constructor.name === 'HeadObjectCommand') {
      if (command.input.Key === 'missing') throw { name: 'NotFound' };
      return { ContentLength: fixture.length, ETag: '"fixture-version"', LastModified: new Date(0) };
    }
    if (command.constructor.name === 'GetObjectCommand') {
      assert.equal(command.input.IfMatch, '"fixture-version"');
      const bytes = command.input.Range === 'bytes=2-5' ? fixture.slice(2, 6) : fixture;
      return { Body: { transformToWebStream: () => new Blob([bytes]).stream() } };
    }
    return { ETag: '"fixture-version"' };
  } } });
  const object = await bucket.get('course/private.pdf', { range: new Headers({ range: 'bytes=2-5' }) });
  assert.equal(await new Response(object.body).text(), '2345');
  assert.deepEqual(object.range, { offset: 2, length: 4 });
  assert.equal(object.size, 10);
  const before = calls.length;
  await assert.rejects(bucket.get('course/private.pdf', { range: new Headers({ range: 'bytes=20-' }) }), e => e.code === 'RANGE_NOT_SATISFIABLE' && e.size === 10);
  assert.equal(calls.length, before + 1); // only HEAD; no invalid GET
  assert.equal(await bucket.get('missing'), null);
  await bucket.put('course/private.pdf', fixture, { httpMetadata: { contentType: 'application/pdf' } });
  assert.equal(calls.at(-1).input.ContentLength, 10);
  assert.equal(calls.at(-1).input.ContentType, 'application/pdf');
  await bucket.put('course/stream.pdf', new Blob([fixture]).stream());
  assert.deepEqual(calls.at(-1).input.Body, fixture);
  const uploadCalls = calls.length;
  let cancelled = false;
  const oversized = new ReadableStream({ pull(controller) { controller.enqueue(new Uint8Array(51 * 1024 * 1024)); }, cancel() { cancelled = true; } });
  await assert.rejects(bucket.put('course/oversized.pdf', oversized), /exceeds 50 MB/);
  assert.equal(cancelled, true);
  assert.equal(calls.length, uploadCalls);
});

test('Vercel stays closed without services; no local DB, public forms or forged identities', async () => {
  assert.equal(vercelResourcesConfigured({}), false);
  const credentials = { CF_ACCOUNT_ID: accountId, CF_D1_DATABASE_ID: databaseId, CF_D1_API_TOKEN: 'fixture', R2_BUCKET_NAME: 'fixture', R2_ACCESS_KEY_ID: 'fixture', R2_SECRET_ACCESS_KEY: 'fixture' };
  assert.equal(vercelResourcesConfigured(credentials), true);
  assert.equal(vercelRuntimeReady(credentials), false);
  assert.equal(vercelRuntimeReady({ VERCEL_RUNTIME_READY: '1' }), false);
  assert.equal(vercelRuntimeReady({ ...credentials, VERCEL_RUNTIME_READY: '1' }), true);
  let configured = false;
  globalThis.__vercelProxy = { configured: () => configured, privateAccessAllowed };
  const source = (await readFile(new URL('../proxy.ts', import.meta.url), 'utf8'))
    .replace(/import \{ NextResponse, type NextRequest \} from 'next\/server';/, `const NextResponse = {
      next: options => ({ kind: 'next', options }),
      json: (body, init) => ({ kind: 'json', body, ...init }),
      rewrite: (url, init) => ({ kind: 'rewrite', url: url.href, ...init }),
      redirect: (url, init) => ({ kind: 'redirect', url: url.href, ...init }),
    };`)
    .replace("import { getNodeResources } from '@/lib/node/runtime.mjs';", 'const getNodeResources = () => { throw Error("No local data on Vercel"); };')
    .replace("import { privateAccessAllowed } from './lib/node/private-access.mjs';", 'const privateAccessAllowed = globalThis.__vercelProxy.privateAccessAllowed;')
    .replace("import { getVercelResources, vercelRuntimeReady } from '@/lib/vercel/runtime.mjs';", 'const vercelRuntimeReady = globalThis.__vercelProxy.configured; const getVercelResources = () => ({DB:{prepare(){throw Error("No session query expected");}}});');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
  const { proxy } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
  const runtime = process.env.APP_RUNTIME, visibility = process.env.SITE_VISIBILITY;
  process.env.APP_RUNTIME = 'vercel';
  delete process.env.SITE_VISIBILITY;
  try {
    for (const path of ['/', '/accesso', '/gestione/oggi', '/studente', '/incontro']) {
      const response = await proxy(new Request('https://site.example' + path));
      assert.equal(response.kind, 'redirect');
      assert.equal(response.url, 'https://site.example/preparazione');
      assert.match(response.headers['X-Robots-Tag'], /noindex/);
    }
    const api = await proxy(new Request('https://site.example/api/incontri', { method: 'POST' }));
    assert.equal(api.status, 503);
    const staticResponse = await proxy(new Request('https://site.example/_next/static/test.js'));
    assert.equal(staticResponse.kind, 'next');
    configured = true;
    const forged = await proxy(new Request('https://site.example/gestione', { headers: { 'oai-authenticated-user-email': 'forged@example.com' } }));
    assert.equal(forged.kind, 'redirect');
    assert.equal(forged.url, 'https://site.example/accesso');
    const login = await proxy(new Request('https://site.example/api/accesso', { headers: { 'cf-connecting-ip': 'spoofed', 'oai-authenticated-user-id': 'spoofed' } }));
    assert.equal(login.kind, 'next');
    assert.equal(login.options.request.headers.get('cf-connecting-ip'), null);
    assert.equal(login.options.request.headers.get('oai-authenticated-user-id'), null);
  } finally {
    if (runtime === undefined) delete process.env.APP_RUNTIME; else process.env.APP_RUNTIME = runtime;
    if (visibility === undefined) delete process.env.SITE_VISIBILITY; else process.env.SITE_VISIBILITY = visibility;
    delete globalThis.__vercelProxy;
  }
});
