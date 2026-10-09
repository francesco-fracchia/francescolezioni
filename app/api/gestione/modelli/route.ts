import {z} from 'zod';
import {bookingDb} from '@/lib/booking/runtime';
import {isRequestOwner} from '@/lib/request-admin';
import {failure,LearningError,privateHeaders,sameOrigin} from '@/lib/learning/access';
import {contentSchema,templateKinds,type TutorTemplate} from '@/lib/management/templates';
const schema=z.object({id:z.string().uuid(),version:z.number().int().min(0).nullable(),kind:z.enum(['message','task','plan','summary']),name:z.string().trim().min(2).max(120),content:z.record(z.string()),status:z.enum(['active','archived'])}).strict();
export async function GET(request:Request){try{
 if(!await isRequestOwner())throw new LearningError('Accesso riservato al tutor.',403);const kind=new URL(request.url).searchParams.get('tipo');if(kind&&!Object.hasOwn(templateKinds,kind))throw new LearningError('Tipo non valido.');
 const result=await bookingDb().prepare(`SELECT id,name,kind,content,status,version FROM tutor_templates ${kind?"WHERE kind=? AND status='active'":''} ORDER BY status,name,id LIMIT 201`).bind(...(kind?[kind]:[])).all();return Response.json({templates:result.results.slice(0,200),truncated:result.results.length>200},{headers:privateHeaders});
 }catch(e){return failure(e);}}
export async function POST(request:Request){try{
 if(!await isRequestOwner())throw new LearningError('Accesso riservato al tutor.',403);sameOrigin(request);const raw=await request.text();if(raw.length>110000)throw new LearningError('Modello troppo lungo.',413);
 const parsed=schema.safeParse(JSON.parse(raw));if(!parsed.success)throw new LearningError('Controlla nome e tipo del modello.');const p=parsed.data,validated=contentSchema(p.kind).safeParse(p.content);if(!validated.success)throw new LearningError('Compila i testi del modello rispettando i limiti.');
 const content=JSON.stringify(validated.data),db=bookingDb(),now=new Date().toISOString(),old=await db.prepare('SELECT id,name,kind,content,status,version FROM tutor_templates WHERE id=?').bind(p.id).first<TutorTemplate>();
 if(old&&old.version===(p.version===null?0:p.version+1)&&old.name===p.name&&old.kind===p.kind&&old.content===content&&old.status===p.status)return Response.json({ok:true},{headers:privateHeaders});
 const result=p.version===null?await db.prepare('INSERT INTO tutor_templates(id,name,kind,content,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT DO NOTHING').bind(p.id,p.name,p.kind,content,p.status,now,now).run():await db.prepare('UPDATE tutor_templates SET name=?,content=?,status=?,updated_at=?,version=version+1 WHERE id=? AND kind=? AND version=?').bind(p.name,content,p.status,now,p.id,p.kind,p.version).run();
 if(!result.meta.changes)throw new LearningError('Modello già modificato. Riaprilo prima di salvare.',409);
 return Response.json({ok:true},{headers:privateHeaders});
 }catch(e){return failure(e instanceof SyntaxError?new LearningError('Dati non validi.'):e);}}
