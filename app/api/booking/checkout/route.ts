import { resolveStudent } from '@/lib/students/resolve';
import { newNoticeStatement,dispatchAppointmentNotices } from '@/lib/notifications/appointments';
import { bookingDb,paymentConfig,stripe } from '@/lib/booking/runtime';
import { schoolSubjects,universitySubjects } from '@/lib/catalog';
import { z } from 'zod';
import {limitPublicRequest} from '@/lib/public-request-limit';
export async function POST(request:Request) {
 if(request.headers.get('origin')!==new URL(request.url).origin) return Response.json({error:'Origine non consentita.'},{status:403});
 const config=paymentConfig(); if(!config.ready)return Response.json({error:'I pagamenti online non sono ancora collegati.'},{status:503});
 let id:string|undefined;
 try {
 const raw=await request.text();if(raw.length>3000)return Response.json({error:'Richiesta troppo grande.'},{status:413});
 const p=z.object({slotId:z.string().min(1).max(80),name:z.string().trim().min(2).max(100),email:z.string().email().max(254),subject:z.string().refine(s=>[...schoolSubjects,...universitySubjects].includes(s)),consent:z.literal(true)}).parse(JSON.parse(raw));
 const limited=await limitPublicRequest(request,p.email);if(limited)return limited;
 id=crypto.randomUUID(); const token=crypto.randomUUID()+crypto.randomUUID(); const db=bookingDb();
 const student=await resolveStudent({name:p.name,email:p.email});const slot=await db.prepare('SELECT starts_at,ends_at,mode FROM booking_slots WHERE id=?').bind(p.slotId).first<{starts_at:string;ends_at:string;mode:string}>();if(!slot)return new Response(null,{status:409});
 const results=await db.batch([
 db.prepare("UPDATE booking_slots SET status='held', booking_id=? WHERE id=? AND status='available' AND starts_at > ?").bind(id,p.slotId,new Date(Date.now()+86400000).toISOString()),
 db.prepare("INSERT INTO bookings (id,slot_id,access_token,name,email,subject,student_id,status,created_at) SELECT ?,?,?,?,?,?,?,'pending',? WHERE EXISTS (SELECT 1 FROM booking_slots WHERE id=? AND booking_id=?)").bind(id,p.slotId,token,p.name,p.email,p.subject,student.id,new Date().toISOString(),p.slotId,id),newNoticeStatement('booking',id,'reserved',0,{id,subject:p.subject,...slot,payment_method:'online',payment_status:'awaiting'},{name:p.name,email:p.email,studentId:student.id,notifications:student.notifications,amount:2000,paymentLink:`${config.origin}/prenota?booking=${id}#${token}`},"status='pending'")]);
 if(!results[0].meta.changes)return Response.json({error:'Questo orario è già stato scelto. Selezionane un altro.'},{status:409});
 const body=new URLSearchParams({mode:'payment',locale:'it','payment_method_types[0]':'card','line_items[0][price_data][currency]':'eur','line_items[0][price_data][unit_amount]':'2000','line_items[0][price_data][product_data][name]':'Lezione individuale · 55 minuti','line_items[0][quantity]':'1',customer_email:p.email,'metadata[booking_id]':id,success_url:`${config.origin}/prenota?booking=${id}#${token}`,cancel_url:`${config.origin}/prenota?booking=${id}#${token}`,expires_at:String(Math.floor(Date.now()/1000)+1800)});
 const session=await stripe('checkout/sessions',body,id);
 if(session.livemode !== !!config.live || !session.url?.startsWith('https://checkout.stripe.com/'))throw new Error('Unexpected checkout');
 await db.prepare('UPDATE bookings SET stripe_session=? WHERE id=?').bind(session.id,id).run();
 await dispatchAppointmentNotices();return Response.json({url:session.url,returnUrl:`${config.origin}/prenota?booking=${id}#${token}`});
 }catch(e) {
 if(String(e).includes('LESSON_CONFLICT'))return Response.json({error:'Questo orario è occupato da un altro appuntamento. Scegline un altro.'},{status:409});
 // A network timeout may still have created a Checkout Session: retain the slot
 // until a signed expiration or completion event resolves it. Never release blindly.
 return Response.json({error:'Non siamo riusciti ad aprire il pagamento. Riprova più tardi o contatta Francesco.'},{status:503});
 }
}
