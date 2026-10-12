import { z } from 'zod';
import { bookingDb } from '@/lib/booking/runtime';
import { getAccount } from '@/lib/auth/session';
import { getVercelResources } from '@/lib/vercel/runtime.mjs';
import { failure, LearningError, privateHeaders, sameOrigin, studentScope } from '@/lib/learning/access';
import { uploadProof, uploadTypes, type UploadClaim } from '@/lib/uploads/server';
const input=z.object({kind:z.enum(['material','task','submission']),target:z.string().uuid(),filename:z.string().min(1).max(200),mime:z.string(),size:z.number().int().positive().max(50*1024*1024)});
export async function GET(request:Request){try{const account=await getAccount(request);if(!account||account.must_change_password)throw new LearningError('Accedi con il tuo account.',401);return Response.json({direct:process.env.APP_RUNTIME==='vercel'&&!!process.env.BLOB_STORE_ID},{headers:privateHeaders});}catch(error){return failure(error);}}
export async function POST(request:Request){try{
 sameOrigin(request);const account=await getAccount(request);if(!account||account.must_change_password)throw new LearningError('Accedi con il tuo account.',401);
 if(process.env.APP_RUNTIME!=='vercel'||!process.env.BLOB_STORE_ID)throw new LearningError('Caricamento diretto non disponibile.',409);
 const raw=await request.text();if(raw.length>2000)throw new LearningError('Dati troppo grandi.',413);const parsed=input.safeParse(JSON.parse(raw));if(!parsed.success)throw new LearningError('Controlla il file selezionato.');const p=parsed.data;
 if(!uploadTypes[p.kind].includes(p.mime)||p.size>(p.kind==='material'?50:10)*1024*1024)throw new LearningError('Formato o dimensione del file non consentiti.',413);
 const db=bookingDb();if(p.kind==='submission'){
  if(account.role!=='student')throw new LearningError('La consegna è riservata allo studente.',403);const scope=await studentScope(request);
  const task=await db.prepare("SELECT student_id FROM homework_assignments WHERE id=? AND status='published'").bind(p.target).first<{student_id:string}>();if(!task||scope.preview||!scope.students.some(s=>s.id===task.student_id))throw new LearningError('Compito non disponibile.',403);
 }else{
  if(account.role!=='tutor')throw new LearningError('Accesso riservato al tutor.',403);
  const query=p.kind==='material'?'SELECT id FROM course_modules WHERE id=?':"SELECT a.id FROM homework_assignments a JOIN students s ON s.id=a.student_id WHERE a.id=? AND s.status='active' AND NOT EXISTS(SELECT 1 FROM homework_submissions WHERE assignment_id=a.id)";
  if(!await db.prepare(query).bind(p.target).first())throw new LearningError('La scheda selezionata non è disponibile.',409);
 }
 const now=Date.now(),hour=Math.floor(now/3600000),limit=account.role==='tutor'?200:20;
 await db.prepare('DELETE FROM public_request_limits WHERE key IN (SELECT key FROM public_request_limits WHERE expires_at<=? ORDER BY expires_at LIMIT 500)').bind(now).run();
 const count=await db.prepare('INSERT INTO public_request_limits(key,attempts,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=MIN(attempts+1,?) RETURNING attempts').bind('upload:'+account.id+':'+hour,(hour+1)*3600000,limit+1).first<{attempts:number}>();if(!count||count.attempts>limit)throw new LearningError('Hai caricato diversi file. Attendi prima di riprovare.',429);
 const key=(p.kind==='material'?'learning':`homework/${p.kind==='task'?'tasks':'submissions'}`)+'/'+crypto.randomUUID();
 const claim:UploadClaim={actor:account.id,version:account.auth_version,kind:p.kind,target:p.target,key,filename:p.filename.replace(/[\x00-\x1f\x7f/\\]/g,'_'),mime:p.mime,size:p.size,expires:now+30*60*1000};
 const proof=uploadProof(claim),bucket=getVercelResources().BUCKET;if(!bucket.presignUpload)throw new LearningError('Caricamento diretto non disponibile.',503);const uploadUrl=await bucket.presignUpload(key,p.mime,p.size);
 return Response.json({uploadUrl,uploadProof:proof},{headers:privateHeaders});
 }catch(error){return failure(error instanceof SyntaxError?new LearningError('Dati non validi.'):error);}}
