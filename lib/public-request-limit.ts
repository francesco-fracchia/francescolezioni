import {createHash} from 'node:crypto';
import {bookingDb} from '@/lib/booking/runtime';

const hour=60*60*1000;
export const publicRequestLimits={email:5,ip:20,total:100};
// Shared by contacts, course requests, free appointments and new test checkouts.
// Store hashes only. Admit globally before creating per-address counters, so
// changing emails cannot grow this table without bound after the total cap.
export async function limitPublicRequest(request:Request,email:string):Promise<Response|null>{
 const now=Date.now(),bucket=Math.floor(now/hour),expires=(bucket+1)*hour,db=bookingDb();
 const blocked=()=>Response.json({error:'Hai inviato diverse richieste in poco tempo. Attendi un po’ prima di inviarne un’altra. I dati restano nel modulo.'},{status:429,headers:{'Cache-Control':'no-store','Retry-After':String(Math.max(1,Math.ceil((expires-now)/1000)))}});
 const increment=(key:string,max:number)=>db.prepare(`INSERT INTO public_request_limits(key,attempts,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=MIN(attempts+1,?) RETURNING attempts`).bind(key,expires,max+1);
 const attempts=(result:{results:unknown[]})=>{const count=(result.results[0] as {attempts?:number}|undefined)?.attempts;if(!Number.isInteger(count))throw new Error('Rate limit unavailable');return count!;};
 const total=await db.batch([
  db.prepare('DELETE FROM public_request_limits WHERE key IN (SELECT key FROM public_request_limits WHERE expires_at<=? ORDER BY expires_at LIMIT 500)').bind(now),
  increment('total:'+bucket,publicRequestLimits.total),
 ]);
 if(attempts(total[1])>publicRequestLimits.total)return blocked();
 const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
 const keys:[string,number][]=[['email:'+hash(email.trim().toLowerCase())+':'+bucket,publicRequestLimits.email]];
 const ip=request.headers.get('cf-connecting-ip');if(ip)keys.push(['ip:'+hash(ip)+':'+bucket,publicRequestLimits.ip]);
 const result=await db.batch(keys.map(([key,max])=>increment(key,max)));
 if(keys.some(([,max],i)=>attempts(result[i])>max))return blocked();
 return null;
}
