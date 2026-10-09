import { reconcilePurchase } from '@/lib/packages/checkout';
import { reconcileLessonPayment } from '@/lib/booking/lesson-checkout';
import { reconcileBooking } from '@/lib/booking/reconcile';
import { bookingDb,paymentConfig } from '@/lib/booking/runtime';
import { validStripeSignature } from '@/lib/booking/signature';
export async function POST(request:Request) {
 const secret=paymentConfig().webhook; if(!secret)return Response.json({error:'Webhook non configurato.'},{status:503});
 const raw=await request.text();if(raw.length>100000)return new Response(null,{status:413});
 if(!await validStripeSignature(raw,request.headers.get('stripe-signature')||'',secret))return new Response(null,{status:400});
 try {
 const event=JSON.parse(raw);const session=event.data?.object;const id=session?.metadata?.booking_id;
 if(event.livemode!==!!paymentConfig().live)return Response.json({received:true});
 const packageId=session?.metadata?.package_id;
 if(packageId&&['checkout.session.completed','checkout.session.expired'].includes(event.type)){
 const db=bookingDb();await db.prepare("UPDATE lesson_packages SET stripe_session=? WHERE id=? AND payment_method='online' AND status='awaiting' AND stripe_session IS NULL AND checkout_expires_at=?").bind(session.id,packageId,session.expires_at).run();
 const p=await db.prepare('SELECT stripe_session FROM lesson_packages WHERE id=?').bind(packageId).first<{stripe_session:string}>();if(p?.stripe_session===session.id)await reconcilePurchase(packageId);return Response.json({received:true});
 }
 const lessonPaymentId=session?.metadata?.lesson_payment_id;
 if(lessonPaymentId&&['checkout.session.completed','checkout.session.expired'].includes(event.type)){
 const db=bookingDb();await db.prepare("UPDATE lesson_payments SET stripe_session=? WHERE id=? AND attempt_key=? AND stripe_session IS NULL AND status='pending'").bind(session.id,lessonPaymentId,session.metadata.attempt_key||'').run();
 const p=await db.prepare('SELECT stripe_session FROM lesson_payments WHERE id=?').bind(lessonPaymentId).first<{stripe_session:string}>();if(p?.stripe_session===session.id)await reconcileLessonPayment(lessonPaymentId);return Response.json({received:true});
 }
 if(!id)return Response.json({received:true});
 const db=bookingDb();
 if(['checkout.session.completed','checkout.session.expired'].includes(event.type)&&session.amount_total===2000&&session.currency==='eur'){
 await db.prepare("UPDATE bookings SET stripe_session=? WHERE id=? AND stripe_session IS NULL AND status IN ('pending','awaiting_payment')").bind(session.id,id).run();
 const current=await db.prepare('SELECT stripe_session FROM bookings WHERE id=?').bind(id).first<{stripe_session:string}>();if(current?.stripe_session===session.id)await reconcileBooking(id);
 }

 return Response.json({received:true});
 }catch{return new Response(null,{status:503});}
}
