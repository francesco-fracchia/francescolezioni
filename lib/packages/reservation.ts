import {bookingDb,paymentConfig} from '@/lib/booking/runtime';
import {LearningError} from '@/lib/learning/access';
export const availableLessonSlotsSql=`SELECT s.id,s.starts_at,s.ends_at,s.mode FROM booking_slots s WHERE s.status='available' AND s.starts_at>? AND NOT EXISTS(SELECT 1 FROM consultations c WHERE c.status='confirmed' AND julianday(c.starts_at)<julianday(s.ends_at)+5.0/1440 AND julianday(c.ends_at)>julianday(s.starts_at)-5.0/1440) AND NOT EXISTS(SELECT 1 FROM scheduled_lessons l WHERE l.status='planned' AND julianday(l.starts_at)<julianday(s.ends_at)+5.0/1440 AND julianday(l.ends_at)>julianday(s.starts_at)-5.0/1440) ORDER BY s.starts_at LIMIT 200`;
export async function reservePurchasedLesson(p:{id:string;studentId:string;packageId:string;slotId:string;subject:string}){
 const db=bookingDb(),now=new Date().toISOString();
 const old=await db.prepare('SELECT id,subject,starts_at,status FROM scheduled_lessons WHERE id=? AND student_id=? AND series_id=?').bind(p.id,p.studentId,p.packageId).first<{id:string;subject:string;starts_at:string;status:string}>();
 if(old)return {lesson:old,repeated:true};
 const paymentId=crypto.randomUUID();
 const result=await db.batch([
  db.prepare(`INSERT INTO scheduled_lessons(id,series_id,name,email,subject,starts_at,ends_at,mode,notes,payment_method,payment_status,student_id,status,created_at) SELECT ?,?,u.name,u.email,?,s.starts_at,s.ends_at,s.mode,'Prenotata con lezioni acquistate online',k.payment_method,'awaiting',u.id,'planned',? FROM booking_slots s JOIN lesson_packages k ON k.id=? JOIN students u ON u.id=k.student_id WHERE s.id=? AND s.status='available' AND s.starts_at>? AND u.id=? AND u.status='active' AND k.status='active' AND (k.payment_method!='online' OR k.live_mode=?) AND k.units>(SELECT COUNT(*) FROM package_uses x WHERE x.package_id=k.id AND x.status='applied')`).bind(p.id,p.packageId,p.subject,now,p.packageId,p.slotId,new Date(Date.now()+86400000).toISOString(),p.studentId,paymentConfig().live?1:0),
  db.prepare("INSERT INTO lesson_payments(id,lesson_id,access_token,student_id,name,email,amount,status,created_at) SELECT ?,id,?,student_id,name,email,2000,'awaiting',? FROM scheduled_lessons WHERE id=? AND student_id=? AND series_id=?").bind(paymentId,crypto.randomUUID()+crypto.randomUUID(),now,p.id,p.studentId,p.packageId),
  db.prepare("INSERT INTO package_uses(id,package_id,payment_id,created_at) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM lesson_payments WHERE id=? AND lesson_id=?)").bind(crypto.randomUUID(),p.packageId,paymentId,now,paymentId,p.id),
  db.prepare("UPDATE booking_slots SET status='scheduled',booking_id=? WHERE status='available' AND EXISTS(SELECT 1 FROM scheduled_lessons l WHERE l.id=? AND julianday(booking_slots.starts_at)<julianday(l.ends_at)+5.0/1440 AND julianday(booking_slots.ends_at)>julianday(l.starts_at)-5.0/1440)").bind(p.id,p.id),
 ]);
 if(!result[0].meta.changes)throw new LearningError('Orario già occupato o lezioni esaurite. Aggiorna il calendario.',409);
 const lesson=await db.prepare('SELECT id,subject,starts_at,status FROM scheduled_lessons WHERE id=?').bind(p.id).first();
 return {lesson,repeated:false};
}
