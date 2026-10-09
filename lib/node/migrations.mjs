import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { openDatabase } from './database.mjs';

export function migrateDatabase(database, directory) {
  const journal = JSON.parse(readFileSync(path.join(directory, 'meta/_journal.json'), 'utf8'));
  const sql = database.sql;
  sql.exec('CREATE TABLE IF NOT EXISTS ff_node_migrations(name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TEXT NOT NULL)');
  let applied = 0;
  for (const { tag } of journal.entries) {
    const name = tag + '.sql', source = readFileSync(path.join(directory, name), 'utf8');
    const checksum = createHash('sha256').update(source).digest('hex');
    sql.exec('BEGIN IMMEDIATE');
    try {
      const old = sql.prepare('SELECT checksum FROM ff_node_migrations WHERE name=?').get(name);
      if (old) {
        if (old.checksum !== checksum) throw new Error('An applied migration changed: ' + name);
      } else {
        // Reject an existing D1/imported schema rather than attempting to create
        // its tables again. Imports require an explicit, verified adoption.
        if (tag === journal.entries[0].tag && sql.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='requests'").get()) throw new Error('Existing schema has no Node migration history. Import it with the migration tool.');
        sql.exec(source);
        sql.prepare('INSERT INTO ff_node_migrations VALUES(?,?,?)').run(name, checksum, new Date().toISOString());
        applied++;
      }
      sql.exec('COMMIT');
    } catch (error) { sql.exec('ROLLBACK'); throw error; }
  }
  return applied;
}

export function adoptD1Database(database, directory) {
  const journal = JSON.parse(readFileSync(path.join(directory, 'meta/_journal.json'), 'utf8'));
  const sql = database.sql;
  const applied = new Set(sql.prepare('SELECT name FROM d1_migrations').all().map(row => row.name));
  if (journal.entries.some(entry => !applied.has(entry.tag + '.sql'))) throw new Error('The D1 export must include every current migration and the d1_migrations table.');
  if (sql.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok' || sql.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Imported database failed its integrity checks.');
  // A migration ledger alone does not prove that tables/triggers were exported.
  const reference = openDatabase(':memory:', { mustExist: false });
  try {
    migrateDatabase(reference, directory);
    const objects = reference.sql.prepare("SELECT name,type,sql FROM sqlite_master WHERE sql IS NOT NULL AND name<>'ff_node_migrations'").all();
    const normalize = value => value.replace(/\s+/g, ' ').replace(/[`\"]/g, '').trim();
    for (const object of objects) {
      const imported = sql.prepare('SELECT type,sql FROM sqlite_master WHERE name=?').get(object.name);
      if (!imported || imported.type !== object.type) throw new Error('Incomplete D1 schema: ' + object.name);
      if (object.type === 'table') {
        const query = 'PRAGMA table_xinfo(' + JSON.stringify(object.name) + ')';
        if (JSON.stringify(sql.prepare(query).all()) !== JSON.stringify(reference.sql.prepare(query).all())) throw new Error('D1 table does not match current migrations: ' + object.name);
      } else if (normalize(imported.sql) !== normalize(object.sql)) throw new Error('D1 index/trigger does not match current migrations: ' + object.name);
    }
  } finally { reference.close(); }
  sql.exec('CREATE TABLE ff_node_migrations(name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TEXT NOT NULL)');
  sql.exec('BEGIN IMMEDIATE');
  try {
    for (const { tag } of journal.entries) {
      const name = tag + '.sql', source = readFileSync(path.join(directory, name), 'utf8');
      sql.prepare('INSERT INTO ff_node_migrations VALUES(?,?,?)').run(name, createHash('sha256').update(source).digest('hex'), new Date().toISOString());
    }
    // Existing passwords remain valid; hosting changes invalidate old sessions.
    sql.exec('DELETE FROM account_sessions; DELETE FROM auth_attempts;');
    sql.exec('COMMIT');
  } catch (error) { sql.exec('ROLLBACK'); throw error; }
}
