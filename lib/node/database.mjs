import { DatabaseSync } from 'node:sqlite';

// D1's small interface used by the app, backed by native SQLite. In particular,
// batch returns RETURNING rows and commits every statement in one transaction.
export function openDatabase(filename, { mustExist = true } = {}) {
  if (mustExist) {
    // SQLite's default would silently create an empty DB after a wrong path.
    const check = new DatabaseSync(filename, { readOnly: true });
    check.close();
  }
  const sql = new DatabaseSync(filename);
  sql.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=10000; PRAGMA journal_mode=WAL;');
  function prepare(query) {
    const statement = sql.prepare(query);
    function bound(args = []) {
      const values = args.map(value => {
        if (value === null || typeof value === 'string' || typeof value === 'number') return value;
        if (value instanceof ArrayBuffer) return new Uint8Array(value);
        if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
        if (Array.isArray(value)) return new Uint8Array(value);
        throw new TypeError('Unsupported SQLite binding');
      });
      const execute = () => {
        const before = sql.prepare('SELECT total_changes() value').get().value;
        const results = statement.columns().length ? statement.all(...values) : (statement.run(...values), []);
        const changes = Number(sql.prepare('SELECT changes() value').get().value);
        const after = sql.prepare('SELECT total_changes() value').get().value;
        // SELECT leaves changes() unchanged. D1 reports zero changes for reads.
        return { success: true, results, meta: { changes: after === before ? 0 : changes } };
      };
      return {
        bind: (...next) => bound(next),
        async first(column) {
          const row = statement.get(...values);
          return row ? (column === undefined ? row : row[column] ?? null) : null;
        },
        async all() { return execute(); },
        async run() { return execute(); },
        _execute: execute,
        _database: sql,
      };
    }
    return bound();
  }
  return {
    prepare,
    async batch(statements) {
      // No await while holding the write lock: interleaved requests cannot enter
      // a transaction on this connection. SQLite serializes other processes.
      sql.exec('BEGIN IMMEDIATE');
      try {
        const results = statements.map(statement => {
          if (statement._database !== sql) throw new Error('Statement belongs to another database');
          return statement._execute();
        });
        sql.exec('COMMIT');
        return results;
      } catch (error) { sql.exec('ROLLBACK'); throw error; }
    },
    close() { sql.close(); },
    sql,
  };
}
