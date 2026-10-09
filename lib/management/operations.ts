import {romeDateTime} from '@/lib/lesson-plan';
export const requestStatuses={new:'Nuova',contacted:'Contattato',matching:'Abbinamento in corso',confirmed:'Concordata',closed:'Chiusa'};
export const requestKinds={contact:'Primo contatto',group:'Gruppo','pre-registration':'Pre-iscrizione',lesson:'Lezione',consultation:'Incontro gratuito'};
export const leadSources={unknown:'Da indicare',word_of_mouth:'Passaparola',returning:'Vecchio studente',google:'Google',letuelezioni:'Letuelezioni',superprof:'Superprof',prontopro:'ProntoPro',school:'Scuola / istituto',social:'Social',other:'Altro'};
export function romeDay(value=new Date()){
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(value).map(p=>[p.type,p.value]));
 return `${p.year}-${p.month}-${p.day}`;
}
export function dayWindow(day:string){const next=new Date(Date.parse(day+'T12:00:00Z')+86400000).toISOString().slice(0,10);return {start:romeDateTime(day,'00:00'),end:romeDateTime(next,'00:00')};}
export function localInput(value:string|null|undefined){if(!value)return '';const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value)).map(p=>[p.type,p.value]));return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;}
export type TodayData={day:string;now:string;appointments:{id:string;kind:'lesson'|'booking'|'consultation';name:string;subject:string;mode:string;starts_at:string;ends_at:string;student_id:string|null;request_id:string|null}[];followups:{id:string;name:string;subject:string;status:string;next_action:string|null;next_action_date:string|null}[];corrections:{id:string;assignment_id:string;student_id:string;name:string;title:string;created_at:string}[];saldos:{id:string;name:string;amount:number;kind:'lesson'|'package';student_id:string|null}[];truncated:boolean};
