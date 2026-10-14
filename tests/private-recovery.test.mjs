import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { scrypt, timingSafeEqual } from 'node:crypto';
import { createClient } from '@libsql/client';
import { createTursoDatabase } from '../lib/vercel/turso.mjs';
import { migrateTurso } from '../lib/vercel/turso-migrations.mjs';
import { createFirstTutor, resetTutorPassword } from '../lib/node/bootstrap.mjs';
import { rotatePreviewPassword } from '../lib/node/preview-recovery.mjs';

async function matches(password, encoded) {
  const [, n, r, p, salt, key] = encoded.split(':');
  const actual = await new Promise((resolve, reject) => scrypt(password, Buffer.from(salt, 'hex'), 32,
    { N: Number(n), r: Number(r), p: Number(p), maxmem: 32 * 1024 * 1024 }, (error, value) => error ? reject(error) : resolve(value)));
  return timingSafeEqual(actual, Buffer.from(key, 'hex'));
}
async function fixture(run) {
  const root = await mkdtemp(path.join(tmpdir(), 'ff-recovery-'));
  const client = createClient({ url: pathToFileURL(path.join(root, 'db.sqlite')).href, intMode: 'bigint' });
  const db = createTursoDatabase({ client });
  try {
    await migrateTurso(client, path.resolve('drizzle'));
    await createFirstTutor(db, 'tutor@example.com', 'Vecchia password sintetica');
    const account = await db.prepare("SELECT * FROM accounts WHERE email='tutor@example.com'").first();
    const now = new Date().toISOString();
    await db.prepare("INSERT INTO accounts(id,email,name,role,password_hash,created_at,updated_at) VALUES('student','student@example.com','Studente','student','unmodified',?,?)").bind(now, now).run();
    await db.prepare('INSERT INTO account_sessions(token_hash,account_id,auth_version,expires_at,created_at) VALUES(?,?,0,?,?)').bind('tutor-session', account.id, Date.now() + 100000, Date.now()).run();
    await db.prepare("INSERT INTO account_sessions(token_hash,account_id,auth_version,expires_at,created_at) VALUES('student-session','student',0,?,?)").bind(Date.now() + 100000, Date.now()).run();
    await client.execute('CREATE TABLE recovery_sentinel(id TEXT PRIMARY KEY, value TEXT)');
    await db.prepare("INSERT INTO recovery_sentinel VALUES('existing','keep')").run();
    await run({ db, account });
  } finally { client.close(); await rm(root, { recursive: true, force: true }); }
}

test('Tutor recovery replaces only the active tutor hash, revokes old sessions and preserves records', async () => fixture(async ({ db, account }) => {
  await resetTutorPassword(db, ' TUTOR@example.com ', 'Nuova password sintetica');
  const changed = await db.prepare('SELECT * FROM accounts WHERE id=?').bind(account.id).first();
  assert.equal(changed.auth_version, account.auth_version + 1);
  assert.equal(changed.name, account.name);
  assert.equal(changed.email, account.email);
  assert.equal(await matches('Nuova password sintetica', changed.password_hash), true);
  assert.equal(await matches('Vecchia password sintetica', changed.password_hash), false);
  assert.equal(await db.prepare('SELECT count(*) n FROM account_sessions WHERE account_id=?').bind(account.id).first('n'), 0);
  assert.equal(await db.prepare("SELECT count(*) n FROM account_sessions WHERE account_id='student'").first('n'), 1);
  assert.equal(await db.prepare("SELECT password_hash FROM accounts WHERE id='student'").first('password_hash'), 'unmodified');
  assert.equal(await db.prepare('SELECT count(*) n FROM accounts').first('n'), 2);
  assert.equal(await db.prepare('SELECT value FROM recovery_sentinel').first('value'), 'keep');
}));

test('Recovery rejects non-tutors, suspended accounts, weak passwords and stale concurrent recovery', async () => fixture(async ({ db, account }) => {
  await assert.rejects(resetTutorPassword(db, 'student@example.com', 'Nuova password sintetica'), /active tutor/);
  await assert.rejects(resetTutorPassword(db, 'missing@example.com', 'Nuova password sintetica'), /active tutor/);
  await assert.rejects(resetTutorPassword(db, 'tutor@example.com', 'short'), /15–128/);
  await db.prepare("UPDATE accounts SET status='suspended' WHERE id=?").bind(account.id).run();
  await assert.rejects(resetTutorPassword(db, 'tutor@example.com', 'Nuova password sintetica'), /active tutor/);
  await db.prepare("UPDATE accounts SET status='active' WHERE id=?").bind(account.id).run();
  const racing = { prepare: db.prepare, async batch(statements) {
    await db.prepare('UPDATE accounts SET auth_version=auth_version+1 WHERE id=?').bind(account.id).run();
    return db.batch(statements);
  } };
  await assert.rejects(resetTutorPassword(racing, 'tutor@example.com', 'Nuova password sintetica'), /changed during recovery/);
  assert.equal(await db.prepare('SELECT password_hash FROM accounts WHERE id=?').bind(account.id).first('password_hash'), account.password_hash);
  assert.equal(await db.prepare('SELECT count(*) n FROM account_sessions').first('n'), 2);
}));

test('A failed recovery transaction rolls back both password and session deletion', async () => fixture(async ({ db, account }) => {
  const failing = { prepare: db.prepare, batch: statements => db.batch([...statements, db.prepare("INSERT INTO recovery_sentinel VALUES('existing','duplicate')")]) };
  await assert.rejects(resetTutorPassword(failing, 'tutor@example.com', 'Nuova password sintetica'));
  const unchanged = await db.prepare('SELECT * FROM accounts WHERE id=?').bind(account.id).first();
  assert.equal(unchanged.password_hash, account.password_hash);
  assert.equal(unchanged.auth_version, account.auth_version);
  assert.equal(await db.prepare('SELECT count(*) n FROM account_sessions').first('n'), 2);
}));

const deployment = { id: 'dpl_verified', name: 'francescolezioni', contextName: 'francesco-fracchias-projects-c76d7b23', target: 'production', readyState: 'READY' };
const previewPassword = 'Password sintetica anteprima';
test('Preview recovery scopes the secret, sends it only on stdin and redeploys the verified production deployment', async () => {
  const calls = [];
  await rotatePreviewPassword(previewPassword, (args, input) => {
    calls.push({ args, input });
    return { status: 0, stdout: calls.length === 1 ? JSON.stringify(deployment) : '' };
  });
  assert.equal(calls.length, 3);
  assert.equal(calls[1].input, previewPassword);
  assert.equal(calls[0].input, undefined);
  assert.equal(calls[2].input, undefined);
  assert.ok(calls.every(call => !call.args.includes(previewPassword)));
  assert.deepEqual(calls[1].args.slice(0, 9), ['env', 'update', 'SITE_PREVIEW_PASSWORD', 'production', '--type', 'secret', '--yes', '--project', 'prj_EZPm8E8G08d0LcWFUpqEFA5UJtdR']);
  assert.equal(calls[2].args[1], deployment.id);
});
test('Preview recovery refuses mismatched projects and does not retry uncertain writes', async () => {
  let writes = 0;
  await assert.rejects(rotatePreviewPassword(previewPassword, args => {
    if (args[0] !== 'inspect') writes++;
    return { status: 0, stdout: JSON.stringify({ ...deployment, name: 'another-project' }) };
  }), /non corrispondente/);
  assert.equal(writes, 0);
  let count = 0;
  await assert.rejects(rotatePreviewPassword(previewPassword, () => {
    count++;
    return count === 1 ? { status: 0, stdout: JSON.stringify(deployment) } : { status: 1, stdout: '' };
  }), /non confermato/);
  assert.equal(count, 2);
  await assert.rejects(rotatePreviewPassword('short', () => { throw Error('must not call'); }), /20 a 256/);
});
