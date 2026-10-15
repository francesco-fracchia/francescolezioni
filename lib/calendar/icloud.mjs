import { createDAVClient } from 'tsdav';
import { createHash } from 'node:crypto';
import { CalendarError } from './security.mjs';
import { readCalendarObjects } from './ical.mjs';

export function appleCalendarUrl(value) {
  let url; try { url = new URL(value); } catch { throw new CalendarError('Indirizzo iCloud non valido.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash || !/^(?:caldav|p\d+-caldav)\.icloud\.com$/.test(url.hostname)) throw new CalendarError('Indirizzo iCloud non consentito.');
  return url.href;
}
export function readOnlyAppleFetch(fetcher = fetch, deadline = Date.now() + 25000) {
  let requests = 0;
  return async (input, options = {}) => {
    const method = (options.method || 'GET').toUpperCase();
    if (!['GET', 'PROPFIND', 'REPORT', 'OPTIONS'].includes(method)) throw new CalendarError('Il collegamento iCloud consente soltanto la lettura.');
    let url = appleCalendarUrl(String(input));
    for (let redirects = 0; redirects < 4; redirects++) {
      if (++requests > 40 || deadline <= Date.now()) throw new CalendarError('iCloud impiega troppo tempo a rispondere. Riprova.');
      const response = await fetcher(url, { ...options, method, redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())) });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location'); await response.body?.cancel();
        if (!location) throw new CalendarError('Risposta iCloud non valida.');
        const target = appleCalendarUrl(new URL(location, url).href);
        if(options.redirect==='manual')return new Response(null,{status:response.status,headers:{Location:target}});
        url = target; continue;
      }
      if ([401, 403].includes(response.status)) { await response.body?.cancel(); throw new CalendarError('Accesso iCloud non riuscito. Controlla email e password specifica per l’app.', 502); }
      const reader = response.body?.getReader(); let bytes = 0; const chunks = [];
      if (reader) { for (;;) { const { done, value } = await reader.read(); if (done) break; bytes += value.byteLength; if (bytes > 5 * 1024 * 1024) { await reader.cancel(); throw new CalendarError('La risposta iCloud è troppo grande.'); } chunks.push(value); } }
      const text = Buffer.concat(chunks).toString('utf8');
      if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new CalendarError('Risposta iCloud non supportata.');
      const limited = new Response([204, 205, 304].includes(response.status) ? null : text, { status: response.status, statusText: response.statusText, headers: response.headers });
      Object.defineProperty(limited, 'url', { value: url });
      return limited;
    }
    throw new CalendarError('Troppi reindirizzamenti iCloud.');
  };
}
export async function iCloudClient(credentials, fetcher = fetch) {
  return createDAVClient({ serverUrl: 'https://caldav.icloud.com', credentials: { username: credentials.appleId, password: credentials.password }, authMethod: 'Basic', defaultAccountType: 'caldav', fetch: readOnlyAppleFetch(fetcher) });
}
/** @returns {Promise<Array<{raw: import('tsdav').DAVCalendar,id:string,name:string,color:string}>>} */
export async function discoverCalendars(client) {
  const calendars = await client.fetchCalendars();
  if (calendars.length > 50) throw new CalendarError('iCloud contiene più di 50 calendari.');
  return calendars.map(calendar => {
    const url = appleCalendarUrl(calendar.url);
    return { raw: calendar, id: createHash('sha256').update(url).digest('hex'), name: String(calendar.displayName || 'Calendario iCloud').slice(0, 120), color: /^#[a-f\d]{6}(?:[a-f\d]{2})?$/i.test(calendar.calendarColor || '') ? calendar.calendarColor.slice(0, 7) : '#087f8c' };
  });
}
export async function fetchICloudEvents(client, calendars, selectedIds, range) {
  const selected = calendars.filter(calendar => selectedIds.includes(calendar.id));
  if (selected.length !== selectedIds.length) throw new CalendarError('Un calendario selezionato non è più disponibile. Aggiorna la selezione.', 409);
  const results = await Promise.all(selected.map(async calendar => {
    const objects = await client.fetchCalendarObjects({ calendar: calendar.raw, timeRange: range, expand: true, useMultiGet: false, urlFilter: () => true });
    return readCalendarObjects(objects, calendar, range);
  }));
  if (results.reduce((count, events) => count + events.length, 0) > 2000) throw new CalendarError('Troppi eventi iCloud nel periodo selezionato.');
  return results.flat();
}
