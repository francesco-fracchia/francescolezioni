import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, rm, readFile, writeFile, symlink, readdir, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { openDatabase } from '../lib/node/database.mjs';
import { createMaterialBucket } from '../lib/node/bucket.mjs';
import { migrateDatabase, adoptD1Database } from '../lib/node/migrations.mjs';
import { createFirstTutor } from '../lib/node/bootstrap.mjs';
import { privateAccessAllowed } from '../lib/node/private-access.mjs';
import { dataDirectory } from '../lib/node/runtime.mjs';
const migrations = path.resolve('drizzle');

async function temporary(run) {
  const root = await mkdtemp(path.join(tmpdir(), 'ff-hostinger-test-'));
  try { await run(root); } finally { await rm(root, { recursive: true, force: true }); }
}

test('Node SQLite preserves migrations, rows, RETURNING and atomic rollback across restarts', async () => temporary(async root => {
  const filename = path.join(root, 'test.sqlite');
  let db = openDatabase(filename, { mustExist: false });
  try {
    assert.equal(migrateDatabase(db, migrations), 26);
    assert.equal(migrateDatabase(db, migrations), 0);
    db.sql.exec('CREATE TABLE adapter_test(id TEXT PRIMARY KEY, amount INTEGER NOT NULL)');
    let results = await db.batch([
      db.prepare('INSERT INTO adapter_test VALUES(?,?) RETURNING id,amount').bind('one', 20),
      db.prepare('SELECT amount FROM adapter_test WHERE id=?').bind('one'),
    ]);
    assert.equal(results[0].results[0].amount, 20);
    assert.equal(results[0].meta.changes, 1);
    assert.equal(results[1].meta.changes, 0);
    await assert.rejects(db.batch([db.prepare('UPDATE adapter_test SET amount=95 WHERE id=?').bind('one'), db.prepare('INSERT INTO adapter_test VALUES(?,?)').bind('one', 19)]), /UNIQUE/);
    assert.equal(await db.prepare('SELECT amount FROM adapter_test').first('amount'), 20);
    assert.equal((await db.prepare('UPDATE adapter_test SET amount=95 WHERE id=?').bind('absent').run()).meta.changes, 0);
    const concurrent = await Promise.allSettled([1, 2].map(() => db.batch([db.prepare('UPDATE adapter_test SET amount=amount-20 WHERE amount>=20 RETURNING amount')])));
    assert.deepEqual(concurrent.map(result => result.value[0].results.length), [1, 0]);
    assert.equal(await db.prepare('SELECT amount FROM adapter_test').first('amount'), 0);
    db.sql.prepare('VACUUM INTO ?').run(path.join(root, 'backup.sqlite'));
    db.close();
    db = openDatabase(filename);
    assert.equal(await db.prepare('SELECT amount FROM adapter_test').first('amount'), 0);
    assert.equal(migrateDatabase(db, migrations), 0);
    const backup = openDatabase(path.join(root, 'backup.sqlite'));
    try { assert.equal(await backup.prepare('SELECT count(*) n FROM ff_node_migrations').first('n'), 26); } finally { backup.close(); }
  } finally { db.close(); }
  assert.throws(() => openDatabase(path.join(root, 'missing.sqlite')), /unable to open/);
}));

test('Protected Node materials persist and support video byte ranges without exposing filesystem paths', async () => temporary(async root => {
  let bucket = createMaterialBucket(path.join(root, 'materials'));
  const key = '../../escaped/path.mp4', content = new TextEncoder().encode('0123456789');
  await bucket.put(key, content);
  bucket = createMaterialBucket(path.join(root, 'materials'));
  const first = await bucket.get(key);
  assert.equal(await new Response(first.body).text(), '0123456789');
  assert.match(first.httpEtag, /^"[a-f0-9]{64}"$/);
  const range = await bucket.get(key, { range: new Headers({ range: 'bytes=2-5' }) });
  assert.deepEqual(range.range, { offset: 2, length: 4 });
  assert.equal(await new Response(range.body).text(), '2345');
  const suffix = await bucket.get(key, { range: new Headers({ range: 'bytes=-3' }) });
  assert.equal(await new Response(suffix.body).text(), '789');
  for (const header of ['bytes=50-', 'bytes=5-2', 'bytes=-0', 'bytes=0-1,4-5', 'other']) await assert.rejects(bucket.get(key, { range: new Headers({ range: header }) }), error => error.code === 'RANGE_NOT_SATISFIABLE' && error.size === 10);
  const failing = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(50 * 1024 * 1024 + 1)); controller.close(); } });
  await assert.rejects(bucket.put(key, failing), /exceeds 50 MB/);
  assert.equal(await new Response((await bucket.get(key)).body).text(), '0123456789');
  const hash = createHash('sha256').update('symlink').digest('hex'), shard = path.join(root, 'materials', hash.slice(0, 2));
  await bucket.put('symlink', 'safe');
  const filename = path.join(shard, hash + '.blob');
  await rm(filename); await writeFile(path.join(root, 'secret'), 'private');
  await symlink(path.join(root, 'secret'), filename);
  await assert.rejects(bucket.get('symlink'), /symbolic links|ELOOP/);
  assert.ok(!(await readdir(root)).includes('escaped'));
  await bucket.delete(key);
  assert.equal(await bucket.get(key), null);
}));

test('Hostinger bootstrap uses existing password format and private mode admits only a current tutor session', async () => temporary(async root => {
  const db = openDatabase(path.join(root, 'test.sqlite'), { mustExist: false });
  try {
    migrateDatabase(db, migrations);
    await createFirstTutor(db, 'Tutor@example.com', 'Password lunga per il collaudo');
    const tutor = await db.prepare('SELECT * FROM accounts').first();
    assert.equal(tutor.email, 'tutor@example.com');
    const source = await readFile(new URL('../lib/auth/passwords.ts', import.meta.url), 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
    const { verifyPassword } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
    assert.equal(await verifyPassword('Password lunga per il collaudo', tutor.password_hash), true);
    await assert.rejects(createFirstTutor(db, 'Other@example.com', 'Una password diversa e lunga'), /already exists/);
    const token = 'a'.repeat(43), digest = createHash('sha256').update(token).digest('hex');
    await db.prepare('INSERT INTO account_sessions VALUES(?,?,?,?,?)').bind(digest, tutor.id, 0, Date.now() + 100000, Date.now()).run();
    const request = (pathname, headers) => new Request('https://site.example' + pathname, { headers });
    assert.equal(await privateAccessAllowed(request('/accesso'), db, 'private'), true);
    assert.equal(await privateAccessAllowed(request('/api/accesso'), db), true);
    assert.equal(await privateAccessAllowed(request('/api/incontri'), db), false);
    assert.equal(await privateAccessAllowed(request('/api/studente/compiti/file'), db), false);
    assert.equal(await privateAccessAllowed(request('/francesco'), db), false);
    assert.equal(await privateAccessAllowed(request('/gestione', { 'oai-authenticated-user-email': 'tutor@example.com' }), db), false);
    assert.equal(await privateAccessAllowed(request('/gestione', { cookie: 'ff_session=' + token }), db), true);
    assert.equal(await privateAccessAllowed(request('/gestione', { cookie: `ff_session=${token}; ff_session=${token}` }), db), false);
    await db.prepare("UPDATE accounts SET role='student'").run();
    assert.equal(await privateAccessAllowed(request('/', { cookie: 'ff_session=' + token }), db), false);
    await db.prepare("UPDATE accounts SET role='tutor',auth_version=1").run();
    assert.equal(await privateAccessAllowed(request('/', { cookie: 'ff_session=' + token }), db), false);
    assert.equal(await privateAccessAllowed(request('/'), db, 'public'), true);
  } finally { db.close(); }
}));

test('D1 adoption requires all migrations and invalidates previous sessions without replacing accounts', async () => temporary(async root => {
  const db = openDatabase(path.join(root, 'test.sqlite'), { mustExist: false });
  try {
    for (const file of (await readdir(migrations)).filter(file => file.endsWith('.sql')).sort()) db.sql.exec(await readFile(path.join(migrations, file), 'utf8'));
    db.sql.exec('CREATE TABLE d1_migrations(id INTEGER PRIMARY KEY, name TEXT)');
    const journal = JSON.parse(await readFile(path.join(migrations, 'meta/_journal.json'), 'utf8'));
    for (const [index, entry] of journal.entries.entries()) db.sql.prepare('INSERT INTO d1_migrations VALUES(?,?)').run(index + 1, entry.tag + '.sql');
    const last = journal.entries.at(-1).tag + '.sql';
    db.sql.prepare('DELETE FROM d1_migrations WHERE name=?').run(last);
    assert.throws(() => adoptD1Database(db, migrations), /include every current migration/);
    db.sql.prepare('INSERT INTO d1_migrations VALUES(?,?)').run(26, last);
    await createFirstTutor(db, 'tutor@example.com', 'Password lunga per il collaudo');
    const tutor = await db.prepare('SELECT id FROM accounts').first('id');
    await db.prepare('INSERT INTO account_sessions VALUES(?,?,?,?,?)').bind('old', tutor, 0, Date.now() + 1000, Date.now()).run();
    adoptD1Database(db, migrations);
    assert.equal(migrateDatabase(db, migrations), 0);
    assert.equal(await db.prepare('SELECT count(*) n FROM account_sessions').first('n'), 0);
    assert.equal(await db.prepare('SELECT id FROM accounts').first('id'), tutor);
  } finally { db.close(); }
}));

test('Data directory rejects relative, application, deployment and symlink paths', async () => temporary(async root => {
  assert.throws(() => dataDirectory('relative'), /absolute persistent/);
  for (const directory of [process.cwd(), path.join(process.cwd(), 'public/data'), path.join(root, 'hbuilds/data'), path.join(root, 'public_html/data')]) assert.throws(() => dataDirectory(directory), /must not be inside/);
  await symlink(root, path.join(root, 'link'));
  assert.throws(() => dataDirectory(path.join(root, 'link')), /symbolic link/);
  assert.equal(dataDirectory(root), await realpath(root));
}));

test('Independent hosting ignores all ChatGPT identity headers', async () => {
  const before = process.env.APP_RUNTIME;
  process.env.APP_RUNTIME = 'node';
  try {
    const source = (await readFile(new URL('../app/chatgpt-auth.ts', import.meta.url), 'utf8')).replace('import { headers } from "next/headers";', 'const headers = async () => { throw new Error("Client identity headers must not be read"); };').replace('import { redirect } from "next/navigation";', 'const redirect = () => {};');
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022 } }).outputText;
    const auth = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
    assert.equal(await auth.getChatGPTUser(), null);
  } finally { if (before === undefined) delete process.env.APP_RUNTIME; else process.env.APP_RUNTIME = before; }
});
