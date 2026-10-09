import { z } from 'zod';
import { bookingDb } from '@/lib/booking/runtime';
import { isRequestOwner } from '@/lib/request-admin';
import { failure,LearningError,privateHeaders,sameOrigin } from '@/lib/learning/access';
import { lessonParticipant,studyData } from '@/lib/study/data';
import type { Appointment } from '@/lib/study/types';
const id=z.string().uuid(),title=z.string().trim().min(2).max(160),copy=z.string().trim().max(4000),status=z.enum(['draft','published','archived']),version=z.number().int().min(0).nullable();
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>{const d=new Date(s+'T12:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===s;}).nullable();
const common={id,studentId:id,title,status,version};
const command=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('plan'),...common,subject:title,objective:copy.refine(s=>s.length>0),targetDate:date,startingPoint:copy,topics:copy,nextSteps:copy}),
 z.object({kind:z.literal('summary'),...common,appointmentKind:z.enum(['lesson','booking']),appointmentId:id,topics:copy.refine(s=>s.length>0),practice:copy,nextSteps:copy}),
]);
export async function GET(request:Request){try{if(!await isRequestOwner())return failure(new LearningError('Accesso riservato al tutor.',403));
 const db=bookingDb(),students=await db.prepare('SELECT id,name,status FROM students ORDER BY status,name,id LIMIT 1001').all<{id:string;name:string;status:string}>();
 const selected=new URL(request.url).searchParams.get('studente')||students.results.find(s=>s.status==='active')?.id||students.results[0]?.id||null;
 if(!selected)return Response.json({students:[],selected:null,plans:[],summaries:[],appointments:[],truncated:{plans:false,summaries:false},appointmentLimit:false,studentLimit:false},{headers:privateHeaders});
 const student=await db.prepare('SELECT id,name,status FROM students WHERE id=?').bind(selected).first<{id:string;name:string;status:string}>();if(!student)throw new LearningError('Studente non disponibile.',404);
 const [data,lessons,bookings]=await Promise.all([studyData(selected,false),
 db.prepare(`SELECT 'lesson' kind,l.id,l.subject,l.starts_at,l.ends_at,l.status FROM scheduled_lessons l WHERE ${lessonParticipant} ORDER BY l.starts_at DESC,l.id LIMIT 201`).bind(selected,selected).all<Appointment>(),
 db.prepare("SELECT 'booking' kind,b.id,b.subject,s.starts_at,s.ends_at,b.status FROM bookings b JOIN booking_slots s ON s.id=b.slot_id WHERE b.student_id=? ORDER BY s.starts_at DESC,b.id LIMIT 201").bind(selected).all<Appointment>(),
 ]);
 const list=students.results.slice(0,1000);if(!list.some(s=>s.id===selected))list.push(student);
 return Response.json({...data,students:list,selected,appointments:[...lessons.results.slice(0,200),...bookings.results.slice(0,200)].sort((a,b)=>b.starts_at.localeCompare(a.starts_at)),appointmentLimit:lessons.results.length>200||bookings.results.length>200,studentLimit:students.results.length>1000},{headers:privateHeaders});
}catch(e){return failure(e);}}
export async function POST(request:Request){try{if(!await isRequestOwner())return failure(new LearningError('Accesso riservato al tutor.',403));
 sameOrigin(request);const raw=await request.text();if(raw.length>18000)throw new LearningError('Testo troppo lungo.',413);
 const parsed=command.safeParse(JSON.parse(raw));if(!parsed.success)throw new LearningError('Controlla titolo, testi e data.');const p=parsed.data,db=bookingDb(),now=new Date().toISOString();
 const student=await db.prepare("SELECT id FROM students WHERE id=? AND status='active'").bind(p.studentId).first();if(!student)throw new LearningError('Ripristina lo studente prima di modificare il percorso.',409);
 const table=p.kind==='plan'?'study_plans':'lesson_summaries';
 let appointment:{ends_at:string;status:string}|null=null;
 if(p.kind==='summary'){
  appointment=p.appointmentKind==='lesson'?await db.prepare(`SELECT l.ends_at,l.status FROM scheduled_lessons l WHERE l.id=? AND ${lessonParticipant}`).bind(p.appointmentId,p.studentId,p.studentId).first():await db.prepare('SELECT s.ends_at,b.status FROM bookings b JOIN booking_slots s ON s.id=b.slot_id WHERE b.id=? AND b.student_id=?').bind(p.appointmentId,p.studentId).first();
  if(!appointment)throw new LearningError('La lezione non appartiene alla scheda dello studente.',403);
  if(p.status==='published'&&(Date.parse(appointment.ends_at)>Date.now()||!Number.isFinite(Date.parse(appointment.ends_at))||appointment.status!==(p.appointmentKind==='lesson'?'planned':'confirmed')))throw new LearningError('Pubblica il riepilogo dopo la lezione, se non è cancellata o da confermare.',409);
 }
 const fields=p.kind==='plan'?['title','subject','objective','target_date','starting_point','topics','next_steps','status']:['title','topics','practice','next_steps','status'];
 const values=p.kind==='plan'?[p.title,p.subject,p.objective,p.targetDate,p.startingPoint,p.topics,p.nextSteps,p.status]:[p.title,p.topics,p.practice,p.nextSteps,p.status];
 let guard="EXISTS(SELECT 1 FROM students WHERE id=? AND status='active')",args:unknown[]=[p.studentId];
 if(p.kind==='summary'){
  guard+=p.appointmentKind==='lesson'?` AND EXISTS(SELECT 1 FROM scheduled_lessons l WHERE l.id=? AND ${lessonParticipant}${p.status==='published'?" AND l.status='planned' AND l.ends_at<=?":''})`:` AND EXISTS(SELECT 1 FROM bookings b JOIN booking_slots s ON s.id=b.slot_id WHERE b.id=? AND b.student_id=?${p.status==='published'?" AND b.status='confirmed' AND s.ends_at<=?":''})`;
  args.push(p.appointmentId,p.studentId,...(p.appointmentKind==='lesson'?[p.studentId]:[]),...(p.status==='published'?[now]:[]));
 }
 const existing=await db.prepare(`SELECT * FROM ${table} WHERE id=?`).bind(p.id).first<Record<string,unknown>>();
 if(p.version===null){
  if(existing){if(existing.student_id===p.studentId&&existing.version===0&&fields.every((f,i)=>existing[f]===values[i])&&(p.kind==='plan'||(existing.appointment_kind===p.appointmentKind&&existing.appointment_id===p.appointmentId)))return Response.json({ok:true,id:p.id},{headers:privateHeaders});throw new LearningError('Il contenuto è già stato aggiornato. Ricarica prima di riprovare.',409);}
  const columns=['id','student_id',...(p.kind==='summary'?['appointment_kind','appointment_id']:[]),...fields,'created_at','updated_at'];const bindings=[p.id,p.studentId,...(p.kind==='summary'?[p.appointmentKind,p.appointmentId]:[]),...values,now,now];
  const result=await db.prepare(`INSERT INTO ${table}(${columns.join(',')}) SELECT ${bindings.map(()=>'?').join(',')} WHERE ${guard} ON CONFLICT DO NOTHING`).bind(...bindings,...args).run();
  if(!result.meta.changes)throw new LearningError('Dati cambiati o riepilogo già presente per questa lezione. Ricarica prima di riprovare.',409);
 }else{
  if(!existing||existing.student_id!==p.studentId)throw new LearningError('Contenuto non disponibile.',404);
  if(p.kind==='summary'&&(existing.appointment_kind!==p.appointmentKind||existing.appointment_id!==p.appointmentId))throw new LearningError('Il riepilogo resta collegato alla sua lezione originale.',409);
  const result=await db.prepare(`UPDATE ${table} SET ${fields.map(f=>f+'=?').join(',')},version=version+1,updated_at=? WHERE id=? AND student_id=? AND version=? AND ${guard}`).bind(...values,now,p.id,p.studentId,p.version,...args).run();
  if(!result.meta.changes)throw new LearningError('Dati aggiornati contemporaneamente. Ricarica prima di salvare.',409);
 }
 return Response.json({ok:true,id:p.id},{headers:privateHeaders});
}catch(e){return failure(e instanceof SyntaxError?new LearningError('Dati non validi.'):e);}}
