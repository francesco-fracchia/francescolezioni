import {z} from 'zod';
import {bookingDb} from '@/lib/booking/runtime';
import {isRequestOwner} from '@/lib/request-admin';
import {failure,LearningError,privateHeaders,sameOrigin} from '@/lib/learning/access';
const schema=z.object({recipients:z.array(z.object({id:z.string().uuid(),studentId:z.string().uuid()}).strict()).min(2).max(30),title:z.string().trim().min(2).max(160),subject:z.string().trim().min(2).max(160),instructions:z.string().trim().min(1).max(10000),dueDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>{const d=new Date(s+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s;}).nullable(),status:z.enum(['draft','published'])}).strict().refine(p=>new Set(p.recipients.map(r=>r.id)).size===p.recipients.length&&new Set(p.recipients.map(r=>r.studentId)).size===p.recipients.length);
export async function POST(request:Request){try{
 if(!await isRequestOwner())throw new LearningError('Accesso riservato al tutor.',403);sameOrigin(request);const raw=await request.text();if(raw.length>100000)throw new LearningError('Compito troppo lungo.',413);const parsed=schema.safeParse(JSON.parse(raw));if(!parsed.success)throw new LearningError('Scegli da 2 a 30 studenti distinti e controlla i testi.');
 const p=parsed.data,db=bookingDb(),now=new Date().toISOString(),recipients=JSON.stringify(p.recipients);
 // One INSERT: all recipients must still be active and every reused id must match.
 // No partial batch, no shared submission, no file or private plan copied across students.
 const result=await db.prepare(`WITH recipients AS (SELECT json_extract(value,'$.id') id,json_extract(value,'$.studentId') student_id FROM json_each(?)), content AS (SELECT ? title,? subject,? instructions,? due_date,? status)
 INSERT INTO homework_assignments(id,student_id,title,subject,instructions,due_date,status,created_at,updated_at)
 SELECT r.id,r.student_id,c.title,c.subject,c.instructions,c.due_date,c.status,?,? FROM recipients r CROSS JOIN content c
 WHERE NOT EXISTS(SELECT 1 FROM recipients x LEFT JOIN students s ON s.id=x.student_id WHERE s.id IS NULL OR s.status!='active')
 AND NOT EXISTS(SELECT 1 FROM recipients x JOIN homework_assignments a ON a.id=x.id WHERE a.student_id!=x.student_id OR a.title!=c.title OR a.subject!=c.subject OR a.instructions!=c.instructions OR a.due_date IS NOT c.due_date OR a.status!=c.status OR a.plan_id IS NOT NULL OR a.object_key IS NOT NULL OR a.version!=0)
 ON CONFLICT(id) DO NOTHING`).bind(recipients,p.title,p.subject,p.instructions,p.dueDate,p.status,now,now).run();
 if(result.meta.changes===p.recipients.length)return Response.json({ok:true,count:p.recipients.length},{headers:privateHeaders});
 // Retry after a lost response must find all copies intact, never create new ids.
 const rows=await db.prepare(`SELECT a.id,a.student_id,a.title,a.subject,a.instructions,a.due_date,a.status,a.version,a.plan_id,a.object_key,s.status student_status FROM homework_assignments a JOIN students s ON s.id=a.student_id WHERE a.id IN (SELECT json_extract(value,'$.id') FROM json_each(?))`).bind(recipients).all<Record<string,unknown>>();
 if(rows.results.length!==p.recipients.length||!rows.results.every(a=>p.recipients.some(r=>r.id===a.id&&r.studentId===a.student_id)&&a.title===p.title&&a.subject===p.subject&&a.instructions===p.instructions&&a.due_date===p.dueDate&&a.status===p.status&&a.version===0&&a.plan_id===null&&a.object_key===null&&a.student_status==='active'))throw new LearningError('Una scheda o un compito sono cambiati. Ricarica l’elenco prima di riprovare.',409);
 return Response.json({ok:true,count:p.recipients.length},{headers:privateHeaders});
 }catch(e){return failure(e instanceof SyntaxError?new LearningError('Dati non validi.'):e);}}
