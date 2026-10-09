import { bookingDb,paymentConfig } from '@/lib/booking/runtime';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { env } from '@/lib/runtime-env';
import { ensureSchedule } from '@/lib/booking/schedule';
import { expireUnpaidLessons } from '@/lib/booking/lesson-payments';
import { z } from 'zod';
import { reconcileExpiredBookings } from '@/lib/booking/reconcile';
export async function GET() { try {
 await expireUnpaidLessons();
 await reconcileExpiredBookings();
 await ensureSchedule();
 const slots=await bookingDb().prepare("SELECT id, starts_at, ends_at, mode FROM booking_slots WHERE status='available' AND starts_at > ? AND NOT EXISTS(SELECT 1 FROM consultations c WHERE c.status='confirmed' AND julianday(c.starts_at)<julianday(booking_slots.ends_at)+5.0/1440 AND julianday(c.ends_at)>julianday(booking_slots.starts_at)-5.0/1440) ORDER BY starts_at LIMIT 100").bind(new Date(Date.now()+86400000).toISOString()).all();
 return Response.json({slots:slots.results,paymentsReady:paymentConfig().ready,testMode:!paymentConfig().live},{headers:{'Cache-Control':'no-store'}});
 } catch { return Response.json({error:'Calendario temporaneamente non disponibile.'},{status:503}); } }
export async function POST(request:Request) {
 const user=await getChatGPTUser();
 if(!env.BOOKING_OWNER_USER_ID || user?.userId!==env.BOOKING_OWNER_USER_ID) return Response.json({error:'Accesso non consentito.'},{status:403});
 if(request.headers.get('origin')!==new URL(request.url).origin) return Response.json({error:'Origine non consentita.'},{status:403});
 try {
 const raw=await request.text();if(raw.length>2000)return Response.json({error:'Richiesta troppo grande.'},{status:413});
 const p=z.object({startsAt:z.string().datetime(),mode:z.enum(['Online','Lodi'])}).parse(JSON.parse(raw));
 const start=Date.parse(p.startsAt); if(start<Date.now()+86400000) return Response.json({error:'Scegli un orario con almeno 24 ore di anticipo.'},{status:400});
 const end=new Date(start+55*60000).toISOString(); const id=crypto.randomUUID();
 const result=await bookingDb().prepare("INSERT INTO booking_slots (id,starts_at,ends_at,mode,status) SELECT ?,?,?,?,'available' WHERE NOT EXISTS (SELECT 1 FROM booking_slots WHERE starts_at < ? AND ends_at > ?)").bind(id,p.startsAt,end,p.mode,new Date(start+60*60000).toISOString(),new Date(start-5*60000).toISOString()).run();
 return result.meta.changes?Response.json({id},{status:201}):Response.json({error:'Orario sovrapposto a una lezione esistente.'},{status:409});
 } catch {return Response.json({error:'Impossibile aggiungere questo orario.'},{status:400});}
}
