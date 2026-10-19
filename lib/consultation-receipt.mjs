const encoder = new TextEncoder();
const text = value => String(value).replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
const stamp = value => new Date(value).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
function fold(line) {
  const parts = []; let part = '', bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > 75) {parts.push(part);part=' ';bytes=1;}
    part+=char;bytes+=size;
  }
  return [...parts,part].join('\r\n');
}
export function consultationReceipt(appointment, now = Date.now()) {
  if (!appointment || appointment.status !== 'confirmed' || !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(appointment.id) ||
      !['Online','Lodi'].includes(appointment.mode) || !Number.isFinite(Date.parse(appointment.starts_at)) ||
      !Number.isFinite(Date.parse(appointment.ends_at)) || Date.parse(appointment.ends_at)<=Date.parse(appointment.starts_at)) throw Error('Incontro non confermato o dati non validi.');
  const day = new Intl.DateTimeFormat('it-IT',{dateStyle:'full',timeZone:'Europe/Rome'}).format(new Date(appointment.starts_at));
  const time = value => new Intl.DateTimeFormat('it-IT',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Rome'}).format(new Date(value));
  const location = appointment.mode==='Lodi' ? 'Via San Colombano 43, Lodi' : 'Online';
  const instructions = appointment.mode==='Lodi'
    ? 'Ci incontriamo in Via San Colombano 43 a Lodi. Porta il programma e, se vuoi, un esercizio o una verifica.'
    : 'Riceverai il collegamento alla videochiamata ai recapiti indicati nella prenotazione, prima dell’incontro. Se non ti è arrivato, scrivimi su WhatsApp.';
  const summary = `Incontro gratuito con Francesco Fracchia\n${day}, ${time(appointment.starts_at)}–${time(appointment.ends_at)} (ora di Roma)\n${location}\n${instructions}\nPer spostare o cancellare: WhatsApp +39 350 031 6324.\nSe concordiamo una modifica, aggiorna anche il tuo calendario.`;
  const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Lezioni Francesco//Incontro gratuito//IT','CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT',
    `UID:ff-consultation-${appointment.id}@lezionifrancesco.app`,`DTSTAMP:${stamp(now)}`,`DTSTART:${stamp(appointment.starts_at)}`,`DTEND:${stamp(appointment.ends_at)}`,
    'SUMMARY:Incontro gratuito con Francesco Fracchia',`LOCATION:${text(location)}`,`DESCRIPTION:${text(summary)}`,'STATUS:CONFIRMED','TRANSP:OPAQUE',
    'BEGIN:VALARM','TRIGGER:-PT30M','ACTION:DISPLAY','DESCRIPTION:Incontro gratuito con Francesco Fracchia','END:VALARM','END:VEVENT','END:VCALENDAR'];
  return {summary,instructions,calendar:lines.map(fold).join('\r\n')+'\r\n'};
}
