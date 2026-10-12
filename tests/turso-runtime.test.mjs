import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, cp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createClient } from '@libsql/client';
import { createTursoDatabase, tursoConfigured } from '../lib/vercel/turso.mjs';
import { migrateTurso } from '../lib/vercel/turso-migrations.mjs';
import { createFirstTutor } from '../lib/node/bootstrap.mjs';
import { vercelDatabaseConfigured, vercelResourcesConfigured, vercelRuntimeReady } from '../lib/vercel/runtime.mjs';
import ts from 'typescript';

async function fixture(run) {
  const root = await mkdtemp(path.join(tmpdir(), 'ff-turso-test-'));
  const url = pathToFileURL(path.join(root, 'db.sqlite')).href;
  const client = createClient({ url, intMode: 'bigint' });
  try { await run({ root, url, client, db: createTursoDatabase({ client }) }); }
  finally { client.close(); await rm(root, { force: true, recursive: true }); }
}

test('Turso applies all real migrations, preserves triggers, verifies checksums and survives reconnect', async () => fixture(async ({ root, url, client, db }) => {
  const directory = path.join(root, 'drizzle');
  await cp(path.resolve('drizzle'), directory, { recursive: true });
  assert.equal(await migrateTurso(client, directory), 26);
  assert.equal(await migrateTurso(client, directory), 0);
  assert.ok(await db.prepare("SELECT count(*) n FROM sqlite_master WHERE type='trigger'").first('n') >= 15);
  assert.equal(await db.prepare('PRAGMA foreign_keys').first('foreign_keys'), 1);
  await createFirstTutor(db, 'tutor@example.com', 'Una password sintetica di prova');
  await assert.rejects(createFirstTutor(db, 'other@example.com', 'Una password sintetica di prova'), /already exists/);
  assert.equal(await db.prepare('SELECT count(*) n FROM accounts').first('n'), 1);
  const second = createClient({ url, intMode: 'bigint' });
  try {
    assert.equal(await migrateTurso(second, directory), 0);
    assert.equal(await createTursoDatabase({ client: second }).prepare('SELECT count(*) n FROM accounts').first('n'), 1);
  } finally { second.close(); }
  const journal = JSON.parse(await readFile(path.join(directory, 'meta/_journal.json'), 'utf8'));
  await writeFile(path.join(directory, journal.entries[0].tag + '.sql'), '-- changed');
  await assert.rejects(migrateTurso(client, directory), /applied migration changed/);
}));

test('Turso migration refuses unrelated databases and rolls back a failed migration with its ledger', async () => fixture(async ({ root, client, db }) => {
  await client.execute('CREATE TABLE unrelated(secret TEXT)');
  await assert.rejects(migrateTurso(client, path.resolve('drizzle')), /dedicated Turso/);
  assert.equal(await db.prepare("SELECT count(*) n FROM sqlite_master WHERE name='ff_turso_migrations'").first('n'), 0);
  await client.execute('DROP TABLE unrelated');
  const directory = path.join(root, 'drizzle');
  await cp(path.resolve('drizzle'), directory, { recursive: true });
  const journal = JSON.parse(await readFile(path.join(directory, 'meta/_journal.json'), 'utf8'));
  await writeFile(path.join(directory, journal.entries[0].tag + '.sql'), 'CREATE TABLE rollback_probe(id TEXT); INVALID SQL;');
  await assert.rejects(migrateTurso(client, directory));
  assert.equal(await db.prepare("SELECT count(*) n FROM sqlite_master WHERE name='rollback_probe'").first('n'), 0);
  assert.equal(await db.prepare('SELECT count(*) n FROM ff_turso_migrations').first('n'), 0);
}));

test('Real libSQL SDK preserves binding, RETURNING, atomic rollback and concurrent balance claims', async () => fixture(async ({ client, db }) => {
  await client.execute('CREATE TABLE balance(id TEXT PRIMARY KEY, amount INTEGER NOT NULL)');
  const id = "student' OR 1=1 --";
  const results = await db.batch([
    db.prepare('INSERT INTO balance VALUES(?,?) RETURNING id,amount').bind(id, 20),
    db.prepare('SELECT amount FROM balance WHERE id=?').bind(id),
  ]);
  assert.deepEqual(results[0].results, [{ id, amount: 20 }]);
  assert.equal(results[0].meta.changes, 1);
  assert.equal(results[1].meta.changes, 0);
  await assert.rejects(db.batch([db.prepare('UPDATE balance SET amount=0'), db.prepare('INSERT INTO balance VALUES(?,?)').bind(id, 5)]), /UNIQUE constraint/);
  assert.equal(await db.prepare('SELECT amount FROM balance').first('amount'), 20);
  assert.equal(await db.prepare('SELECT amount FROM balance WHERE id=?').bind('absent').first(), null);
  const claims = await Promise.all([1, 2].map(() => db.prepare('UPDATE balance SET amount=amount-20 WHERE amount>=20 RETURNING amount').all()));
  assert.deepEqual(claims.map(r => r.results.length).sort(), [0, 1]);
  assert.equal(await db.prepare('SELECT amount FROM balance').first('amount'), 0);
  await client.execute("CREATE TRIGGER conflict_probe BEFORE INSERT ON balance WHEN NEW.id='conflict' BEGIN SELECT RAISE(ABORT,'LESSON_CONFLICT'); END;");
  await assert.rejects(db.prepare('INSERT INTO balance VALUES(?,?)').bind('conflict', 20).run(), e => e.message === 'LESSON_CONFLICT');
  assert.throws(() => db.prepare('SELECT ?').bind(NaN), /Unsupported/);
  await assert.rejects(db.prepare('SELECT 9223372036854775807 n').first(), /integer out of range|Database unavailable/);
}));

test('Turso does not replay uncertain writes or disclose provider errors', async () => {
  let calls = 0;
  const db = createTursoDatabase({ client: { async batch() { calls++; throw Error('transport secret token SQL private details'); } } });
  await assert.rejects(db.prepare('INSERT INTO private_table VALUES(?)').bind('private').run(), e => e.message === 'Database unavailable; outcome may require verification');
  assert.equal(calls, 1);
  const other = createTursoDatabase({ client: {} });
  await assert.rejects(db.batch([other.prepare('SELECT 1')]), /another database/);
  assert.deepEqual(await db.batch([]), []);
});

test('Turso configuration requires a complete provider and a separate private archive before opening', () => {
  const database = { TURSO_DATABASE_URL: 'libsql://dedicated-test.turso.io', TURSO_AUTH_TOKEN: 'fixture' };
  assert.equal(tursoConfigured(database), true);
  assert.equal(vercelDatabaseConfigured(database), true);
  assert.equal(vercelResourcesConfigured(database), false);
  assert.equal(vercelRuntimeReady({ ...database, VERCEL_RUNTIME_READY: '1' }), false);
  for (const url of ['https://other.example', 'file:/tmp/local.sqlite', 'libsql://x.turso.io.evil.example', 'libsql://user:pass@x.turso.io', 'libsql://x.turso.io?auth=secret']) assert.equal(tursoConfigured({ ...database, TURSO_DATABASE_URL: url }), false);
  const archive = { CF_ACCOUNT_ID: 'a'.repeat(32), R2_BUCKET_NAME: 'private', R2_ACCESS_KEY_ID: 'fixture', R2_SECRET_ACCESS_KEY: 'fixture' };
  assert.equal(vercelResourcesConfigured({ ...database, ...archive }), true);
  assert.equal(vercelRuntimeReady({ ...database, ...archive, VERCEL_RUNTIME_READY: '1' }), true);
  assert.equal(vercelDatabaseConfigured({ CF_ACCOUNT_ID: 'fixture', CF_D1_DATABASE_ID: 'fixture', CF_D1_API_TOKEN: 'fixture', TURSO_DATABASE_URL: database.TURSO_DATABASE_URL }), false);
});

test('Public booking API with real libSQL commits one booking and request, returns 409 for the race and accepts an identical retry', async () => fixture(async ({ client, db }) => {
  await migrateTurso(client, path.resolve('drizzle'));
  globalThis.__tursoBooking = db;
  async function compile(filename, replace = source => source) {
    const source = replace(await readFile(path.resolve(filename), 'utf8'));
    return 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText).toString('base64');
  }
  try {
    const plan = await compile('lib/lesson-plan.ts');
    const consultations = await compile('lib/consultations.ts', s => s.replace("from '@/lib/lesson-plan'", 'from ' + JSON.stringify(plan)));
    const recurrence = await compile('lib/consultation-recurrence.ts', s => s.replace("from '@/lib/consultations'", 'from ' + JSON.stringify(consultations)));
    const catalog = await compile('lib/catalog.ts');
    const api = await import(await compile('app/api/incontri/route.ts', s => s
      .replace("from '@/lib/consultations'", 'from ' + JSON.stringify(consultations))
      .replace("from '@/lib/consultation-recurrence'", 'from ' + JSON.stringify(recurrence))
      .replace("from '@/lib/catalog'", 'from ' + JSON.stringify(catalog))
      .replace("from 'zod'", 'from ' + JSON.stringify(import.meta.resolve('zod')))
      .replace("import { bookingDb } from '@/lib/booking/runtime';", 'const bookingDb=()=>globalThis.__tursoBooking;')
      .replace("import { validateReferral } from '@/lib/referrals/server';", 'const validateReferral=async()=>{};')
      .replace("import {limitPublicRequest} from '@/lib/public-request-limit';", 'const limitPublicRequest=async()=>null;')));
    const slot = crypto.randomUUID(), start = new Date(Date.now() + 7 * 86400000).toISOString();
    await db.prepare('INSERT INTO consultation_slots(id,starts_at,ends_at,mode,created_at) VALUES(?,?,?,?,?)').bind(slot, start, new Date(Date.parse(start) + 15 * 60000).toISOString(), 'Entrambe', new Date().toISOString()).run();
    const payload = { id: crypto.randomUUID(), slotId: slot, name: 'Studente sintetico', email: 'fixture@example.com', phone: '', subject: 'Matematica', studentType: 'Superiori', message: '', mode: 'Online', consent: true, website: '' };
    const request = body => new Request('https://site.example/api/incontri', { method: 'POST', headers: { Origin: 'https://site.example', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const replies = await Promise.all([payload, { ...payload, id: crypto.randomUUID() }].map(p => api.POST(request(p))));
    assert.deepEqual(replies.map(r => r.status).sort(), [201, 409]);
    assert.equal(await db.prepare('SELECT count(*) n FROM consultations').first('n'), 1);
    assert.equal(await db.prepare('SELECT count(*) n FROM requests').first('n'), 1);
    const bookedId = await db.prepare('SELECT id FROM consultations').first('id');
    assert.equal((await api.POST(request({ ...payload, id: bookedId }))).status, 200);
    assert.equal((await api.POST(request({ ...payload, id: bookedId, name: 'Alterato' }))).status, 409);
    assert.deepEqual((await (await api.GET()).json()).slots, []);
  } finally { delete globalThis.__tursoBooking; }
}));
