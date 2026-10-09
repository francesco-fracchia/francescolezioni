import path from 'node:path';
import { readFileSync, existsSync, renameSync, unlinkSync, mkdirSync, cpSync, realpathSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';
import { dataDirectory } from '../lib/node/runtime.mjs';
import { openDatabase } from '../lib/node/database.mjs';
import { migrateDatabase, adoptD1Database } from '../lib/node/migrations.mjs';
import { createFirstTutor } from '../lib/node/bootstrap.mjs';
process.umask(0o077);
const [command, ...args] = process.argv.slice(2), root = dataDirectory();
const filename = path.join(root, 'platform.sqlite'), migrations = path.resolve('drizzle');
if (command === 'import-d1') {
  if (existsSync(filename)) throw new Error('Import requires a fresh data directory; the current database is never overwritten.');
  if (!args[0]) throw new Error('Specify a complete D1 SQL export, including d1_migrations.');
  const temporary = filename + '.' + randomUUID() + '.tmp';
  const db = openDatabase(temporary, { mustExist: false });
  let complete = false;
  try {
    db.sql.exec(readFileSync(path.resolve(args[0]), 'utf8'));
    adoptD1Database(db, migrations);
    db.sql.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    complete = true;
  } finally {
    db.close();
    if (!complete) for (const suffix of ['', '-wal', '-shm']) { try { unlinkSync(temporary + suffix); } catch (error) { if (error.code !== 'ENOENT') throw error; } }
  }
  renameSync(temporary, filename);
  console.log('Database imported. Old sessions invalidated. Import the protected material files separately.');
} else {
  const db = openDatabase(filename, { mustExist: command !== 'migrate' });
  try {
    if (command === 'migrate') console.log(`Migrations applied: ${migrateDatabase(db, migrations)}`);
    else if (command === 'tutor') {
      if (!args[0]) throw new Error('Specify the tutor email as the first argument.');
      if (!process.stdin.isTTY) throw new Error('Use an interactive terminal to enter the password, or the protected bootstrap variables on first deployment.');
      let muted = false;
      const output = new Writable({ write(chunk, encoding, callback) { if (!muted) process.stdout.write(chunk, encoding); callback(); } });
      const prompt = createInterface({ input: process.stdin, output, terminal: true });
      try {
        const ask = label => new Promise(resolve => { muted = false; prompt.question(label, value => { muted = false; process.stdout.write('\n'); resolve(value); }); muted = true; });
        const password = await ask('Password (15–128 characters, hidden): ');
        if (password !== await ask('Repeat password: ')) throw new Error('Passwords differ.');
        await createFirstTutor(db, args[0], password);
        console.log('Tutor created. Sign in at /accesso.');
      } finally { prompt.close(); }
    } else if (command === 'backup') {
      if (!args[0] || !path.isAbsolute(args[0])) throw new Error('Specify an absolute destination for a NEW backup directory. Stop the application first.');
      const destination = path.resolve(args[0]);
      if (existsSync(destination)) throw new Error('Backup destination already exists.');
      // Exclude any public/deployment location, including resolved parent links.
      const parent = realpathSync(path.dirname(destination));
      const target = path.join(parent, path.basename(destination));
      if (target === root || target.startsWith(root + path.sep) || target.startsWith(realpathSync(process.cwd()) + path.sep) || /(^|\/)(public_html|hbuilds|public)(\/|$)/.test(target)) throw new Error('Backup must be outside the data, deployment and public directories.');
      mkdirSync(target, { mode: 0o700 });
      db.sql.prepare('VACUUM INTO ?').run(path.join(target, 'platform.sqlite'));
      if (existsSync(path.join(root, 'materials'))) cpSync(path.join(root, 'materials'), path.join(target, 'materials'), { recursive: true });
      console.log('Backup completed. Keep this folder private: it contains student data and password hashes.');
    } else throw new Error('Expected migrate, tutor <email>, import-d1 <file.sql>, or backup <new-directory>.');
  } finally { db.close(); }
}
