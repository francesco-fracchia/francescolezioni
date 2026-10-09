import { isRequestOwner } from '@/lib/request-admin';
import { bookingDb,stripe } from '@/lib/booking/runtime';
import { reconcileLessonPayment } from '@/lib/booking/lesson-checkout';
import { reconcileBooking } from '@/lib/booking/reconcile';
import { noticeStatements,dispatchAppointmentNotices } from '@/lib/notifications/appointments';
import { romeDateTime } from '@/lib/lesson-plan';
import { z } from 'zod';
type Row={id:string;version:number;status:string;starts_at:string;ends_at:string;mode:string;notes?:string;payment_status?:string;payment_method?:string;slot_id?:string;stripe_session?:string};
export async function POST(request:Request){
 if(!await isRequestOwner())return new Response(null,{status:403});
 if(request.headers.get('origin')!==new URL(request.url).origin)return new Response(null,{status:403});
 try{
  const raw=await request.text();if(raw.length>3000)return new Response(null,{status:413});
  const p=z.object({id:z.string().uuid(),entity:z.enum(['lesson','booking']),version:z.number().int().min(0),action:z.enum(['modify','cancel']),date:z.string().optional(),time:z.string().optional(),mode:z.enum(['Online','Lodi']).optional(),notes:z.string().max(2000).optional()}).parse(JSON.parse(raw));
  const db=bookingDb();const query=p.entity==='lesson'?'SELECT * FROM scheduled_lessons WHERE id=?':'SELECT b.*,s.starts_at,s.ends_at,s.mode FROM bookings b JOIN booking_slots s ON s.id=b.slot_id WHERE b.id=?';
  let old=await db.prepare(query).bind(p.id).first<Row>();if(!old||old.version!==p.version||!['planned','confirmed','pending','awaiting_payment','payment_review'].includes(old.status))return Response.json({error:'L’appuntamento è cambiato. Ricarica il calendario.'},{status:409});
  if(Date.parse(old.starts_at)<=Date.now())return Response.json({error:'Gli appuntamenti già iniziati restano nello storico.'},{status:409});
  const start=p.action==='modify'?romeDateTime(p.date||'',p.time||''):old.starts_at;const end=new Date(Date.parse(start)+55*60000).toISOString();const mode=p.mode||old.mode;
  if(p.action==='modify'&&(Date.parse(start)<=Date.now()||Date.parse(start)>Date.now()+366*86400000))return Response.json({error:'Scegli una data futura entro un anno.'},{status:400});
  // Stop open Checkouts before changing their appointment or releasing its slot.
  if(p.entity==='lesson'){
   const payments=await db.prepare('SELECT id,status,stripe_session FROM lesson_payments WHERE lesson_id=?').bind(p.id).all<{id:string;status:string;stripe_session:string|null}>();
   for(const pay of payments.results){if(pay.status==='pending'&&!pay.stripe_session)throw Error('PAYMENT_UNRESOLVED');if(pay.stripe_session&&['pending','awaiting'].includes(pay.status)){const session=await stripe(`checkout/sessions/${encodeURIComponent(pay.stripe_session)}`) as unknown as {status:string};if(session.status==='open')await stripe(`checkout/sessions/${encodeURIComponent(pay.stripe_session)}/expire`,new URLSearchParams());await reconcileLessonPayment(pay.id);}}

  }else if(['pending','awaiting_payment'].includes(old.status)){
   if(!old.stripe_session)throw Error('PAYMENT_UNRESOLVED');const session=await stripe(`checkout/sessions/${encodeURIComponent(old.stripe_session)}`) as unknown as {status:string};if(session.status==='open')await stripe(`checkout/sessions/${encodeURIComponent(old.stripe_session)}/expire`,new URLSearchParams());await reconcileBooking(p.id);
  }
  old=await db.prepare(query).bind(p.id).first<Row>();if(!old||old.version!==p.version||!['planned','confirmed','pending','awaiting_payment','payment_review'].includes(old.status))return Response.json({error:'Verifica prima lo stato del pagamento e ricarica.'},{status:409});
  if(p.action==='modify'&&((p.entity==='lesson'&&old.payment_method==='online'&&old.payment_status!=='paid')||(p.entity==='booking'&&old.status!=='confirmed'))&&Date.parse(start)<=Date.now()+3600000)return Response.json({error:'Per un appuntamento non saldato scegli un orario con almeno un’ora di anticipo.'},{status:400});
  const version=p.version+1;const operationId=crypto.randomUUID();const mine="id=? AND version=? AND operation_id=?";
  const guard=(p.action==='cancel'?"status='cancelled'":p.entity==='lesson'?"status='planned'":"status IN ('confirmed','pending','awaiting_payment','payment_review')")+" AND operation_id='"+operationId+"'";
  const notices=await noticeStatements(p.entity,p.id,p.action==='cancel'?'cancelled':'modified',version,{starts_at:start,ends_at:end,mode,previous_start:old.starts_at,payment_method:p.entity==='booking'?'online':old.payment_method,payment_status:p.entity==='booking'&&old.status==='confirmed'?'paid':old.payment_status},guard);
  let change;
  if(p.entity==='lesson')change=p.action==='cancel'?db.prepare("UPDATE scheduled_lessons SET status='cancelled',version=version+1,operation_id=? WHERE id=? AND version=? AND status='planned'").bind(operationId,p.id,p.version):db.prepare("UPDATE scheduled_lessons SET starts_at=?,ends_at=?,mode=?,notes=?,video_url=CASE WHEN ?='Online' THEN video_url ELSE NULL END,version=version+1,operation_id=? WHERE id=? AND version=? AND status='planned'").bind(start,end,mode,p.notes??old.notes??'',mode,operationId,p.id,p.version);
  else change=p.action==='cancel'?db.prepare("UPDATE bookings SET status='cancelled',version=version+1,operation_id=? WHERE id=? AND version=? AND status IN ('confirmed','pending','awaiting_payment','payment_review')").bind(operationId,p.id,p.version):db.prepare("UPDATE bookings SET version=version+1,operation_id=?,video_url=CASE WHEN ?='Online' THEN video_url ELSE NULL END WHERE id=? AND version=? AND status IN ('confirmed','pending','awaiting_payment','payment_review')").bind(operationId,mode,p.id,p.version);
  const statements=[change];
  if(p.entity==='lesson'){
   statements.push(db.prepare(`DELETE FROM booking_slots WHERE id LIKE 'manual-%' AND booking_id=? AND EXISTS(SELECT 1 FROM scheduled_lessons WHERE ${mine})`).bind(p.id,p.id,version,operationId),db.prepare(`UPDATE booking_slots SET status='available',booking_id=NULL WHERE booking_id=? AND status='scheduled' AND EXISTS(SELECT 1 FROM scheduled_lessons WHERE ${mine})`).bind(p.id,p.id,version,operationId));
   if(p.action==='modify')statements.push(db.prepare(`UPDATE booking_slots SET status='scheduled',booking_id=? WHERE status='available' AND julianday(starts_at)<julianday(?)+5.0/1440 AND julianday(ends_at)>julianday(?)-5.0/1440 AND EXISTS(SELECT 1 FROM scheduled_lessons WHERE ${mine})`).bind(p.id,end,start,p.id,version,operationId),db.prepare(`INSERT INTO booking_slots(id,starts_at,ends_at,mode,status,booking_id) SELECT ?,?,?,?,'scheduled',? WHERE EXISTS(SELECT 1 FROM scheduled_lessons WHERE ${mine}) AND NOT EXISTS(SELECT 1 FROM booking_slots WHERE starts_at=? AND booking_id=?)`).bind('manual-'+p.id,start,end,mode,p.id,p.id,version,operationId,start,p.id));
  }else if(p.action==='cancel')statements.push(db.prepare(`UPDATE booking_slots SET status='available',booking_id=NULL WHERE id=? AND booking_id=? AND EXISTS(SELECT 1 FROM bookings WHERE ${mine} AND status='cancelled')`).bind(old.slot_id!,p.id,p.id,version,operationId));
  else statements.push(db.prepare(`UPDATE booking_slots SET starts_at=?,ends_at=?,mode=? WHERE id=? AND booking_id=? AND EXISTS(SELECT 1 FROM bookings WHERE ${mine})`).bind(start,end,mode,old.slot_id!,p.id,p.id,version,operationId));
  const result=await db.batch([...statements,...notices]);if(!result[0].meta.changes)return Response.json({error:'L’appuntamento è cambiato. Ricarica.'},{status:409});
  const notifications=await dispatchAppointmentNotices();return Response.json({ok:true,notifications,refundReview:p.action==='cancel'&&(old.payment_status==='paid'||old.status==='confirmed'||old.payment_status==='payment_review')});
 }catch(e){const msg=String(e);return Response.json({error:msg.includes('LESSON_CONFLICT')?'Questo orario si sovrappone a un appuntamento o a un blocco. Nessuna modifica salvata.':msg.includes('PAYMENT_UNRESOLVED')?'Un pagamento è ancora in verifica. Il posto resta occupato: riprova dopo il controllo Stripe.':'Non siamo riusciti a modificare l’appuntamento. Riprova.'},{status:msg.includes('LESSON_CONFLICT')?409:503});}
}
