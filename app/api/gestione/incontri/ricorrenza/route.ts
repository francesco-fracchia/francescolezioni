import {z} from 'zod';
import { isRequestOwner } from '@/lib/request-admin';
import { bookingDb } from '@/lib/booking/runtime';
import {consultationWindow} from '@/lib/consultations';
import {dailyConsultationRule,ensureDailyConsultations} from '@/lib/consultation-recurrence';
const headers={'Cache-Control':'private, no-store'};
const schema=z.object({startDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),from:z.string().regex(/^\d{2}:\d{2}$/),to:z.string().regex(/^\d{2}:\d{2}$/),mode:z.enum(['Online','Lodi','Entrambe'])});
export async function GET(){if(!await isRequestOwner())return new Response(null,{status:403});try{return Response.json({rule:await dailyConsultationRule(bookingDb())},{headers});}catch{return Response.json({error:'Disponibilità giornaliera non disponibile.'},{status:503,headers});}}
export async function POST(request:Request){
 if(!await isRequestOwner()||request.headers.get('origin')!==new URL(request.url).origin)return new Response(null,{status:403});
 try{
  const raw=await request.text();if(raw.length>1000)return new Response(null,{status:413});
  const p=schema.parse(JSON.parse(raw)),db=bookingDb();
  const existing=await dailyConsultationRule(db);
  if(existing&&(existing.start_date!==p.startDate||existing.from_time!==p.from||existing.to_time!==p.to||existing.mode!==p.mode))return Response.json({error:'La fascia giornaliera è già configurata. Puoi sospenderla o bloccare i singoli orari.'},{status:409,headers});
  if(!existing)consultationWindow(p.startDate,p.from,p.to);
  const now=new Date().toISOString();
  await db.prepare("INSERT INTO consultation_recurrence(id,start_date,from_time,to_time,mode,created_at,updated_at) VALUES('daily',?,?,?,?,?,?) ON CONFLICT DO NOTHING").bind(p.startDate,p.from,p.to,p.mode,now,now).run();
  const saved=await dailyConsultationRule(db);
  if(!saved||saved.start_date!==p.startDate||saved.from_time!==p.from||saved.to_time!==p.to||saved.mode!==p.mode)return Response.json({error:'La configurazione è cambiata. Ricarica il calendario.'},{status:409,headers});
  await ensureDailyConsultations(db);
  return Response.json({ok:true,rule:await dailyConsultationRule(db)},{headers});
 }catch{return Response.json({error:'Controlla la data e la fascia oraria: almeno 20 minuti, massimo 12 ore, con almeno 24 ore di anticipo ed entro un anno. Se il salvataggio è incerto, riprova gli stessi dati.'},{status:400,headers});}
}
export async function PATCH(request:Request){
 if(!await isRequestOwner()||request.headers.get('origin')!==new URL(request.url).origin)return new Response(null,{status:403});
 try{
  const raw=await request.text();if(raw.length>300)return new Response(null,{status:413});
  const p=z.object({active:z.boolean(),version:z.number().int().min(0)}).parse(JSON.parse(raw)),db=bookingDb();
  const result=await db.prepare("UPDATE consultation_recurrence SET active=?,version=version+1,updated_at=? WHERE id='daily' AND version=?").bind(p.active?1:0,new Date().toISOString(),p.version).run();
  if(!result.meta.changes){const current=await dailyConsultationRule(db);if(current?.version!==p.version+1||current.active!==Number(p.active))return Response.json({error:'La disponibilità è cambiata. Ricarica il calendario.'},{status:409,headers});}
  await ensureDailyConsultations(db);return Response.json({ok:true,rule:await dailyConsultationRule(db)},{headers});
 }catch{return Response.json({error:'Disponibilità non aggiornata. Riprova.'},{status:503,headers});}
}
