import { noticeStatements,dispatchAppointmentNotices } from '@/lib/notifications/appointments';
import { bookingDb } from './runtime';
import { reconcileLessonPayment } from './lesson-checkout';
export async function expireUnpaidLessons(){
 const db=bookingDb();
 const pending=await db.prepare("SELECT id FROM lesson_payments WHERE status='pending' AND stripe_session IS NOT NULL LIMIT 20").all<{id:string}>();
 await Promise.allSettled(pending.results.map(p=>reconcileLessonPayment(p.id)));
 const limit=new Date(Date.now()+3600000).toISOString();
 const due=await db.prepare("SELECT id,version FROM scheduled_lessons WHERE status='planned' AND payment_method='online' AND payment_status='awaiting' AND starts_at<=? ORDER BY starts_at LIMIT 100").bind(limit).all<{id:string;version:number}>();
 for(const lesson of due.results){
  const payments=await db.prepare("SELECT id,status,stripe_session FROM lesson_payments WHERE lesson_id=?").bind(lesson.id).all<{id:string;status:string;stripe_session:string|null}>();
  // An unresolved Stripe request may have created a live session. Keep its slot
  // until that attempt can be checked; never free it on a provider/network error.
  if(payments.results.some(p=>p.status==='pending'&&!p.stripe_session))continue;
  try{for(const p of payments.results)if(p.stripe_session)await reconcileLessonPayment(p.id);}catch{continue;}
  const notices=await noticeStatements('lesson',lesson.id,'expired',lesson.version,{},"status='expired'");await db.batch([
   db.prepare("UPDATE scheduled_lessons SET payment_status='payment_review' WHERE id=? AND status='planned' AND payment_status='awaiting' AND EXISTS(SELECT 1 FROM lesson_payments WHERE lesson_id=? AND status IN ('paid','manual_paid'))").bind(lesson.id,lesson.id),
   db.prepare("UPDATE scheduled_lessons SET status='expired' WHERE id=? AND status='planned' AND payment_method='online' AND payment_status='awaiting' AND starts_at<=? AND NOT EXISTS(SELECT 1 FROM lesson_payments WHERE lesson_id=? AND status IN ('pending','payment_review'))").bind(lesson.id,limit,lesson.id),
   db.prepare("UPDATE lesson_payments SET status='expired' WHERE lesson_id=? AND status='awaiting' AND EXISTS(SELECT 1 FROM scheduled_lessons WHERE id=? AND status='expired')").bind(lesson.id,lesson.id),
   db.prepare("DELETE FROM booking_slots WHERE id LIKE 'manual-%' AND status='scheduled' AND booking_id=? AND EXISTS(SELECT 1 FROM scheduled_lessons WHERE id=? AND status='expired')").bind(lesson.id,lesson.id),
   db.prepare("UPDATE booking_slots SET status='available',booking_id=NULL WHERE status='scheduled' AND booking_id=? AND EXISTS(SELECT 1 FROM scheduled_lessons WHERE id=? AND status='expired')").bind(lesson.id,lesson.id),...notices
  ]);
 }
 await dispatchAppointmentNotices();
}
