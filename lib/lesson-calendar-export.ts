import type { StudentAppointment } from './learning/types';

export function meetUrl(value:unknown):string|null {
  if(typeof value!=='string'||!value.trim())return null;
  try{const url=new URL(value.trim());
    if(url.protocol!=='https:'||url.hostname!=='meet.google.com'||url.port||url.username||url.password||!/^\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/i.test(url.pathname))return null;
    return 'https://meet.google.com'+url.pathname.toLowerCase();
  }catch{return null;}
}

function timestamp(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw Error('Data della lezione non valida.');
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}
function text(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
}
function fold(line: string) {
  const encoder = new TextEncoder(); let size = 0, current = ''; const lines: string[] = [];
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    if (size + bytes > 75) { lines.push(current); current = ' '; size = 1; }
    current += char; size += bytes;
  }
  lines.push(current); return lines.join('\r\n');
}
export function lessonCalendar(appointment: StudentAppointment, location: string, now = new Date()) {
  if (!['lesson','booking'].includes(appointment.kind) || appointment.status !== (appointment.kind === 'lesson' ? 'planned' : 'confirmed') || !/^[\w-]{1,100}$/.test(appointment.id)) throw Error('La lezione non è confermata.');
  if (Date.parse(appointment.ends_at) <= Date.parse(appointment.starts_at) || Date.parse(appointment.ends_at) <= now.getTime()) throw Error('La lezione è già terminata o ha un orario non valido.');
  const video=appointment.mode==='Online'?meetUrl(appointment.video_url):null;
  const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Francesco Fracchia//Lezioni private//IT','CALSCALE:GREGORIAN','BEGIN:VEVENT',
    `UID:${appointment.kind}-${appointment.id}@francesco-fracchia`, `DTSTAMP:${timestamp(now.toISOString())}`,
    `DTSTART:${timestamp(appointment.starts_at)}`, `DTEND:${timestamp(appointment.ends_at)}`,
    `SUMMARY:${text(`Lezione di ${appointment.subject} con Francesco Fracchia`)}`, `LOCATION:${text(location)}`,
    `DESCRIPTION:${text('Lezione concordata con Francesco Fracchia. Per spostamenti o cancellazioni contattalo personalmente. Questo file non si aggiorna automaticamente.'+(video?' Collegamento Google Meet: '+video:''))}`,
    ...(video?[`URL:${video}`]:[]),
    'STATUS:CONFIRMED','END:VEVENT','END:VCALENDAR'];
  return lines.map(fold).join('\r\n') + '\r\n';
}
