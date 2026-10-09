import { isRequestOwner } from '@/lib/request-admin';
import { bookingDb } from '@/lib/booking/runtime';
import { reconcileLessonPayment,settleLesson } from '@/lib/booking/lesson-checkout';
import { expireUnpaidLessons } from '@/lib/booking/lesson-payments';
import { z } from 'zod';
export async function POST(request:Request){
 if(!await isRequestOwner())return new Response(null,{status:403});
 if(request.headers.get('origin')!==new URL(request.url).origin)return new Response(null,{status:403});
 try{
  const raw=await request.text();if(raw.length>300)return new Response(null,{status:413});
  const {lessonId,paymentId,action}=z.object({lessonId:z.string().uuid(),paymentId:z.string().uuid().optional(),action:z.enum(['check','manual','approve-review','allow-pos']).default('check')}).parse(JSON.parse(raw));
  const db=bookingDb();
  if(action==='allow-pos'){
   const lesson=await db.prepare("SELECT id FROM scheduled_lessons WHERE id=? AND status='planned' AND payment_status='payment_review'").bind(lessonId).first();if(!lesson)return new Response(null,{status:409});
   const rows=await db.prepare('SELECT id,status,stripe_session FROM lesson_payments WHERE lesson_id=?').bind(lessonId).all<{id:string;status:string;stripe_session:string|null}>();
   if(rows.results.some(p=>p.status==='pending'&&!p.stripe_session))return Response.json({error:'Un pagamento è ancora in verifica.'},{status:409});
   for(const p of rows.results)if(p.stripe_session)await reconcileLessonPayment(p.id);
   await db.batch([
    db.prepare("UPDATE scheduled_lessons SET payment_method='pos' WHERE id=? AND status='planned' AND payment_status='payment_review' AND NOT EXISTS(SELECT 1 FROM lesson_payments WHERE lesson_id=? AND status='pending')").bind(lessonId,lessonId),
    db.prepare("UPDATE lesson_payments SET status='awaiting',stripe_session=NULL,attempt_key=NULL,checkout_expires_at=NULL WHERE lesson_id=? AND status='expired' AND EXISTS(SELECT 1 FROM scheduled_lessons WHERE id=? AND payment_method='pos')").bind(lessonId,lessonId)
   ]);return Response.json({ok:true});
  }
  if(paymentId){
   const review=action==='approve-review';const now=new Date().toISOString();
   const result=review?
    await db.prepare("UPDATE lesson_payments SET status='paid' WHERE id=? AND lesson_id=? AND status='payment_review' AND paid_at IS NOT NULL AND EXISTS(SELECT 1 FROM scheduled_lessons WHERE id=? AND status='planned')").bind(paymentId,lessonId,lessonId).run():
    await db.prepare("UPDATE lesson_payments SET status='manual_paid',paid_at=? WHERE id=? AND lesson_id=? AND status='awaiting' AND stripe_session IS NULL AND EXISTS(SELECT 1 FROM scheduled_lessons WHERE id=? AND status='planned' AND payment_method IN ('pos','cash'))").bind(now,paymentId,lessonId,lessonId).run();
   if(!result.meta.changes)return Response.json({error:'Il saldo non può essere registrato: verifica stato e metodo.'},{status:409});
   await settleLesson(lessonId);return Response.json({ok:true});
  }
  const rows=await db.prepare('SELECT id FROM lesson_payments WHERE lesson_id=?').bind(lessonId).all<{id:string}>();
  for(const p of rows.results)await reconcileLessonPayment(p.id);
  await expireUnpaidLessons();return Response.json({ok:true});
 }catch{return Response.json({error:'Non siamo riusciti a verificare il saldo. Il posto resta riservato.'},{status:503});}
}
