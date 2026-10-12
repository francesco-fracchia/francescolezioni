import path from 'node:path';
import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';
import { createClient } from '@libsql/client';
import { createTursoDatabase, tursoConfigured } from '../lib/vercel/turso.mjs';
import { migrateTurso, verifyTursoSchema } from '../lib/vercel/turso-migrations.mjs';
import { createFirstTutor } from '../lib/node/bootstrap.mjs';

// Explicit maintenance only: never called by a build, deploy or web request.
// Supply secrets in a local ignored .env file, not arguments or terminal history.
const [command, email] = process.argv.slice(2);
if (!['check', 'migrate', 'tutor'].includes(command)) throw new Error('Expected check, migrate, or tutor <email>.');
if (!tursoConfigured()) throw new Error('Configure TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in a protected environment file.');
if (command === 'tutor' && (!process.stdin.isTTY || !email)) throw new Error('Use an interactive terminal: tutor <email>. Password entry is hidden.');
const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN, intMode: 'bigint' });
const directory = path.resolve('drizzle');
try {
  if (command === 'migrate') {
    console.log(`Migrations applied: ${await migrateTurso(client, directory)}. Runtime remains closed until separately enabled.`);
  } else {
    const count = await verifyTursoSchema(client, directory);
    if (command === 'check') {
      const result = await client.execute("SELECT count(*) n FROM accounts WHERE role='tutor' AND status='active'");
      console.log(`Migrations verified: ${count}. Active tutor: ${Number(result.rows[0].n) === 1 ? 'present' : 'missing or ambiguous'}.`);
      console.log('This checks the schema only. Verify login, bookings and private files on the deployed site before opening.');
    } else {
      let muted = false;
      const output = new Writable({ write(chunk, encoding, callback) { if (!muted) process.stdout.write(chunk, encoding); callback(); } });
      const prompt = createInterface({ input: process.stdin, output, terminal: true });
      try {
        const ask = label => new Promise(resolve => { muted = false; prompt.question(label, value => { muted = false; process.stdout.write('\n'); resolve(value); }); muted = true; });
        const password = await ask('Password (15–128 characters, hidden): ');
        if (password !== await ask('Repeat password: ')) throw new Error('Passwords differ.');
        await createFirstTutor(createTursoDatabase({ client }), email, password);
        console.log('Tutor created. No existing account was replaced.');
      } finally { prompt.close(); }
    }
  }
} catch (error) {
  // SQL/provider errors can contain data, URLs or credentials. Print only known
  // maintenance errors; keep uncertain writes for manual verification.
  const message = error instanceof Error ? error.message : '';
  console.error(/^(Use a new dedicated|Database (migration|migrations|has unknown|foreign key)|An applied migration|A tutor already|Passwords differ|The tutor password|A valid tutor email)/.test(message) ? message : 'Database operation failed. No automatic retry. Verify the operation in Turso before repeating it.');
  process.exitCode = 1;
} finally { client.close(); }
