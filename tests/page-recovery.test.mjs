import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import ts from 'typescript';

const compile = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText).toString('base64');
const recoverySource = await readFile(new URL('../lib/page-recovery.ts', import.meta.url), 'utf8');
const recoveryModule = compile(recoverySource);
const {recoveryPath} = await import(recoveryModule);

test('recovery retries only local pages, drops unsafe destinations and never carries query tokens', () => {
  for (const value of ['/', '/prezzi', '/gestione/prenotazioni', '/studente']) assert.equal(recoveryPath(value), value);
  for (const value of [undefined, ['/prezzi'], '//evil.example', 'https://evil.example', '/\\evil.example', '/%2fevil.example', '/x\n', '/x?token=private', '/x#secret', '/api', '/api/incontri', '/_next/static/a.js', '/indisponibile', '/a/../indisponibile', '/a/../api/accesso', '/'+'x'.repeat(2048)]) assert.equal(recoveryPath(value), '/', String(value));
});

test('access failure serves a 503 recovery page, keeps APIs JSON and does not require a database for recovery assets', async () => {
  const originalRuntime = process.env.APP_RUNTIME;
  let reads = 0;
  globalThis.__r11Resources = () => {reads++; throw Error('PRIVATE_DATABASE_DETAIL');};
  try {
    process.env.APP_RUNTIME = 'node';
    const next = pathToFileURL(path.resolve('node_modules/next/server.js')).href;
    const source = (await readFile(new URL('../proxy.ts', import.meta.url), 'utf8'))
      .replace("from 'next/server'", `from '${next}'`)
      .replace("import { getNodeResources } from '@/lib/node/runtime.mjs';", 'const getNodeResources = () => globalThis.__r11Resources();')
      .replace("import { privateAccessAllowed } from './lib/node/private-access.mjs';", 'const privateAccessAllowed = async () => false;')
      .replace("import { getVercelResources, vercelRuntimeReady } from '@/lib/vercel/runtime.mjs';", 'const getVercelResources = getNodeResources; const vercelRuntimeReady = () => true;')
      .replace("import { previewAllowed, previewPathAllowed } from '@/lib/site-preview.mjs';", 'const previewAllowed = () => false; const previewPathAllowed = () => false;')
      .replace("from '@/lib/page-recovery'", `from '${recoveryModule}'`);
    const {proxy} = await import(compile(source));
    for (const runtime of ['node', 'vercel']) {
      process.env.APP_RUNTIME = runtime;
      for (const headers of [{}, {RSC:'1'}]) {
        const response = await proxy(new Request('https://site.example/gestione/prenotazioni?secret=do-not-copy', {headers}));
        assert.equal(response.status, 503);
        const rewrite = new URL(response.headers.get('x-middleware-rewrite'));
        assert.equal(rewrite.pathname, '/indisponibile');
        assert.equal(rewrite.searchParams.get('da'), '/gestione/prenotazioni');
        assert.equal(rewrite.search.includes('secret'), false);
        assert.equal(response.headers.get('Retry-After'), '60');
        assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
        assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow');
      }
      for (const endpoint of ['/api', '/api/incontri']) {
        const response = await proxy(new Request('https://site.example'+endpoint));
        assert.equal(response.status, 503);
        assert.match(response.headers.get('content-type'), /application\/json/);
        assert.deepEqual(await response.json(), {error:'Piattaforma temporaneamente non disponibile.'});
      }
      const before = reads;
      for (const route of ['/indisponibile', '/_next/static/test.js', '/francesco-fracchia-logo.png', '/robots.txt', '/sitemap.xml']) {
        const response = await proxy(new Request('https://site.example'+route));
        assert.equal(response.headers.get('x-middleware-next'), '1');
        assert.equal(response.headers.get('Cache-Control'), route === '/indisponibile' ? 'private, no-store' : null);
        assert.equal(response.status, route === '/indisponibile' ? 503 : 200);
      }
      assert.equal(reads, before);
    }
  } finally {
    if (originalRuntime === undefined) delete process.env.APP_RUNTIME; else process.env.APP_RUNTIME = originalRuntime;
    delete globalThis.__r11Resources;
  }
});
