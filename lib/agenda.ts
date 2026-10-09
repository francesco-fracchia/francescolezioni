// Civil dates and times always follow the tutor's Rome timezone, including DST.
export const agendaDay=(iso:string)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(iso));
export const agendaTime=(iso:string)=>new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(iso));
export const civilDate=(date:string)=>new Date(date+'T12:00:00Z');
export function addDays(date:string,n:number){const d=civilDate(date);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
export function weekDays(date:string){const monday=addDays(date,-((civilDate(date).getUTCDay()+6)%7));return Array.from({length:7},(_,i)=>addDays(monday,i));}
export function monthDays(date:string){const first=date.slice(0,7)+'-01';const start=weekDays(first)[0];const last=civilDate(first);last.setUTCMonth(last.getUTCMonth()+1);last.setUTCDate(0);const count=Math.ceil((((civilDate(first).getUTCDay()+6)%7)+last.getUTCDate())/7)*7;return Array.from({length:count},(_,i)=>addDays(start,i));}
export function shiftMonth(date:string,n:number){const d=civilDate(date);const day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+n);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));return d.toISOString().slice(0,10);}
export function clock(minutes:number){return String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');}
export function eventSpan(event:{starts_at:string;ends_at:string},day:string){const startDay=agendaDay(event.starts_at),endDay=agendaDay(event.ends_at);if(day<startDay||day>endDay)return null;const minutes=(iso:string)=>{const [h,m]=agendaTime(iso).split(':').map(Number);return h*60+m;};const start=day===startDay?minutes(event.starts_at):0;const end=day===endDay?minutes(event.ends_at):1440;return end>start?{start,end}:null;}
// Merge only consecutive available free slots. Missing/occupied slots split the band.
export function freeAvailabilityBands<T extends {id:string;kind:string;starts_at:string;ends_at:string;mode:string;status:string;occupied?:number}>(slots:T[]){
 const bands:{id:string;day:string;starts_at:string;ends_at:string;mode:string;count:number}[]=[];
 for(const s of slots.filter(s=>s.kind==='free'&&s.status==='available'&&!s.occupied).sort((a,b)=>a.starts_at.localeCompare(b.starts_at))){
  const day=agendaDay(s.starts_at),last=bands.at(-1),gap=last?Date.parse(s.starts_at)-Date.parse(last.ends_at):Infinity;
  if(last&&last.day===day&&last.mode===s.mode&&gap>=0&&gap<=5*60000){last.ends_at=s.ends_at;last.count++;}
  else bands.push({id:s.id,day,starts_at:s.starts_at,ends_at:s.ends_at,mode:s.mode,count:1});
 }
 return bands;
}
