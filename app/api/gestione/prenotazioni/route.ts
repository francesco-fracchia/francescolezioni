import { isRequestOwner } from '@/lib/request-admin';
import { bookingDb } from '@/lib/booking/runtime';
import { reconcileBooking,reconcileExpiredBookings } from '@/lib/booking/reconcile';
import { ensureSchedule } from '@/lib/booking/schedule';
import { expireUnpaidLessons } from '@/lib/booking/lesson-payments';
import { z } from 'zod';
import {ensureDailyConsultations} from '@/lib/consultation-recurrence';
import {consultationOccupiedSql,consultationRecurrenceEnabledSql} from '@/lib/consultations';
import {ensureCalendarAvailability} from '@/lib/calendar/availability';
import {calendarBusySql} from '@/lib/calendar/busy-policy.mjs';
import {automaticSlotEnabledSql} from '@/lib/calendar/slot-policy.mjs';
import {calendarRange} from '@/lib/calendar/ical.mjs';
export async function GET(request:Request){
 if(!await isRequestOwner())return Response.json({error:'Accesso riservato a Francesco.'},{status:403});
 try{
  const db=bookingDb(),params=new URL(request.url).searchParams,from=params.get('from'),to=params.get('to');
  const range=from&&to?calendarRange(from,to):{start:new Date().toISOString(),end:new Date(Date.now()+36*86400000).toISOString()};
  await Promise.all([expireUnpaidLessons(),reconcileExpiredBookings(),ensureSchedule(),ensureDailyConsultations(db)]);
  let warning='';try{await ensureCalendarAvailability();}catch{warning='Non riesco a verificare gli impegni iCloud. Gli orari automatici restano chiusi finché la lettura non torna disponibile.';}
  const [bookings,slots,lessons,payments,freeSlots]=await Promise.all([
   db.prepare('SELECT b.id,b.version,b.cancelled_by,b.cancellation_requested_at,b.cancellation_refund_percent,b.video_url,b.student_id,b.name,b.email,b.subject,b.status,b.created_at,s.starts_at,s.ends_at,s.mode FROM bookings b JOIN booking_slots s ON s.id=b.slot_id WHERE (s.starts_at<? AND s.ends_at>?) OR b.status IN (\'cancelled\',\'expired\') ORDER BY s.starts_at DESC LIMIT 501').bind(range.end,range.start).all(),
   db.prepare(`SELECT s.id,s.starts_at,s.ends_at,s.mode,s.status,s.recurrence_id,CASE WHEN ${calendarBusySql('s')} OR EXISTS(SELECT 1 FROM consultations c WHERE c.status='confirmed' AND julianday(c.starts_at)<julianday(s.ends_at)+5.0/1440 AND julianday(c.ends_at)>julianday(s.starts_at)-5.0/1440) OR EXISTS(SELECT 1 FROM scheduled_lessons l WHERE l.status='planned' AND julianday(l.starts_at)<julianday(s.ends_at)+5.0/1440 AND julianday(l.ends_at)>julianday(s.starts_at)-5.0/1440) THEN 1 ELSE 0 END occupied FROM booking_slots s WHERE s.starts_at<? AND s.ends_at>? AND (${automaticSlotEnabledSql('s')} OR s.status NOT IN ('available','blocked')) ORDER BY s.starts_at LIMIT 1501`).bind(range.end,range.start).all(),
   db.prepare("SELECT id,series_id,student_id,group_id,version,cancelled_by,cancellation_requested_at,cancellation_refund_percent,video_url,name,email,subject,starts_at,ends_at,mode,notes,status,payment_method,payment_status,paid_at FROM scheduled_lessons WHERE (starts_at<? AND ends_at>?) OR status IN ('cancelled','expired') ORDER BY starts_at DESC LIMIT 501").bind(range.end,range.start).all(),
   db.prepare("SELECT p.id,p.lesson_id,p.name,p.email,p.amount,p.status,p.paid_at,(SELECT x.status FROM package_uses x WHERE x.payment_id=p.id AND (x.status='applied' OR (x.status='returned' AND l.status!='planned' AND p.amount=1900)) ORDER BY CASE x.status WHEN 'applied' THEN 0 ELSE 1 END,x.created_at DESC,x.id LIMIT 1) package_status FROM lesson_payments p JOIN scheduled_lessons l ON l.id=p.lesson_id WHERE (l.starts_at<? AND l.ends_at>?) OR l.status IN ('cancelled','expired') ORDER BY l.starts_at DESC LIMIT 2001").bind(range.end,range.start).all(),
   db.prepare(`SELECT s.id,s.starts_at,s.ends_at,s.mode,s.status,s.recurrence_id,CASE WHEN ${consultationOccupiedSql} THEN 1 ELSE 0 END occupied FROM consultation_slots s WHERE s.starts_at<? AND s.ends_at>? AND ${consultationRecurrenceEnabledSql} ORDER BY s.starts_at LIMIT 1501`).bind(range.end,range.start).all(),
  ]);
  const consultations=await db.prepare('SELECT id,slot_id,request_id,name,email,phone,subject,student_type,message,mode,starts_at,ends_at,status,version FROM consultations WHERE (starts_at<? AND ends_at>?) OR status=\'cancelled\' ORDER BY starts_at DESC LIMIT 501').bind(range.end,range.start).all();
  const byLesson=new Map<string,typeof payments.results>();for(const payment of payments.results){const id=String(payment.lesson_id);if(!byLesson.has(id))byLesson.set(id,[]);byLesson.get(id)!.push(payment);}
  return Response.json({consultations:consultations.results.slice(0,500),bookings:bookings.results.slice(0,500),slots:slots.results.slice(0,1500),freeSlots:freeSlots.results.slice(0,1500),lessons:lessons.results.slice(0,500).map(l=>({...l,payments:byLesson.get(String(l.id))||[]})),warning,truncated:[bookings,lessons,consultations].some(r=>r.results.length>500)||[slots,freeSlots].some(r=>r.results.length>1500)||payments.results.length>2000},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return Response.json({error:'Calendario temporaneamente non disponibile.'},{status:503});}
}
export async function PATCH(request:Request){if(!await isRequestOwner())return Response.json({error:'Accesso non consentito.'},{status:403});if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Origine non consentita.'},{status:403});try{const raw=await request.text();if(raw.length>1000)return Response.json({error:'Richiesta troppo grande.'},{status:413});const p=z.object({id:z.string().min(1).max(80),action:z.enum(['check-payment','block','unblock'])}).parse(JSON.parse(raw));if(p.action==='check-payment'){await reconcileBooking(p.id);return Response.json({ok:true});}const from=p.action==='block'?'available':'blocked';const to=p.action==='block'?'blocked':'available';const result=await bookingDb().prepare('UPDATE booking_slots SET status=? WHERE id=? AND status=? AND starts_at > ?').bind(to,p.id,from,new Date().toISOString()).run();return result.meta.changes?Response.json({ok:true}):Response.json({error:'Questo orario non può essere modificato: ricarica il calendario.'},{status:409});}catch(e){return Response.json({error:String(e).includes('LESSON_CONFLICT')?'Questo orario è occupato da un incontro gratuito. Gestisci prima l’appuntamento.':'Aggiornamento non riuscito. Riprova.'},{status:String(e).includes('LESSON_CONFLICT')?409:503});}}
