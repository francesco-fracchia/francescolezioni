import type { D1Database } from "@cloudflare/workers-types";
import {createHash} from 'node:crypto';
import {consultationDay,consultationLeadMs,consultationWindow} from '@/lib/consultations';
export type ConsultationRecurrence={id:string;start_date:string;from_time:string;to_time:string;mode:'Online'|'Lodi'|'Entrambe';active:number;version:number;generated_until:string|null};
export async function dailyConsultationRule(db:D1Database){return db.prepare('SELECT id,start_date,from_time,to_time,mode,active,version,generated_until FROM consultation_recurrence WHERE id=?').bind('daily').first<ConsultationRecurrence>();}
const addDay=(day:string,n:number)=>new Date(Date.parse(day+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
// Generate a bounded rolling window from the saved rule, never reopen blocked slots.
export async function ensureDailyConsultations(db:D1Database,now=Date.now()){
 const rule=await dailyConsultationRule(db);if(!rule?.active)return;
 const today=consultationDay(new Date(now+consultationLeadMs).toISOString());
 const first=rule.start_date>today?rule.start_date:today,target=addDay(first,34);
 if(rule.generated_until&&rule.generated_until>=target)return;
 const from=rule.generated_until&&rule.generated_until>=first?addDay(rule.generated_until,1):first;
 const timestamp=new Date(now).toISOString();
 const statements=[];
 for(let day=from;day<=target;day=addDay(day,1)){
  // First day's earlier times are filtered by the public lead-time query.
  for(const slot of consultationWindow(day,rule.from_time,rule.to_time,Date.parse(day+'T00:00:00Z')-2*86400000)){
   const hex=createHash('sha256').update('daily:'+slot.starts_at).digest('hex');
   const id=hex.slice(0,8)+'-'+hex.slice(8,12)+'-4'+hex.slice(13,16)+'-8'+hex.slice(17,20)+'-'+hex.slice(20,32);
   statements.push(db.prepare(`INSERT INTO consultation_slots(id,starts_at,ends_at,mode,recurrence_id,created_at)
    SELECT ?,?,?,?,'daily',? FROM consultation_recurrence WHERE id='daily' AND active=1 AND version=? ON CONFLICT DO NOTHING`).bind(id,slot.starts_at,slot.ends_at,rule.mode,timestamp,rule.version));
  }
 }
 for(let i=0;i<statements.length;i+=80)await db.batch(statements.slice(i,i+80));
 await db.prepare("UPDATE consultation_recurrence SET generated_until=? WHERE id='daily' AND active=1 AND version=? AND (generated_until IS NULL OR generated_until<?)").bind(target,rule.version,target).run();
}
