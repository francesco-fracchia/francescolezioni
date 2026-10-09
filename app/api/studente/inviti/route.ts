import { z } from 'zod';
import { bookingDb } from '@/lib/booking/runtime';
import { failure,LearningError,privateHeaders,sameOrigin,studentScope } from '@/lib/learning/access';
import { creditsFor } from '@/lib/referrals/server';
async function selection(request:Request,explicit?:string){const scope=await studentScope(request);const id=explicit||new URL(request.url).searchParams.get('studente')||scope.students[0]?.id;if(!id||!scope.students.some(s=>s.id===id))throw new LearningError('Accesso non consentito.',403);return {scope,id};}
export async function GET(request:Request){try{
 const {scope,id}=await selection(request),db=bookingDb();const [code,credits,invites]=await Promise.all([
 db.prepare('SELECT code FROM referral_codes WHERE student_id=?').bind(id).first<{code:string}>(),creditsFor(id,new Date().toISOString()),
 db.prepare('SELECT id,status,reward_kind,created_at FROM referrals WHERE referrer_id=? OR invited_id=? ORDER BY created_at DESC,id LIMIT 201').bind(id,id).all()
 ]);
 return Response.json({code:code?.code||null,credits:credits.slice(0,200),invites:invites.results.slice(0,200),preview:scope.preview,truncated:credits.length>200||invites.results.length>200},{headers:privateHeaders});
 }catch(e){return failure(e);}}
export async function POST(request:Request){try{
 sameOrigin(request);const raw=await request.text();if(raw.length>200)throw new LearningError('Dati troppo grandi.',413);
 const p=z.object({studentId:z.string().uuid()}).parse(JSON.parse(raw)),{scope,id}=await selection(request,p.studentId);
 if(scope.preview)throw new LearningError('L’anteprima è in sola lettura.',403);
 await bookingDb().prepare("INSERT OR IGNORE INTO referral_codes(student_id,code,created_at) SELECT s.id,?,? FROM students s JOIN account_student_access a ON a.student_id=s.id JOIN accounts u ON u.id=a.account_id WHERE s.id=? AND s.status='active' AND a.status='active' AND u.id=? AND u.status='active' AND u.must_change_password=0 AND u.auth_version=?").bind('FF-'+crypto.randomUUID().replaceAll('-','').slice(0,16),new Date().toISOString(),id,scope.userId,scope.authVersion).run();
 const code=await bookingDb().prepare('SELECT code FROM referral_codes WHERE student_id=?').bind(id).first<{code:string}>();if(!code)throw new LearningError('Accesso aggiornato. Ricarica la pagina.',403);
 return Response.json({ok:true,code:code.code},{headers:privateHeaders});
 }catch(e){return failure(e instanceof z.ZodError||e instanceof SyntaxError?new LearningError('Dati non validi.'):e);}}
