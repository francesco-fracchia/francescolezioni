import { bookingDb } from '@/lib/booking/runtime';
import { isRequestOwner } from '@/lib/request-admin';
import {z} from 'zod';
import {failure,LearningError,privateHeaders,sameOrigin} from '@/lib/learning/access';
import {leadSources,requestKinds,requestStatuses} from '@/lib/management/operations';
export async function GET(request:Request){try{
 if(!await isRequestOwner())throw new LearningError('Accesso riservato a Francesco.',403);
 const p=new URL(request.url).searchParams,id=p.get('id'),q=(p.get('q')||'').trim(),status=p.get('status')||'all',kind=p.get('kind')||'all',source=p.get('source')||'all';
 if(id&&!z.string().uuid().safeParse(id).success||q.length>100||status!=='all'&&!Object.hasOwn(requestStatuses,status)||kind!=='all'&&!Object.hasOwn(requestKinds,kind)||source!=='all'&&!Object.hasOwn(leadSources,source))throw new LearningError('Filtri non validi.');
 const where:string[]=[],args:unknown[]=[];
 if(id){where.push('r.id=?');args.push(id);}else{
  if(q){where.push("(r.name LIKE ? ESCAPE '\\' OR r.email LIKE ? ESCAPE '\\' OR r.subject LIKE ? ESCAPE '\\')");const term='%'+q.replace(/[\\%_]/g,'\\$&')+'%';args.push(term,term,term);}
  if(status!=='all'){where.push('r.status=?');args.push(status);}
  if(kind!=='all'){where.push('r.kind=?');args.push(kind);}
  if(source!=='all'){where.push("COALESCE(f.source,'unknown')=?");args.push(source);}
 }
 const result=await bookingDb().prepare(`SELECT r.id,r.kind,r.name,r.email,r.subject,r.details,r.assessment,r.status,r.created_at,r.student_id,r.group_id,f.last_contact_at,f.next_action,f.next_action_date,COALESCE(f.source,'unknown') source,f.notes followup_notes,f.version followup_version FROM requests r LEFT JOIN request_followups f ON f.request_id=r.id ${where.length?'WHERE '+where.join(' AND '):''} ORDER BY r.created_at DESC,r.id LIMIT 201`).bind(...args).all();
 return Response.json({requests:result.results.slice(0,200),truncated:result.results.length>200},{headers:privateHeaders});
 }catch(e){return failure(e);}}
export async function PATCH(request:Request){try{
 if(!await isRequestOwner())throw new LearningError('Accesso non consentito.',403);sameOrigin(request);
 const raw=await request.text();if(raw.length>1000)throw new LearningError('Richiesta troppo grande.',413);
 const p=z.object({id:z.string().uuid(),status:z.enum(['new','contacted','matching','confirmed','closed'])}).safeParse(JSON.parse(raw));if(!p.success)throw new LearningError('Stato non valido.');
 const r=await bookingDb().prepare('UPDATE requests SET status=? WHERE id=?').bind(p.data.status,p.data.id).run();if(!r.meta.changes)throw new LearningError('Richiesta non trovata.',404);
 return Response.json({ok:true},{headers:privateHeaders});
 }catch(e){return failure(e instanceof SyntaxError?new LearningError('Dati non validi.'):e);}}
