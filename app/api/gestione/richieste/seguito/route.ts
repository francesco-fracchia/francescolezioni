import {z} from 'zod';
import {bookingDb} from '@/lib/booking/runtime';
import {isRequestOwner} from '@/lib/request-admin';
import {failure,LearningError,privateHeaders,sameOrigin} from '@/lib/learning/access';
import {leadSources} from '@/lib/management/operations';
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>{const d=new Date(s+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s;}).nullable();
const schema=z.object({id:z.string().uuid(),version:z.number().int().min(0).nullable(),lastContactAt:z.string().datetime().nullable(),nextAction:z.string().trim().max(300),nextActionDate:date,source:z.string().refine(s=>Object.hasOwn(leadSources,s)),notes:z.string().trim().max(2000)}).strict().refine(p=>!p.nextActionDate||!!p.nextAction).refine(p=>!p.lastContactAt||Date.parse(p.lastContactAt)<=Date.now()+300000);
export async function PATCH(request:Request){try{
 if(!await isRequestOwner())throw new LearningError('Accesso riservato al tutor.',403);sameOrigin(request);const raw=await request.text();if(raw.length>12000)throw new LearningError('Testo troppo lungo.',413);
 const parsed=schema.safeParse(JSON.parse(raw));if(!parsed.success)throw new LearningError('Controlla data, provenienza e prossima azione.');const p=parsed.data,db=bookingDb();
 if(!await db.prepare('SELECT id FROM requests WHERE id=?').bind(p.id).first())throw new LearningError('Richiesta non disponibile.',404);
 const values=[p.lastContactAt,p.nextAction,p.nextActionDate,p.source,p.notes],fields=['last_contact_at','next_action','next_action_date','source','notes'];
 const old=await db.prepare('SELECT * FROM request_followups WHERE request_id=?').bind(p.id).first<Record<string,unknown>>();
 if(old&&old.version===(p.version===null?0:p.version+1)&&fields.every((f,i)=>old[f]===values[i]))return Response.json({ok:true,version:old.version},{headers:privateHeaders});
 const now=new Date().toISOString();
 const result=p.version===null?await db.prepare('INSERT INTO request_followups(request_id,last_contact_at,next_action,next_action_date,source,notes,updated_at) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM requests WHERE id=?) ON CONFLICT DO NOTHING').bind(p.id,...values,now,p.id).run():await db.prepare('UPDATE request_followups SET last_contact_at=?,next_action=?,next_action_date=?,source=?,notes=?,updated_at=?,version=version+1 WHERE request_id=? AND version=?').bind(...values,now,p.id,p.version).run();
 if(!result.meta.changes)throw new LearningError('Il seguito è stato modificato. Ricarica la richiesta prima di salvare.',409);
 return Response.json({ok:true,version:p.version===null?0:p.version+1},{headers:privateHeaders});
 }catch(e){return failure(e instanceof SyntaxError?new LearningError('Dati non validi.'):e);}}
