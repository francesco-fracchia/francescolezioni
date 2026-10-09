import {ensureDailyConsultations,dailyConsultationRule} from '@/lib/consultation-recurrence';
import { validateReferral } from '@/lib/referrals/server';
import {limitPublicRequest} from '@/lib/public-request-limit';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { bookingDb } from '@/lib/booking/runtime';
import { tests } from '@/lib/catalog';
import { consultationLeadMs,consultationOccupiedSql,consultationRecurrenceEnabledSql } from '@/lib/consultations';
const schema=z.object({id:z.string().uuid(),slotId:z.string().uuid(),name:z.string().trim().min(2).max(100),email:z.string().trim().email().max(254).transform(s=>s.toLowerCase()),phone:z.string().trim().max(40),subject:z.string().trim().min(2).max(100),studentType:z.enum(['Superiori','Università']),message:z.string().trim().max(1000),mode:z.enum(['Online','Lodi']),referralCode:z.string().max(19).optional(),consent:z.literal(true),website:z.string().max(0),assessment:z.object({test:z.string().max(100),score:z.number().min(0).max(100),answers:z.array(z.number().int().min(0).max(4)).max(5),student:z.string().max(200).optional()}).nullable().optional()});
const headers={'Cache-Control':'no-store'};
export async function GET(){try{
 const db=bookingDb();await ensureDailyConsultations(db);
 const slots=await db.prepare(`SELECT s.id,s.starts_at,s.ends_at,s.mode FROM consultation_slots s WHERE s.status='available' AND ${consultationRecurrenceEnabledSql} AND s.starts_at>=? AND NOT (${consultationOccupiedSql}) ORDER BY s.starts_at LIMIT 1301`).bind(new Date(Date.now()+consultationLeadMs).toISOString()).all();
 return Response.json({slots:slots.results.slice(0,1300),truncated:slots.results.length>1300},{headers});
}catch{return Response.json({error:'Calendario temporaneamente non disponibile. Riprova tra poco.'},{status:503,headers});}}
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Origine non consentita.'},{status:403,headers});
 try{
  const raw=await request.text();if(raw.length>5000)return Response.json({error:'Richiesta troppo grande.'},{status:413,headers});
  const parsed=schema.safeParse(JSON.parse(raw));if(!parsed.success)return Response.json({error:'Controlla i dati richiesti.'},{status:400,headers});
  const p=parsed.data,db=bookingDb(),hash=createHash('sha256').update(JSON.stringify(p)).digest('hex');
  const existing=await db.prepare('SELECT payload_hash,starts_at,ends_at,mode,status FROM consultations WHERE id=?').bind(p.id).first<{payload_hash:string;starts_at:string;ends_at:string;mode:string;status:string}>();
  if(existing){if(existing.payload_hash!==hash)return Response.json({error:'Questa prenotazione è già stata inviata con altri dati.'},{status:409,headers});return Response.json({ok:true,appointment:{starts_at:existing.starts_at,ends_at:existing.ends_at,mode:existing.mode,status:existing.status}},{headers});}
  if(await db.prepare('SELECT id FROM requests WHERE id=?').bind(p.id).first())return Response.json({error:'Identificativo già utilizzato. Riprova la prenotazione.'},{status:409,headers});
  const limited=await limitPublicRequest(request,p.email);if(limited)return limited;
  await validateReferral(p.referralCode||'');
  let assessment=null;
  if(p.assessment){const questions=tests[p.assessment.test];if(!questions||questions.length!==p.assessment.answers.length)return Response.json({error:'Risultato del test non valido.'},{status:400,headers});const review=questions.map((q,i)=>({topic:q.topic,question:q.text,answer:q.options[p.assessment!.answers[i]]||'Non lo so ancora',correctAnswer:q.options[q.correct],correct:p.assessment!.answers[i]===q.correct,explanation:q.explanation}));assessment=JSON.stringify({...p.assessment,score:Math.round(review.filter(r=>r.correct).length/questions.length*100),review,version:'2026-10-04'});}
  const now=new Date().toISOString(),after=new Date(Date.now()+consultationLeadMs).toISOString();
  const details=JSON.stringify({studentType:p.studentType,phone:p.phone,program:p.message,mode:p.mode,consultationId:p.id,booking:'confirmed',...(p.referralCode?{referralCode:p.referralCode}:{})});
  const result=await db.batch([
   db.prepare(`INSERT INTO consultations(id,slot_id,request_id,name,email,phone,subject,student_type,message,mode,starts_at,ends_at,payload_hash,created_at)
    SELECT ?,s.id,?,?,?,?,?,?,?,?,s.starts_at,s.ends_at,?,? FROM consultation_slots s WHERE s.id=? AND s.status='available' AND ${consultationRecurrenceEnabledSql} AND s.starts_at>=? AND (s.mode=? OR s.mode='Entrambe') ON CONFLICT(id) DO NOTHING`).bind(p.id,p.id,p.name,p.email,p.phone,p.subject,p.studentType,p.message,p.mode,hash,now,p.slotId,after,p.mode),
   db.prepare(`INSERT INTO requests(id,kind,name,email,subject,details,assessment,status,created_at,consent_version) SELECT ?,'consultation',?,?,?,json_set(?,'$.appointmentStart',starts_at,'$.appointmentEnd',ends_at),?,'confirmed',?,'2026-10-06' FROM consultations WHERE id=? AND payload_hash=? ON CONFLICT(id) DO NOTHING`).bind(p.id,p.name,p.email,p.subject,details,assessment,now,p.id,hash)
  ]);
  const booked=await db.prepare('SELECT payload_hash,starts_at,ends_at,mode,status FROM consultations WHERE id=?').bind(p.id).first<{payload_hash:string;starts_at:string;ends_at:string;mode:string;status:string}>();
  if(!booked||booked.payload_hash!==hash)return Response.json({error:'Questo orario non è più disponibile. Scegline un altro.'},{status:409,headers});
  return Response.json({ok:true,appointment:{starts_at:booked.starts_at,ends_at:booked.ends_at,mode:booked.mode,status:booked.status}},{status:result[0].meta.changes?201:200,headers});
 }catch(e){if(e instanceof Error&&e.message.startsWith('Codice invito'))return Response.json({error:e.message},{status:400,headers});if(e instanceof SyntaxError)return Response.json({error:'Dati non validi.'},{status:400,headers});const conflict=/LESSON_CONFLICT|CONSULTATION_SLOT_CHANGED|UNIQUE constraint/.test(String(e));return Response.json({error:conflict?'Questo orario è già occupato o è stato modificato. Scegline un altro.':'Non siamo riusciti a confermare l’incontro. I dati sono ancora nel modulo: riprova.'},{status:conflict?409:503,headers});}
}
