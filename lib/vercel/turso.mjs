import { createClient } from '@libsql/client';

export function tursoConfigured(config = process.env) {
  try {
    const url = new URL(config.TURSO_DATABASE_URL);
    return ['libsql:', 'https:'].includes(url.protocol) && url.hostname.endsWith('.turso.io') &&
      !url.username && !url.password && !url.search && !url.hash &&
      (url.pathname === '' || url.pathname === '/') && !!config.TURSO_AUTH_TOKEN?.trim();
  } catch { return false; }
}

export function createTursoDatabase({ url, authToken, client } = {}) {
  if (!client && !tursoConfigured({ TURSO_DATABASE_URL: url, TURSO_AUTH_TOKEN: authToken })) {
    throw new Error('Turso database configuration missing');
  }
  const connection = client || createClient({ url, authToken, intMode: 'bigint' });
  const owner = Symbol('turso');
  const value = input => {
    if (typeof input !== 'bigint') return input;
    const number = Number(input);
    if (!Number.isSafeInteger(number)) throw new Error('Database integer out of range');
    return number;
  };
  function result(rowset, changes) {
    return { success: true, results: rowset.rows.map(row => Object.fromEntries(
      rowset.columns.map(column => [column, value(row[column])]),
    )), meta: { changes } };
  }
  async function execute(statements) {
    try {
      // Turso commits this whole batch or rolls it back. Never send separate
      // writes for a booking, balance or assignment, and never retry it here.
      // libSQL's local driver reports rowsAffected=0 for INSERT RETURNING.
      // Read SQLite's counters within the same atomic batch so conditional
      // writes and trigger effects retain the exact contract used by the app.
      const counter = 'SELECT changes() AS direct_changes,total_changes() AS total_changes';
      const queries = [{ sql: counter, args: [] }, ...statements.flatMap(s => [s, { sql: counter, args: [] }])];
      const rows = await connection.batch(queries, 'write');
      let before = value(rows[0].rows[0].total_changes);
      return statements.map((_, index) => {
        const rowset = rows[index * 2 + 1], counters = rows[index * 2 + 2].rows[0];
        const after = value(counters.total_changes);
        const changes = after === before ? 0 : value(counters.direct_changes);
        before = after;
        return result(rowset, changes);
      });
    } catch (error) {
      // Preserve only known conflict codes used by the API, never provider SQL,
      // table names, parameters or credentials.
      const message = error instanceof Error ? error.message : '';
      const conflict = /\b(LESSON_CONFLICT|CONSULTATION_SLOT_CHANGED|REFERRAL_CREDIT_PAYMENT_METHOD|REFERRAL_CREDIT_UNAVAILABLE|PACKAGE_PAYMENT_METHOD|PACKAGE_UNAVAILABLE)\b/.exec(message)?.[1];
      if (conflict) throw new Error(conflict);
      if (error?.code?.startsWith('SQLITE_CONSTRAINT') && /UNIQUE constraint failed/.test(message)) throw new Error('UNIQUE constraint');
      throw new Error('Database unavailable; outcome may require verification');
    }
  }
  function prepare(sql, args = []) {
    if (typeof sql !== 'string' || !sql.trim()) throw new TypeError('Invalid SQL statement');
    const statement = {
      bind(...values) {
        if (values.some(v => v !== null && typeof v !== 'string' && !(typeof v === 'number' && Number.isFinite(v)))) {
          throw new TypeError('Unsupported database binding');
        }
        return prepare(sql, values);
      },
      async all() { return (await execute([{ sql, args }]))[0]; },
      async run() { return statement.all(); },
      async first(column) {
        const row = (await statement.all()).results[0];
        return row ? column === undefined ? row : row[column] ?? null : null;
      },
      _owner: owner, _query: { sql, args },
    };
    return statement;
  }
  return {
    prepare,
    async batch(statements) {
      if (statements.some(s => s._owner !== owner)) throw new Error('Statement belongs to another database');
      return statements.length ? execute(statements.map(s => s._query)) : [];
    },
    close() { connection.close(); },
  };
}
