import ICAL from 'ical.js';
import { createHash } from 'node:crypto';
import { CalendarError } from './security.mjs';

function wallTime(time, zone = 'Europe/Rome') {
  const guess = Date.UTC(time.year, time.month - 1, time.day, time.hour || 0, time.minute || 0, time.second || 0);
  const format = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  let result = guess;
  for (let i = 0; i < 3; i++) {
    const p = Object.fromEntries(format.formatToParts(new Date(result)).map(p => [p.type, p.value]));
    const shown = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    if (shown === guess) return result;
    result += guess - shown;
  }
  throw new CalendarError('Un evento iCloud contiene un orario non valido.');
}
function instant(time, component) {
  if (!time) throw new CalendarError('Un evento iCloud non contiene una data.');
  if (time.isDate) return wallTime(time);
  const property = component.getFirstProperty('dtstart'), tzid = property?.getParameter('tzid');
  if (time.zone?.tzid === 'floating' || !time.zone) return wallTime(time, tzid || 'Europe/Rome');
  return time.toUnixTime() * 1000;
}
export function calendarRange(from, to) {
  const valid = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value + 'T12:00:00Z')) && new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) === value;
  if (!valid(from) || !valid(to)) throw new CalendarError('Periodo non valido.', 400);
  const date = value => { const [year, month, day] = value.split('-').map(Number); return wallTime({ year, month, day }); };
  const start = date(from), end = date(to);
  if (end <= start || end - start > 63 * 86400000) throw new CalendarError('Scegli un periodo di massimo due mesi.', 400);
  return { start: new Date(start).toISOString(), end: new Date(end).toISOString() };
}
export function readCalendarObjects(objects, calendar, range) {
  const output = new Map(), start = Date.parse(range.start), end = Date.parse(range.end);
  if (objects.length > 2000) throw new CalendarError('Troppi eventi iCloud nel periodo selezionato.');
  let iterations = 0;
  for (const object of objects) {
    if (typeof object.data !== 'string' || Buffer.byteLength(object.data) > 2 * 1024 * 1024) throw new CalendarError('Un evento iCloud supera il limite di lettura.');
    const root = new ICAL.Component(ICAL.parse(object.data));
    const components = root.getAllSubcomponents('vevent');
    if (components.length > 2000) throw new CalendarError('Troppi eventi iCloud nel periodo selezionato.');
    const masters = new Set(components.filter(c => !c.hasProperty('recurrence-id')).map(c => c.getFirstPropertyValue('uid')));
    function add(event, occurrence, identity) {
      if (event.component.getFirstPropertyValue('status')?.toUpperCase() === 'CANCELLED') return;
      const begins = instant(occurrence.startDate, event.component), ends = instant(occurrence.endDate, event.component);
      if (begins >= end || ends <= start || ends <= begins) return;
      const uid = event.uid;
      // Never mirror our own subscription back into the app a second time.
      if (uid?.startsWith('ff-app-') && uid.endsWith('@lezionifrancesco.app')) return;
      const id = createHash('sha256').update(`${calendar.id}:${uid || object.url}:${identity}`).digest('hex');
      output.set(id, { kind: 'icloud', id, calendar_id: calendar.id, calendar_name: calendar.name, color: calendar.color,
        name: String(event.summary || 'Senza titolo').slice(0, 240), description: String(event.description || '').slice(0, 4000), location: String(event.location || '').slice(0, 500),
        starts_at: new Date(begins).toISOString(), ends_at: new Date(ends).toISOString(), busy: event.component.getFirstPropertyValue('transp')?.toUpperCase() !== 'TRANSPARENT', all_day: !!occurrence.startDate.isDate });
      if (output.size > 2000) throw new CalendarError('Troppi eventi iCloud nel periodo selezionato.');
    }
    for (const component of components) {
      if (component.hasProperty('recurrence-id') && masters.has(component.getFirstPropertyValue('uid'))) continue;
      const event = new ICAL.Event(component, { strictExceptions: true, exceptions: component.hasProperty('recurrence-id')?[]:components.filter(other=>other.hasProperty('recurrence-id')&&other.getFirstPropertyValue('uid')===component.getFirstPropertyValue('uid')) });
      if (!event.isRecurring()) { add(event, event, event.recurrenceId?.toString() || 'single'); continue; }
      const iterator = event.iterator(); let next;
      while ((next = iterator.next())) {
        if (++iterations > 20000) throw new CalendarError('Questa ricorrenza iCloud richiede un periodo più breve.');
        const occurrence = event.getOccurrenceDetails(next);
        add(occurrence.item, occurrence, next.toString());
        // Include moved exceptions separately below, even if their original date is later.
        if (instant(next, component) >= end) break;
      }
      for (const exception of Object.values(event.exceptions)) add(exception, exception, exception.recurrenceId?.toString() || 'exception');
    }
  }
  return [...output.values()].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}
