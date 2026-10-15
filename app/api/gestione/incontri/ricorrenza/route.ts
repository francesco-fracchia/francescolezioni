import {z} from 'zod';
import {isRequestOwner} from '@/lib/request-admin';
import {bookingDb} from '@/lib/booking/runtime';
import {consultationWindow} from '@/lib/consultations';
import {dailyConsultationRule,ensureDailyConsultations,ensureAutomaticSlots} from '@/lib/consultation-recurrence';
const headers={'Cache-Control':'private, no-store'};
const schema=z.object({startDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),from:z.string().regex(/^\d{2}:\d{2}$/),to:z.string().regex(/^\d{2}:\d{2}$/),mode:z.enum(['Online','Lodi','Entrambe']),version:z.number().int().min(0).optional(),weekDays:z.array(z.number().int().min(0).max(6)).min(1).max(7).optional(),lessonsEnabled:z.boolean().optional(),consultationsEnabled:z.boolean().optional()});
export async function GET(){if(!await isRequestOwner())return new Response(null,{status:403});try{return Response.json({rule:await dailyConsultationRule(bookingDb())},{headers});}catch{return Response.json({error:'Disponibilità automatica non disponibile.'},{status:503,headers});}}
export async function POST(request:Request){
 if(!await isRequestOwner()||request.headers.get('origin')!==new URL(request.url).origin)return new Response(null,{status:403});
 try{
  const raw=await request.text();if(raw.length>1600)return new Response(null,{status:413});
  const p=schema.parse(JSON.parse(raw)),db=bookingDb(),existing=await dailyConsultationRule(db);
  consultationWindow(p.startDate,p.from,p.to,Date.parse(p.startDate+'T12:00:00Z')-2*86400000);
  const weekDays=JSON.stringify([...new Set(p.weekDays??(existing?JSON.parse(existing.week_days):[0,1,2,3,4,5,6]))].sort()),lessons=Number(p.lessonsEnabled??!!(existing?.lessons_enabled??1)),free=Number(p.consultationsEnabled??!!(existing?.consultations_enabled??1));
  const same=existing&&existing.start_date===p.startDate&&existing.from_time===p.from&&existing.to_time===p.to&&existing.mode===p.mode&&existing.week_days===weekDays&&existing.lessons_enabled===lessons&&existing.consultations_enabled===free;
  if(existing&&!same&&p.version!==existing.version)return Response.json({error:'La disponibilità è cambiata. Ricarica le impostazioni.'},{status:409,headers});
  const now=new Date().toISOString();
  if(!existing)await db.prepare("INSERT INTO consultation_recurrence(id,start_date,from_time,to_time,mode,week_days,lessons_enabled,consultations_enabled,created_at,updated_at) VALUES('daily',?,?,?,?,?,?,?,?,?) ON CONFLICT DO NOTHING").bind(p.startDate,p.from,p.to,p.mode,weekDays,lessons,free,now,now).run();
  else if(!same){const r=await db.prepare("UPDATE consultation_recurrence SET start_date=?,from_time=?,to_time=?,mode=?,week_days=?,lessons_enabled=?,consultations_enabled=?,version=version+1,generated_until=NULL,paid_generated_until=NULL,updated_at=? WHERE id='daily' AND version=?").bind(p.startDate,p.from,p.to,p.mode,weekDays,lessons,free,now,p.version!).run();if(!r.meta.changes)return Response.json({error:'Le impostazioni sono cambiate. Ricarica.'},{status:409,headers});}
  await Promise.all([ensureDailyConsultations(db),ensureAutomaticSlots(db,'paid')]);
  return Response.json({ok:true,rule:await dailyConsultationRule(db)},{headers});
 }catch{return Response.json({error:'Controlla data, giorni e fascia oraria: almeno 20 minuti, massimo 12 ore. Se la conferma non arriva, riprova gli stessi dati.'},{status:400,headers});}
}
export async function PATCH(request:Request){
 if(!await isRequestOwner()||request.headers.get('origin')!==new URL(request.url).origin)return new Response(null,{status:403});
 try{
  const raw=await request.text();if(raw.length>300)return new Response(null,{status:413});
  const p=z.object({active:z.boolean(),version:z.number().int().min(0)}).parse(JSON.parse(raw)),db=bookingDb();
  const r=await db.prepare("UPDATE consultation_recurrence SET active=?,version=version+1,generated_until=NULL,paid_generated_until=NULL,updated_at=? WHERE id='daily' AND version=?").bind(Number(p.active),new Date().toISOString(),p.version).run();
  if(!r.meta.changes){const current=await dailyConsultationRule(db);if(current?.version!==p.version+1||current.active!==Number(p.active))return Response.json({error:'La disponibilità è cambiata. Ricarica il calendario.'},{status:409,headers});}
  await Promise.all([ensureDailyConsultations(db),ensureAutomaticSlots(db,'paid')]);return Response.json({ok:true,rule:await dailyConsultationRule(db)},{headers});
 }catch{return Response.json({error:'Disponibilità non aggiornata. Riprova.'},{status:503,headers});}
}
