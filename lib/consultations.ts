import { romeDateTime } from '@/lib/lesson-plan';
export const consultationMinutes = 15;
export const consultationBufferMinutes = 5;
export const consultationLeadMs = 24 * 60 * 60 * 1000;
export type ConsultationSlot = {id:string;starts_at:string;ends_at:string;mode:'Online'|'Lodi'|'Entrambe';status?:string;occupied?:number};
export type Consultation = {id:string;slot_id:string;request_id:string;name:string;email:string;phone:string;subject:string;student_type:string;message:string;mode:string;starts_at:string;ends_at:string;status:string;version:number};
export const consultationDate = (s:string) => new Intl.DateTimeFormat('it-IT',{dateStyle:'full',timeZone:'Europe/Rome'}).format(new Date(s));
export const consultationTime = (s:string) => new Intl.DateTimeFormat('it-IT',{timeStyle:'short',timeZone:'Europe/Rome'}).format(new Date(s));
export const consultationDay = (s:string) => new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Europe/Rome'}).format(new Date(s));
export function consultationWindow(date:string,from:string,to:string,now=Date.now()) {
 const start=Date.parse(romeDateTime(date,from)),end=Date.parse(romeDateTime(date,to));
 if(start<now+consultationLeadMs||end>now+366*86400000||end<=start||end-start>12*3600000)throw Error('INVALID_WINDOW');
 const slots=[];
 for(let time=start;time+(consultationMinutes+consultationBufferMinutes)*60000<=end;time+=(consultationMinutes+consultationBufferMinutes)*60000)slots.push({starts_at:new Date(time).toISOString(),ends_at:new Date(time+consultationMinutes*60000).toISOString()});
 if(!slots.length)throw Error('INVALID_WINDOW');
 return slots;
}
// Same five-minute buffer as paid lessons. Available paid slots do not occupy time.
export const consultationOccupiedSql = `EXISTS(SELECT 1 FROM consultations c WHERE c.status='confirmed' AND julianday(c.starts_at)<julianday(s.ends_at)+5.0/1440 AND julianday(c.ends_at)>julianday(s.starts_at)-5.0/1440)
 OR EXISTS(SELECT 1 FROM booking_slots b WHERE b.status!='available' AND julianday(b.starts_at)<julianday(s.ends_at)+5.0/1440 AND julianday(b.ends_at)>julianday(s.starts_at)-5.0/1440)
 OR EXISTS(SELECT 1 FROM scheduled_lessons l WHERE l.status='planned' AND julianday(l.starts_at)<julianday(s.ends_at)+5.0/1440 AND julianday(l.ends_at)>julianday(s.starts_at)-5.0/1440)`;

export const consultationRecurrenceEnabledSql = `(s.recurrence_id IS NULL OR EXISTS(SELECT 1 FROM consultation_recurrence r WHERE r.id=s.recurrence_id AND r.active=1))`;
