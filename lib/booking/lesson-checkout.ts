import { noticeStatements,dispatchAppointmentNotices } from '@/lib/notifications/appointments';
import { bookingDb,paymentConfig,stripe } from './runtime';
import { deadlinePassed,paymentDeadline } from './payment-policy';
export type LessonPayment={id:string;lesson_id:string;access_token:string;name:string;email:string;amount:number;status:string;stripe_session:string|null;attempt_key:string|null;checkout_expires_at:number|null;starts_at:string;ends_at:string;mode:string;subject:string;lesson_status:string;payment_method:string;payment_status:string};
export async function readLessonPayment(id:string,token:string){return bookingDb().prepare(`SELECT p.*,l.starts_at,l.ends_at,l.mode,l.subject,l.status AS lesson_status,l.payment_method,l.payment_status FROM lesson_payments p JOIN scheduled_lessons l ON l.id=p.lesson_id WHERE p.id=? AND p.access_token=?`).bind(id,token).first<LessonPayment>();}
export async function settleLesson(lessonId:string){
 const db=bookingDb();for(let attempt=0;attempt<2;attempt++){
  const row=await db.prepare('SELECT version,status FROM scheduled_lessons WHERE id=?').bind(lessonId).first<{version:number;status:string}>();if(!row||row.status!=='planned')return;
  const notices=await noticeStatements('lesson',lessonId,'confirmed',row.version,{payment_status:'paid'},"status='planned' AND payment_status='paid'");
  const result=await db.batch([db.prepare(`UPDATE scheduled_lessons SET payment_status='paid',paid_at=? WHERE id=? AND version=? AND status='planned' AND EXISTS(SELECT 1 FROM lesson_payments WHERE lesson_id=?) AND NOT EXISTS(SELECT 1 FROM lesson_payments WHERE lesson_id=? AND status NOT IN ('paid','manual_paid'))`).bind(new Date().toISOString(),lessonId,row.version,lessonId,lessonId),...notices]);
  if(result[0].meta.changes){await dispatchAppointmentNotices();return;}
 }
}
export async function reconcileLessonPayment(id:string){
 const db=bookingDb();const p=await db.prepare(`SELECT p.*,l.starts_at,l.status AS lesson_status,l.payment_method FROM lesson_payments p JOIN scheduled_lessons l ON l.id=p.lesson_id WHERE p.id=?`).bind(id).first<LessonPayment>();
 if(!p||!p.stripe_session||!['awaiting','pending'].includes(p.status))return;
 const s=await stripe(`checkout/sessions/${encodeURIComponent(p.stripe_session)}?expand%5B%5D=payment_intent.latest_charge`) as unknown as {id:string;livemode:boolean;status:string;payment_status:string;amount_total:number;currency:string;metadata:{lesson_payment_id:string};payment_intent?:{latest_charge?:{created:number}}};
 if(s.livemode!==!!paymentConfig().live||s.metadata.lesson_payment_id!==id||s.amount_total!==p.amount||s.currency!=='eur')throw Error('CHECKOUT_MISMATCH');
 if(s.payment_status==='paid'){
  const timestamp=s.payment_intent?.latest_charge?.created;
  const review=!timestamp||timestamp*1000>Date.parse(paymentDeadline(p.starts_at))||p.lesson_status!=='planned';
  const next=review?'payment_review':'paid';
  await db.batch([db.prepare("UPDATE lesson_payments SET status=?,paid_at=? WHERE id=? AND stripe_session=? AND status IN ('awaiting','pending')").bind(next,timestamp?new Date(timestamp*1000).toISOString():null,id,s.id),db.prepare("UPDATE scheduled_lessons SET payment_status='payment_review' WHERE id=? AND status='planned' AND EXISTS(SELECT 1 FROM lesson_payments WHERE lesson_id=? AND status='payment_review')").bind(p.lesson_id,p.lesson_id)]);
  if(!review)await settleLesson(p.lesson_id);
 }else if(deadlinePassed(p.starts_at)||p.lesson_status!=='planned'||p.payment_method!=='online'){
  if(s.status==='open')await stripe(`checkout/sessions/${encodeURIComponent(s.id)}/expire`,new URLSearchParams());
  await db.prepare("UPDATE lesson_payments SET status='expired' WHERE id=? AND stripe_session=? AND status IN ('awaiting','pending')").bind(id,s.id).run();
 }else if(s.status==='expired')await db.prepare("UPDATE lesson_payments SET status='awaiting' WHERE id=? AND stripe_session=? AND status='pending'").bind(id,s.id).run();
}
export async function openLessonCheckout(id:string,token:string){
 if(!paymentConfig().ready)throw Error('UNAVAILABLE');
 await reconcileLessonPayment(id);
 let p=await readLessonPayment(id,token);
 if(!p||p.lesson_status!=='planned'||p.payment_method!=='online'||p.payment_status==='paid'||p.payment_status==='payment_review'||!['awaiting','pending'].includes(p.status)||deadlinePassed(p.starts_at))throw Error('CLOSED');
 if(p.stripe_session){const previous=await stripe(`checkout/sessions/${encodeURIComponent(p.stripe_session)}`) as unknown as {status:string;url:string;payment_status:string};if(previous.status==='open'&&previous.payment_status!=='paid'){if(!previous.url?.startsWith('https://checkout.stripe.com/'))throw Error('UNAVAILABLE');return previous.url;}if(previous.payment_status==='paid')throw Error('CLOSED');}
 const config=paymentConfig();const returnUrl=`${config.origin}/pagamento?saldo=${id}#${token}`;
 const db=bookingDb();
 if(p.status==='awaiting'){
  const key=crypto.randomUUID();const expires=Math.floor(Date.now()/60000)*60+1860;
  await db.prepare("UPDATE lesson_payments SET status='pending',stripe_session=NULL,attempt_key=?,checkout_expires_at=? WHERE id=? AND status='awaiting' AND EXISTS(SELECT 1 FROM scheduled_lessons WHERE id=? AND status='planned' AND payment_method='online' AND payment_status='awaiting' AND starts_at>?)").bind(key,expires,id,p.lesson_id,new Date(Date.now()+3600000).toISOString()).run();
  p=await readLessonPayment(id,token);if(!p||p.status!=='pending')throw Error('CLOSED');
 }
 if(!p.attempt_key||!p.checkout_expires_at)throw Error('UNAVAILABLE');
 const body=new URLSearchParams({mode:'payment',locale:'it','payment_method_types[0]':'card','line_items[0][price_data][currency]':'eur','line_items[0][price_data][unit_amount]':String(p.amount),'line_items[0][price_data][product_data][name]':`${p.subject} · 55 minuti${p.amount===1500?' · quota personale':''}`,'line_items[0][quantity]':'1',customer_email:p.email,'metadata[lesson_payment_id]':id,'metadata[attempt_key]':p.attempt_key,success_url:returnUrl,cancel_url:returnUrl,expires_at:String(p.checkout_expires_at)});
 // The persisted attempt keeps retries identical even if Stripe times out.
 const session=await stripe('checkout/sessions',body,p.attempt_key);
 if(session.livemode!==!!paymentConfig().live||!session.url?.startsWith('https://checkout.stripe.com/'))throw Error('UNAVAILABLE');
 await bookingDb().prepare("UPDATE lesson_payments SET stripe_session=? WHERE id=? AND status='pending' AND attempt_key=?").bind(session.id,id,p.attempt_key).run();
 return session.url;
}
