import { env } from '@/lib/runtime-env';
import { bookingDb } from './runtime';
// Civil dates and offset are resolved in Europe/Rome, including DST changes.
export function romeSlot(date:string,hour:number) {
 const guess=Date.parse(`${date}T${String(hour).padStart(2,'0')}:00:00Z`);
 const localHour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Rome',hour:'2-digit',hourCycle:'h23'}).format(new Date(guess)));
 return new Date(guess-(localHour-hour)*3600000).toISOString();
}
export async function ensureSchedule() {
 if(env.BOOKING_SCHEDULE_ENABLED!=='1')return;
 const db=bookingDb();const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const existing=await db.prepare('SELECT starts_at FROM booking_slots WHERE starts_at > ?').bind(new Date().toISOString()).all<{starts_at:string}>();
 const taken=new Set(existing.results.map(row=>row.starts_at));const statements=[];
 for(let day=1;day<=21;day++) {
 const date=new Date(Date.parse(`${today}T12:00:00Z`)+day*86400000);const weekday=date.getUTCDay();if(weekday===0)continue;
 const dateString=date.toISOString().slice(0,10);
 for(let hour=weekday===6?9:8;hour<(weekday===6?12:19);hour++) {
 const start=romeSlot(dateString,hour);if(taken.has(start)||Date.parse(start)<Date.now()+86400000)continue;
 const end=new Date(Date.parse(start)+55*60000).toISOString();
 statements.push(db.prepare("INSERT OR IGNORE INTO booking_slots (id,starts_at,ends_at,mode,status) SELECT ?,?,?,'Online','available' WHERE NOT EXISTS (SELECT 1 FROM booking_slots WHERE starts_at < ? AND ends_at > ?)").bind(`online-${start}`,start,end,new Date(Date.parse(start)+60*60000).toISOString(),new Date(Date.parse(start)-5*60000).toISOString()));
 }
 }
 for(let i=0;i<statements.length;i+=25)await db.batch(statements.slice(i,i+25));
}
