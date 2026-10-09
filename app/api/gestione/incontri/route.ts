import {ensureDailyConsultations,dailyConsultationRule} from '@/lib/consultation-recurrence';
import { z } from 'zod';
import { isRequestOwner } from '@/lib/request-admin';
import { bookingDb } from '@/lib/booking/runtime';
import { consultationWindow,consultationOccupiedSql } from '@/lib/consultations';
const headers={'Cache-Control':'private, no-store'};
export async function GET(){if(!await isRequestOwner())return new Response(null,{status:403});try{
 const db=bookingDb();await ensureDailyConsultations(db);const [slots,appointments]=await Promise.all([
  db.prepare(`SELECT s.id,s.starts_at,s.ends_at,s.mode,s.recurrence_id,s.created_at,CASE WHEN s.recurrence_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM consultation_recurrence r WHERE r.id=s.recurrence_id AND r.active=1) THEN 'blocked' ELSE s.status END status,CASE WHEN ${consultationOccupiedSql} THEN 1 ELSE 0 END occupied FROM consultation_slots s WHERE s.starts_at>? ORDER BY s.starts_at LIMIT 1501`).bind(new Date().toISOString()).all(),
  db.prepare('SELECT id,slot_id,request_id,name,email,phone,subject,student_type,message,mode,starts_at,ends_at,status,version FROM consultations ORDER BY starts_at DESC LIMIT 201').all()
 ]);return Response.json({slots:slots.results.slice(0,1500),appointments:appointments.results.slice(0,200),recurrence:await dailyConsultationRule(db),truncated:slots.results.length>1500||appointments.results.length>200},{headers});
}catch{return Response.json({error:'Incontri temporaneamente non disponibili.'},{status:503,headers});}}
export async function POST(request:Request){if(!await isRequestOwner())return new Response(null,{status:403});if(request.headers.get('origin')!==new URL(request.url).origin)return new Response(null,{status:403});try{
 const raw=await request.text();if(raw.length>1000)return new Response(null,{status:413});
 const p=z.object({id:z.string().uuid(),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),from:z.string().regex(/^\d{2}:\d{2}$/),to:z.string().regex(/^\d{2}:\d{2}$/),mode:z.enum(['Online','Lodi','Entrambe'])}).parse(JSON.parse(raw));
 const slots=consultationWindow(p.date,p.from,p.to),db=bookingDb(),now=new Date().toISOString();
 const statements=slots.map((s,i)=>db.prepare(`INSERT INTO consultation_slots(id,starts_at,ends_at,mode,created_at) VALUES(?,?,?,?,?) ON CONFLICT DO NOTHING`).bind(`${p.id.slice(0,24)}${String(i).padStart(12,'0')}`,s.starts_at,s.ends_at,p.mode,now));
 // Public slot IDs are UUIDs, deterministic per batch to make retries safe.
 const results=await db.batch(statements);return Response.json({ok:true,created:results.reduce((n,r)=>n+r.meta.changes,0),count:slots.length},{status:201,headers});
}catch{return Response.json({error:'Scegli una fascia futura di almeno 20 minuti, massimo 12 ore, con almeno 24 ore di anticipo ed entro un anno.'},{status:400,headers});}}
export async function PATCH(request:Request){if(!await isRequestOwner())return new Response(null,{status:403});if(request.headers.get('origin')!==new URL(request.url).origin)return new Response(null,{status:403});try{
 const raw=await request.text();if(raw.length>700)return new Response(null,{status:413});
 const p=z.object({id:z.string().uuid(),action:z.enum(['block','unblock','cancel']),version:z.number().int().min(0).optional()}).parse(JSON.parse(raw));const db=bookingDb();
 if(p.action==='cancel'){
  if(p.version===undefined)return new Response(null,{status:400});const results=await db.batch([
   db.prepare("UPDATE consultations SET status='cancelled',version=version+1 WHERE id=? AND version=? AND status='confirmed' AND starts_at>?").bind(p.id,p.version,new Date().toISOString()),
   db.prepare("UPDATE requests SET status='closed' WHERE id=? AND EXISTS(SELECT 1 FROM consultations WHERE id=? AND status='cancelled' AND version=?)").bind(p.id,p.id,p.version+1)
  ]);return results[0].meta.changes?Response.json({ok:true},{headers}):Response.json({error:'L’incontro è cambiato o è già iniziato. Ricarica la pagina.'},{status:409,headers});
 }
 const result=await db.prepare(`UPDATE consultation_slots SET status=? WHERE id=? AND status=? AND starts_at>? AND NOT EXISTS(SELECT 1 FROM consultations WHERE slot_id=consultation_slots.id AND status='confirmed')`).bind(p.action==='block'?'blocked':'available',p.id,p.action==='block'?'available':'blocked',new Date().toISOString()).run();
 return result.meta.changes?Response.json({ok:true},{headers}):Response.json({error:'Questo orario è già prenotato o è cambiato. Ricarica la pagina.'},{status:409,headers});
}catch{return Response.json({error:'Aggiornamento non riuscito.'},{status:503,headers});}}
