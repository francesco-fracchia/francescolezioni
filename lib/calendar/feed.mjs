import { CalendarError } from './security.mjs';

function stamp(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new CalendarError('Un appuntamento contiene un orario non valido.');
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}
const escape = value => String(value).replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
function fold(line) {
  const lines = []; let current = '', bytes = 0;
  for (const char of line) { const length = Buffer.byteLength(char); if (bytes + length > 75) { lines.push(current); current = ' '; bytes = 1; } current += char; bytes += length; }
  return [...lines, current].join('\r\n');
}
export function renderTutorCalendar(events, now = Date.now()) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Francesco Fracchia//Agenda tutor//IT', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Lezioni Francesco', 'X-WR-TIMEZONE:Europe/Rome', 'REFRESH-INTERVAL;VALUE=DURATION:PT15M', 'X-PUBLISHED-TTL:PT15M'];
  for (const event of events) {
    const cancelled = ['cancelled', 'expired'].includes(event.status);
    lines.push('BEGIN:VEVENT', `UID:ff-app-${event.kind}-${escape(event.id)}@lezionifrancesco.app`, `DTSTAMP:${stamp(now)}`, `DTSTART:${stamp(event.starts_at)}`, `DTEND:${stamp(event.ends_at)}`,
      `SEQUENCE:${Number.isSafeInteger(event.version) && event.version >= 0 ? event.version : 0}`,
      `SUMMARY:${escape(event.kind === 'consultation' ? 'Incontro gratuito · ' + event.subject : 'Lezione di ' + event.subject)}`,
      `LOCATION:${escape(event.mode === 'Lodi' ? 'Via San Colombano 43, Lodi' : 'Online')}`,
      'DESCRIPTION:Gestisci questo appuntamento nella piattaforma delle lezioni. I nomi e i recapiti degli studenti non sono inclusi.',
      `STATUS:${cancelled ? 'CANCELLED' : ['planned', 'confirmed'].includes(event.status) ? 'CONFIRMED' : 'TENTATIVE'}`, 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
export async function tutorCalendarEvents(db, now = Date.now()) {
  const from = new Date(now - 90 * 86400000).toISOString(), to = new Date(now + 365 * 86400000).toISOString();
  const [lessons, bookings, consultations] = await Promise.all([
    db.prepare("SELECT id,version,subject,starts_at,ends_at,mode,status FROM scheduled_lessons WHERE ends_at>? AND starts_at<? ORDER BY starts_at LIMIT 2001").bind(from, to).all(),
    db.prepare("SELECT b.id,b.version,b.subject,s.starts_at,s.ends_at,s.mode,b.status FROM bookings b JOIN booking_slots s ON b.slot_id=s.id WHERE s.ends_at>? AND s.starts_at<? ORDER BY s.starts_at LIMIT 2001").bind(from, to).all(),
    db.prepare("SELECT id,version,subject,starts_at,ends_at,mode,status FROM consultations WHERE ends_at>? AND starts_at<? ORDER BY starts_at LIMIT 2001").bind(from, to).all(),
  ]);
  if ([lessons, bookings, consultations].some(result => result.results.length > 2000)) throw new CalendarError('Il calendario supera il limite di appuntamenti esportabili.');
  return [...lessons.results.map(e => ({ ...e, kind: 'lesson' })), ...bookings.results.map(e => ({ ...e, kind: 'booking' })), ...consultations.results.map(e => ({ ...e, kind: 'consultation' }))];
}
