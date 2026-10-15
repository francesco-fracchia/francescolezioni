import type {D1Database} from '@cloudflare/workers-types';
import {createHash} from 'node:crypto';
import {consultationDay,consultationLeadMs,consultationWindow} from '@/lib/consultations';
export type ConsultationRecurrence={id:string;start_date:string;from_time:string;to_time:string;mode:'Online'|'Lodi'|'Entrambe';active:number;version:number;generated_until:string|null;paid_generated_until:string|null;week_days:string;lessons_enabled:number;consultations_enabled:number};
export async function dailyConsultationRule(db:D1Database){return db.prepare("SELECT * FROM consultation_recurrence WHERE id='daily'").first<ConsultationRecurrence>();}
const addDay=(day:string,n:number)=>new Date(Date.parse(day+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
// A saved working week generates both formats; appointments and explicit blocks survive.
export async function ensureAutomaticSlots(db:D1Database,kind:'free'|'paid',now=Date.now()){
 const rule=await dailyConsultationRule(db);
 if(!rule?.active||!(kind==='free'?rule.consultations_enabled:rule.lessons_enabled))return;
 const today=consultationDay(new Date(now+consultationLeadMs).toISOString()),first=rule.start_date>today?rule.start_date:today,target=addDay(first,34);
 const generated=kind==='free'?rule.generated_until:rule.paid_generated_until;
 if(generated&&generated>=target)return;
 const from=generated&&generated>=first?addDay(generated,1):first,weekDays:number[]=JSON.parse(rule.week_days),timestamp=new Date(now).toISOString(),statements=[];
 for(let day=from;day<=target;day=addDay(day,1)){
  if(!weekDays.includes(new Date(day+'T12:00:00Z').getUTCDay()))continue;
  const free=consultationWindow(day,rule.from_time,rule.to_time,Date.parse(day+'T00:00:00Z')-2*86400000);
  const duration=(Number(rule.to_time.slice(0,2))*60+Number(rule.to_time.slice(3)))-(Number(rule.from_time.slice(0,2))*60+Number(rule.from_time.slice(3)));
  const slots=kind==='free'?free:Array.from({length:Math.floor(duration/60)},(_,i)=>({starts_at:new Date(Date.parse(free[0].starts_at)+i*3600000).toISOString(),ends_at:new Date(Date.parse(free[0].starts_at)+(i*60+55)*60000).toISOString()}));
  for(const slot of slots){
   const hex=createHash('sha256').update('daily:'+slot.starts_at).digest('hex'),id=kind==='paid'?'online-'+slot.starts_at:hex.slice(0,8)+'-'+hex.slice(8,12)+'-4'+hex.slice(13,16)+'-8'+hex.slice(17,20)+'-'+hex.slice(20,32);
   const table=kind==='free'?'consultation_slots':'booking_slots',extra=kind==='free'?',created_at':'',placeholder=kind==='free'?',?':'';
   const values=[id,slot.starts_at,slot.ends_at,rule.mode,rule.version,...(kind==='free'?[timestamp]:[]),rule.version];
   statements.push(db.prepare(`INSERT INTO ${table}(id,starts_at,ends_at,mode,recurrence_id,generated_version${extra}) SELECT ?,?,?,?,'daily',?${placeholder} FROM consultation_recurrence WHERE id='daily' AND active=1 AND version=?
    ON CONFLICT DO UPDATE SET generated_version=excluded.generated_version,mode=excluded.mode WHERE ${table}.recurrence_id='daily' AND ${table}.status IN ('available','blocked') AND NOT EXISTS(SELECT 1 FROM ${kind==='free'?'consultations':'bookings'} b WHERE ${kind==='free'?"b.slot_id=consultation_slots.id AND b.status='confirmed'":"b.slot_id=booking_slots.id AND b.status IN ('pending','confirmed','awaiting_payment','payment_review')"})`).bind(...values));
  }
 }
 for(let i=0;i<statements.length;i+=80)await db.batch(statements.slice(i,i+80));
 const column=kind==='free'?'generated_until':'paid_generated_until';
 await db.prepare(`UPDATE consultation_recurrence SET ${column}=? WHERE id='daily' AND active=1 AND version=? AND (${column} IS NULL OR ${column}<?)`).bind(target,rule.version,target).run();
}
export async function ensureDailyConsultations(db:D1Database,now=Date.now()){return ensureAutomaticSlots(db,'free',now);}
