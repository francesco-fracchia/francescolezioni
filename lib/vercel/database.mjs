// Keep the D1 statement/batch contract; do not emulate a transaction with
// independent HTTP writes. Only the server holds the Cloudflare API token.
export function createRemoteDatabase({ accountId, databaseId, token, fetcher = fetch }) {
  if (!/^[a-f0-9]{32}$/i.test(accountId || '') || !/^[a-f0-9-]{36}$/i.test(databaseId || '') || !token) throw new Error('Remote database configuration missing');
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
  const owner = Symbol('database');
  async function query(batch) {
    let response;
    try {
      response = await fetcher(endpoint, {
        method: 'POST', redirect: 'error', cache: 'no-store',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch }), signal: AbortSignal.timeout(20000),
      });
    } catch { throw new Error('Remote database unavailable; outcome may require verification'); }
    // Do not retry uncertain writes or expose provider SQL/secrets in errors.
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.success !== true || !Array.isArray(payload.result) || payload.result.length !== batch.length || payload.result.some(r => r.success !== true || !Array.isArray(r.results) || !Number.isSafeInteger(r.meta?.changes))) {
      throw new Error('Remote database query failed; outcome may require verification');
    }
    return payload.result;
  }
  function prepare(sql, params = []) {
    if (typeof sql !== 'string' || !sql.trim()) throw new TypeError('Invalid SQL statement');
    const statement = {
      bind(...values) {
        if (values.some(v => v !== null && typeof v !== 'string' && !(typeof v === 'number' && Number.isFinite(v)))) throw new TypeError('Unsupported remote database binding');
        return prepare(sql, values);
      },
      async all() { return (await query([{ sql, params }]))[0]; },
      async run() { return statement.all(); },
      async first(column) {
        const row = (await statement.all()).results[0];
        return row ? column === undefined ? row : row[column] ?? null : null;
      },
      _owner: owner, _query: { sql, params },
    };
    return statement;
  }
  return {
    prepare,
    async batch(statements) {
      if (statements.some(s => s._owner !== owner)) throw new Error('Statement belongs to another database');
      if (!statements.length) return [];
      return query(statements.map(s => s._query));
    },
  };
}
