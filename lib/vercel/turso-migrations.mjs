import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

export async function verifyTursoSchema(client, directory) {
  const journal = JSON.parse(await readFile(path.join(directory, 'meta/_journal.json'), 'utf8'));
  const rows = (await client.execute('SELECT name,checksum FROM ff_turso_migrations')).rows;
  if (rows.length !== journal.entries.length) throw new Error('Database migrations incomplete or unknown.');
  for (const { tag } of journal.entries) {
    const name = tag + '.sql';
    const checksum = createHash('sha256').update(await readFile(path.join(directory, name), 'utf8')).digest('hex');
    if (!rows.some(row => row.name === name && row.checksum === checksum)) throw new Error('Database migration checksum mismatch: ' + name);
  }
  if ((await client.execute('PRAGMA foreign_key_check')).rows.length) throw new Error('Database foreign key checks failed');
  return rows.length;
}

export async function migrateTurso(client, directory) {
  const journal = JSON.parse(await readFile(path.join(directory, 'meta/_journal.json'), 'utf8'));
  // Refuse an unrelated or imported database; no guessing about its schema.
  const schema = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
  if (schema.rows.length && !schema.rows.some(row => row.name === 'ff_turso_migrations')) {
    throw new Error('Use a new dedicated Turso database. Existing tables were not modified.');
  }
  await client.execute('CREATE TABLE IF NOT EXISTS ff_turso_migrations(name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TEXT NOT NULL)');
  const recorded = (await client.execute('SELECT name FROM ff_turso_migrations')).rows;
  if (recorded.some(row => !journal.entries.some(entry => row.name === entry.tag + '.sql'))) throw new Error('Database has unknown migrations. Nothing was migrated.');
  let applied = 0;
  for (const { tag } of journal.entries) {
    const name = tag + '.sql', source = await readFile(path.join(directory, name), 'utf8');
    const checksum = createHash('sha256').update(source).digest('hex');
    const transaction = await client.transaction('write');
    try {
      const old = await transaction.execute({ sql: 'SELECT checksum FROM ff_turso_migrations WHERE name=?', args: [name] });
      if (old.rows.length) {
        if (old.rows[0].checksum !== checksum) throw new Error('An applied migration changed: ' + name);
      } else {
        // executeMultiple preserves trigger bodies and multiple SQL statements.
        // The schema and its checksum commit in the same write transaction.
        await transaction.executeMultiple(source);
        await transaction.execute({ sql: 'INSERT INTO ff_turso_migrations VALUES(?,?,?)', args: [name, checksum, new Date().toISOString()] });
        applied++;
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback().catch(() => {});
      throw error;
    } finally { transaction.close(); }
  }
  await verifyTursoSchema(client, directory);
  return applied;
}
