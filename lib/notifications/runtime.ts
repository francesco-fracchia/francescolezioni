import { env } from '@/lib/runtime-env';
import { bookingDb } from '@/lib/booking/runtime';
export function emailConfig(){const from=env.EMAIL_FROM||'Francesco Fracchia <info@francescofracchia.it>';return {from,replyTo:env.EMAIL_REPLY_TO||'info@francescofracchia.it',ready:env.NOTIFICATIONS_MODE==='live'&&!!env.RESEND_API_KEY?.startsWith('re_')&&!!env.EMAIL_FROM};}
export type NoticeRow={id:string;entity_type:string;entity_id:string;event_key:string;kind:string;recipient:string;subject:string;body:string;payload:string;status:string;student_id:string|null;first_attempt_at:string|null;updated_at:string};
export async function flushNotifications(ids?:string[]){
 const config=emailConfig();if(!config.ready)return {sent:0,ready:false};
 const db=bookingDb();const now=new Date().toISOString();
 const conditions=ids?.length?` AND id IN (${ids.map(()=>'?').join(',')})`:'';
 const rows=await db.prepare(`SELECT * FROM notifications WHERE (status IN ('queued','failed') OR (status='sending' AND updated_at<?))${conditions} ORDER BY created_at LIMIT 100`).bind(new Date(Date.now()-5*60000).toISOString(),...(ids||[])).all<NoticeRow>();let sent=0;
 for(const row of rows.results){
  const table=row.entity_type==='lesson'?'scheduled_lessons':'bookings';const appointment=await db.prepare(`SELECT version,status FROM ${table} WHERE id=?`).bind(row.entity_id).first<{version:number;status:string}>();
  if(!appointment||appointment.version!==Number(row.event_key.split(':')[3])){await db.prepare("UPDATE notifications SET status='superseded',error='Sostituita da una modifica più recente dell’appuntamento.',updated_at=? WHERE id=? AND status!='sent'").bind(now,row.id).run();continue;}

  if(row.first_attempt_at&&Date.now()-Date.parse(row.first_attempt_at)>23*3600000){await db.prepare("UPDATE notifications SET status='manual_review',error='Esito incerto: verifica il servizio email prima di ritentare.',updated_at=? WHERE id=? AND status!='sent'").bind(now,row.id).run();continue;}
  if(row.student_id){const s=await db.prepare('SELECT email,notifications FROM students WHERE id=?').bind(row.student_id).first<{email:string;notifications:number}>();if(!s||!s.notifications||s.email!==row.recipient){await db.prepare("UPDATE notifications SET status='suppressed',error='Contatto o preferenza modificati.',updated_at=? WHERE id=? AND status!='sent'").bind(now,row.id).run();continue;}}
  const claim=await db.prepare("UPDATE notifications SET status='sending',first_attempt_at=COALESCE(first_attempt_at,?),updated_at=? WHERE id=? AND (status IN ('queued','failed') OR (status='sending' AND updated_at<?))").bind(now,now,row.id,new Date(Date.now()-5*60000).toISOString()).run();if(!claim.meta.changes)continue;
  try{
   await new Promise(resolve=>setTimeout(resolve,550));
   const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':row.id},body:row.payload,signal:AbortSignal.timeout(10000)});
   const data=await response.json() as {id?:string};if(!response.ok||!data.id)throw Error('Email unavailable');
   await db.prepare("UPDATE notifications SET status='sent',provider_id=?,error=NULL,updated_at=? WHERE id=? AND status='sending'").bind(data.id,new Date().toISOString(),row.id).run();sent++;
  }catch{await db.prepare("UPDATE notifications SET status='failed',error='Invio non confermato: riprova dal pannello notifiche.',updated_at=? WHERE id=? AND status='sending'").bind(new Date().toISOString(),row.id).run();}
 }
 return {sent,ready:true};
}
