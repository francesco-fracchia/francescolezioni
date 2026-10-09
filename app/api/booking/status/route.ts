import { paymentDeadline } from '@/lib/booking/payment-policy';
import { bookingDb,paymentConfig } from '@/lib/booking/runtime';
import { reconcileBooking } from '@/lib/booking/reconcile';
export async function GET(request:Request) {
 const url=new URL(request.url);const id=url.searchParams.get('id');const token=request.headers.get('Authorization')?.replace(/^Bearer /,'');
 if(!id||!token)return Response.json({error:'Accesso non consentito.'},{status:401});
 try {
 const db=bookingDb();
 const booking=await db.prepare('SELECT status,stripe_session FROM bookings WHERE id=? AND access_token=?').bind(id,token).first<{status:string;stripe_session:string|null}>();
 if(booking) await reconcileBooking(id);
 const row=await bookingDb().prepare('SELECT b.status,s.starts_at,s.ends_at,s.mode FROM bookings b JOIN booking_slots s ON s.id=b.slot_id WHERE b.id=? AND b.access_token=?').bind(id,token).first();
 return row?Response.json({...row,testMode:!paymentConfig().live,payment_deadline:paymentDeadline(String(row.starts_at))},{headers:{'Cache-Control':'no-store'}}):Response.json({error:'Prenotazione non trovata.'},{status:404});
 }catch{return Response.json({error:'Stato temporaneamente non disponibile.'},{status:503});}
}
