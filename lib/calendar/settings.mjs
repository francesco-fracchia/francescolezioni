import { CalendarError, newCalendarToken, openCalendarValue, sealCalendarValue, tokenHash } from './security.mjs';

export async function calendarSettings(db, accountId) {
  return await db.prepare('SELECT * FROM calendar_connections WHERE account_id=?').bind(accountId).first() ||
    { account_id: accountId, encrypted_credentials: null, selected_calendars: '[]', feed_token_hash: null, encrypted_feed_token: null, version: 0 };
}
export function calendarSelection(settings) {
  try {
    const values = JSON.parse(settings.selected_calendars);
    if (!Array.isArray(values) || values.length > 10 || values.some(id => !/^[a-f0-9]{64}$/.test(id))) throw Error();
    return [...new Set(values)];
  } catch { throw new CalendarError('La selezione dei calendari non è valida. Selezionali nuovamente.'); }
}
export function subscriptionUrl(settings, key, origin) {
  if (!settings.feed_token_hash || !settings.encrypted_feed_token) return null;
  const token = openCalendarValue(settings.encrypted_feed_token, key, settings.account_id, 'feed');
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token) || tokenHash(token) !== settings.feed_token_hash) throw new CalendarError('Rigenera il collegamento a Calendario Apple.');
  return `${origin}/api/calendari/lezioni?token=${token}`;
}
export async function updateCalendarSettings(db, account, version, operation, key, credentials) {
  const current = await calendarSettings(db, account.id);
  if (current.version !== version) throw new CalendarError('Le impostazioni sono cambiate. Ricarica prima di riprovare.', 409);
  let encrypted = current.encrypted_credentials, selected = current.selected_calendars;
  let hash = current.feed_token_hash, feed = current.encrypted_feed_token;
  if (operation.kind === 'connect') {
    encrypted = sealCalendarValue(credentials, key, account.id, 'icloud'); selected = '[]';
  } else if (operation.kind === 'disconnect') { encrypted = null; selected = '[]'; }
  else if (operation.kind === 'select') {
    if (!encrypted) throw new CalendarError('Collega prima iCloud.', 409);
    selected = JSON.stringify([...new Set(operation.calendars)]);
  } else if (operation.kind === 'create-feed' || operation.kind === 'rotate-feed') {
    if (operation.kind === 'rotate-feed' || !hash || !feed) {
      const token = newCalendarToken(); hash = tokenHash(token); feed = sealCalendarValue(token, key, account.id, 'feed');
    }
  } else if (operation.kind === 'revoke-feed') { hash = null; feed = null; }
  else throw new CalendarError('Operazione non valida.', 400);
  const result = await db.prepare(`INSERT INTO calendar_connections(account_id,encrypted_credentials,selected_calendars,feed_token_hash,encrypted_feed_token,version,updated_at)
    SELECT ?,?,?,?,?,1,? FROM accounts WHERE id=? AND role='tutor' AND status='active' AND must_change_password=0 AND auth_version=?
    ON CONFLICT(account_id) DO UPDATE SET encrypted_credentials=excluded.encrypted_credentials,selected_calendars=excluded.selected_calendars,feed_token_hash=excluded.feed_token_hash,encrypted_feed_token=excluded.encrypted_feed_token,version=calendar_connections.version+1,updated_at=excluded.updated_at WHERE calendar_connections.version=?`)
    .bind(account.id, encrypted, selected, hash, feed, new Date().toISOString(), account.id, account.auth_version, version).run();
  if (result.meta.changes !== 1) throw new CalendarError('Accesso o impostazioni cambiati. Ricarica prima di riprovare.', 409);
  return calendarSettings(db, account.id);
}
export async function feedAccount(db, token) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  return db.prepare(`SELECT a.id FROM calendar_connections c JOIN accounts a ON a.id=c.account_id WHERE c.feed_token_hash=? AND a.role='tutor' AND a.status='active' AND a.must_change_password=0`).bind(tokenHash(token)).first();
}
