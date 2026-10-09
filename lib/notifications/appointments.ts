import { bookingDb,paymentConfig } from '@/lib/booking/runtime';
import { appointmentMessage,type Appointment,type NoticeKind,type Recipient } from './message';
import { emailConfig,flushNotifications } from './runtime';
export async function noticeStatements(entity:'lesson'|'booking',id:string,kind:NoticeKind,version:number,overrides:Partial<Appointment>={},guard?:string){
 const db=bookingDb();const a=entity==='lesson'?await db.prepare('SELECT * FROM scheduled_lessons WHERE id=?').bind(id).first<Appointment & {name:string;email:string;student_id:string|null}>():await db.prepare('SELECT b.*,s.starts_at,s.ends_at,s.mode FROM bookings b JOIN booking_slots s ON b.slot_id=s.id WHERE b.id=?').bind(id).first<Appointment & {name:string;email:string;student_id:string|null}>();if(!a)return [];
 let recipients:Recipient[];
 if(entity==='lesson'){
  const people=await db.prepare('SELECT p.id,p.student_id,p.name,p.email,p.amount,p.access_token,s.name AS current_name,s.email AS current_email,s.notifications FROM lesson_payments p LEFT JOIN students s ON s.id=p.student_id WHERE p.lesson_id=?').bind(id).all<{id:string;student_id:string|null;name:string;email:string;amount:number;access_token:string;current_name?:string;current_email?:string;notifications?:number}>();
  recipients=people.results.map(p=>({name:p.current_name||p.name,email:p.current_email||p.email,studentId:p.student_id,notifications:p.notifications,amount:p.amount,paymentLink:paymentConfig().origin?`${paymentConfig().origin}/pagamento?saldo=${p.id}#${p.access_token}`:undefined}));
 }else recipients=[];
 if(!recipients.length){const s=a.student_id?await db.prepare('SELECT name,email,notifications FROM students WHERE id=?').bind(a.student_id).first<{name:string;email:string;notifications:number}>():null;recipients=[{name:s?.name||a.name,email:s?.email||a.email,studentId:a.student_id,notifications:s?.notifications}];}
 return recipients.map(r=>newNoticeStatement(entity,id,kind,version,{...a,...overrides},r,guard));
}
export function newNoticeStatement(entity:'lesson'|'booking',id:string,kind:NoticeKind,version:number,a:Appointment,r:Recipient,guard?:string){
 const config=emailConfig();const table=entity==='lesson'?'scheduled_lessons':'bookings';
 const message=appointmentMessage(kind,a,r);const now=new Date().toISOString();const key=`${entity}:${id}:${kind}:${version}:${r.studentId||r.email}`;
 return bookingDb().prepare(`INSERT OR IGNORE INTO notifications(id,event_key,student_id,entity_type,entity_id,kind,recipient,subject,body,payload,status,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM ${table} WHERE id=? AND version=?${guard?' AND '+guard:''})`).bind(crypto.randomUUID(),key,r.studentId||null,entity,id,kind,r.email,message.subject,message.body,JSON.stringify({from:config.from,to:[r.email],reply_to:config.replyTo,subject:message.subject,text:message.body}),r.notifications===0?'suppressed':config.ready?'queued':'prepared',now,now,id,version);
}
export async function enqueueAppointmentNotice(entity:'lesson'|'booking',id:string,kind:NoticeKind,version:number,guard?:string){const statements=await noticeStatements(entity,id,kind,version,{},guard);if(statements.length)await bookingDb().batch(statements);}
export async function dispatchAppointmentNotices(){try{return await flushNotifications();}catch{return {sent:0,ready:emailConfig().ready};}}
