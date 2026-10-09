import { z } from 'zod';
import { isRequestOwner } from '@/lib/request-admin';
import { bookingDb } from '@/lib/booking/runtime';
import { failure,LearningError,privateHeaders,sameOrigin } from '@/lib/learning/access';
import { candidates,creditsFor,qualifyingLessonSql,validQualificationsSql,validateReferral } from '@/lib/referrals/server';
import { creditExpiry,referralPattern,rewardAmount } from '@/lib/referrals/rules';
const uuid=z.string().uuid();
const schema=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('code'),studentId:uuid}),
 z.object({kind:z.literal('link'),id:uuid,code:z.string().regex(referralPattern),studentId:uuid,requestId:uuid.optional()}),
 z.object({kind:z.literal('approve'),id:uuid,operationId:uuid,rewardKind:z.enum(['individual','group']),lessonIds:z.array(uuid).length(3).refine(a=>new Set(a).size===3)}),
 z.object({kind:z.literal('reject'),id:uuid}),z.object({kind:z.literal('revoke'),id:uuid}),
 z.object({kind:z.literal('redeem'),id:uuid,creditId:z.string().max(100),paymentId:uuid}),z.object({kind:z.literal('return'),id:uuid}),
]);
export async function GET(request:Request){try{
 if(!await isRequestOwner())throw new LearningError('Accesso riservato al tutor.',403);
 const db=bookingDb(),params=new URL(request.url).searchParams,id=params.get('invito'),studentId=params.get('studente'),now=new Date().toISOString();
 if(id){if(!uuid.safeParse(id).success)throw new LearningError('Invito non valido.');const row=await db.prepare(`SELECT r.*,sender.name AS referrer_name,friend.name AS invited_name FROM referrals r JOIN students sender ON sender.id=r.referrer_id JOIN students friend ON friend.id=r.invited_id WHERE r.id=?`).bind(id).first();if(!row)throw new LearningError('Invito non disponibile.',404);const [individual,group]=await Promise.all([candidates(id,'individual',now),candidates(id,'group',now)]);return Response.json({referral:row,individual:individual.slice(0,200),group:group.slice(0,200),truncated:individual.length>200||group.length>200},{headers:privateHeaders});}
 if(studentId){if(!uuid.safeParse(studentId).success)throw new LearningError('Studente non valido.');const [credits,payments,redemptions]=await Promise.all([
 creditsFor(studentId,now),db.prepare(`SELECT p.id,p.amount,l.id AS lesson_id,l.subject,l.starts_at,l.mode,(SELECT COUNT(*) FROM lesson_payments others WHERE others.lesson_id=l.id) AS participants FROM lesson_payments p JOIN scheduled_lessons l ON l.id=p.lesson_id WHERE p.student_id=? AND p.status='awaiting' AND p.stripe_session IS NULL AND p.attempt_key IS NULL AND l.status='planned' AND l.starts_at>? AND l.payment_method IN ('cash','pos') AND NOT EXISTS(SELECT 1 FROM referral_redemptions x WHERE x.payment_id=p.id AND x.status='applied') ORDER BY l.starts_at,p.id LIMIT 201`).bind(studentId,now).all(),
 db.prepare(`SELECT x.id,x.amount,x.status,l.subject,l.starts_at,p.status AS payment_status FROM referral_redemptions x JOIN referral_credits c ON c.id=x.credit_id JOIN lesson_payments p ON p.id=x.payment_id JOIN scheduled_lessons l ON l.id=p.lesson_id WHERE c.student_id=? ORDER BY x.created_at DESC,x.id LIMIT 201`).bind(studentId).all()
 ]);return Response.json({credits:credits.slice(0,200),payments:payments.results.slice(0,200),redemptions:redemptions.results.slice(0,200),truncated:credits.length>200||payments.results.length>200||redemptions.results.length>200},{headers:privateHeaders});}
 const [students,referrals,requests]=await Promise.all([
 db.prepare("SELECT s.id,s.name,s.status,c.code FROM students s LEFT JOIN referral_codes c ON c.student_id=s.id ORDER BY s.name,s.id LIMIT 1001").all(),
 db.prepare(`SELECT r.id,r.referrer_id,r.invited_id,r.status,r.reward_kind,r.created_at,r.qualified_at,a.name AS referrer_name,b.name AS invited_name,CASE WHEN r.status='rewarded' AND ${validQualificationsSql} THEN 1 ELSE 0 END AS valid_reward FROM referrals r JOIN students a ON a.id=r.referrer_id JOIN students b ON b.id=r.invited_id ORDER BY r.created_at DESC,r.id LIMIT 201`).bind(now).all(),
 db.prepare("SELECT id,name,student_id,json_extract(details,'$.referralCode') AS code FROM requests WHERE json_valid(details) AND json_extract(details,'$.referralCode') IS NOT NULL ORDER BY created_at DESC,id LIMIT 201").all()
 ]);return Response.json({students:students.results.slice(0,1000),referrals:referrals.results.slice(0,200),requests:requests.results.slice(0,200),truncated:students.results.length>1000||referrals.results.length>200||requests.results.length>200},{headers:privateHeaders});
 }catch(e){return failure(e);}}
export async function POST(request:Request){try{
 if(!await isRequestOwner())throw new LearningError('Accesso riservato al tutor.',403);sameOrigin(request);
 const raw=await request.text();if(raw.length>1500)throw new LearningError('Dati troppo grandi.',413);const p=schema.parse(JSON.parse(raw)),db=bookingDb(),now=new Date().toISOString();
 if(p.kind==='code'){
 await db.prepare("INSERT OR IGNORE INTO referral_codes(student_id,code,created_at) SELECT id,?,? FROM students WHERE id=? AND status='active'").bind('FF-'+crypto.randomUUID().replaceAll('-','').slice(0,16),now,p.studentId).run();const code=await db.prepare('SELECT code FROM referral_codes WHERE student_id=?').bind(p.studentId).first();if(!code)throw new LearningError('Studente non disponibile.',409);return Response.json({ok:true,...code},{headers:privateHeaders});
 }
 if(p.kind==='link'){
 await validateReferral(p.code);
 const existing=await db.prepare('SELECT referrer_id,invited_id,request_id FROM referrals WHERE id=?').bind(p.id).first<{referrer_id:string;invited_id:string;request_id:string|null}>();
 const source=await db.prepare('SELECT student_id FROM referral_codes WHERE code=?').bind(p.code).first<{student_id:string}>();if(!source)throw new LearningError('Codice non disponibile.');
 if(existing){if(existing.referrer_id===source.student_id&&existing.invited_id===p.studentId&&existing.request_id===(p.requestId||null))return Response.json({ok:true},{headers:privateHeaders});throw new LearningError('Identificativo già utilizzato.',409);}
 let claimedAt=now;
 if(p.requestId){const row=await db.prepare("SELECT student_id,created_at,json_extract(details,'$.referralCode') AS code FROM requests WHERE id=? AND json_valid(details)").bind(p.requestId).first<{student_id:string;created_at:string;code:string}>();if(!row||row.student_id!==p.studentId||row.code!==p.code)throw new LearningError('Collega prima la richiesta alla scheda corretta e verifica il codice.',409);claimedAt=row.created_at;}
 const saved=await db.prepare(`INSERT INTO referrals(id,referrer_id,invited_id,request_id,created_at) SELECT ?,c.student_id,s.id,?,? FROM referral_codes c JOIN students sender ON sender.id=c.student_id JOIN students s ON s.id=? WHERE c.code=? AND sender.status='active' AND s.status='active' AND s.id!=c.student_id AND NOT EXISTS(SELECT 1 FROM lesson_payments pay JOIN scheduled_lessons l ON l.id=pay.lesson_id WHERE pay.student_id=s.id AND pay.status='manual_paid' AND pay.paid_at IS NOT NULL AND l.status='planned' AND l.payment_method IN ('cash','pos') AND julianday(l.starts_at)<julianday(?)) AND NOT EXISTS(SELECT 1 FROM referrals WHERE invited_id=s.id)`).bind(p.id,p.requestId||null,claimedAt,p.studentId,p.code,claimedAt).run();
 if(!saved.meta.changes){const winner=await db.prepare('SELECT referrer_id,invited_id,request_id FROM referrals WHERE id=?').bind(p.id).first<{referrer_id:string;invited_id:string;request_id:string|null}>();if(winner?.referrer_id===source.student_id&&winner.invited_id===p.studentId&&winner.request_id===(p.requestId||null))return Response.json({ok:true},{headers:privateHeaders});throw new LearningError('Invito non collegabile: studente già invitato, stessa persona o lezioni a pagamento precedenti.',409);}return Response.json({ok:true},{status:201,headers:privateHeaders});
 }
 if(p.kind==='redeem'){
 const old=await db.prepare('SELECT credit_id,payment_id,status FROM referral_redemptions WHERE id=?').bind(p.id).first<{credit_id:string;payment_id:string;status:string}>();if(old){if(old.credit_id===p.creditId&&old.payment_id===p.paymentId)return Response.json({ok:true,status:old.status},{headers:privateHeaders});throw new LearningError('Identificativo già utilizzato.',409);}
 await db.prepare("INSERT INTO referral_redemptions(id,credit_id,payment_id,amount,created_at) VALUES(?,?,?,500,?)").bind(p.id,p.creditId,p.paymentId,now).run();return Response.json({ok:true},{headers:privateHeaders});
 }
 if(p.kind==='return'){
 const row=await db.prepare(`SELECT x.id,x.status,p.status AS payment_status,p.stripe_session FROM referral_redemptions x JOIN lesson_payments p ON p.id=x.payment_id WHERE x.id=?`).bind(p.id).first<{status:string;payment_status:string;stripe_session:string|null}>();if(!row)throw new LearningError('Utilizzo non disponibile.',404);if(row.status==='returned')return Response.json({ok:true},{headers:privateHeaders});
 const r=await db.prepare("UPDATE referral_redemptions SET status='returned' WHERE id=? AND status='applied' AND EXISTS(SELECT 1 FROM lesson_payments p WHERE p.id=referral_redemptions.payment_id AND p.status='awaiting' AND p.stripe_session IS NULL)").bind(p.id).run();if(!r.meta.changes)throw new LearningError('Saldo già ricevuto o in verifica. Il credito non può essere rimosso da questa lezione.',409);return Response.json({ok:true},{headers:privateHeaders});
 }
 const referral=await db.prepare('SELECT * FROM referrals WHERE id=?').bind(p.id).first<{status:string;reward_kind:string|null}>();if(!referral)throw new LearningError('Invito non disponibile.',404);
 if(p.kind==='reject'){const r=await db.prepare("UPDATE referrals SET status='rejected' WHERE id=? AND status='pending'").bind(p.id).run();if(!r.meta.changes&&referral.status!=='rejected')throw new LearningError('Invito già verificato.',409);return Response.json({ok:true},{headers:privateHeaders});}
 if(p.kind==='revoke'){
 if(referral.status==='revoked')return Response.json({ok:true},{headers:privateHeaders});
 const results=await db.batch([
 db.prepare("UPDATE referrals SET status='revoked' WHERE id=? AND status='rewarded' AND NOT EXISTS(SELECT 1 FROM referral_redemptions x JOIN referral_credits c ON c.id=x.credit_id WHERE c.referral_id=referrals.id AND x.status='applied')").bind(p.id),
 db.prepare("UPDATE referral_credits SET status='revoked' WHERE referral_id=? AND EXISTS(SELECT 1 FROM referrals r WHERE r.id=referral_credits.referral_id AND r.status='revoked')").bind(p.id)
 ]);if(!results[0].meta.changes)throw new LearningError('Premio già utilizzato: verifica personalmente le lezioni e i saldi. Non vengono creati addebiti.',409);return Response.json({ok:true},{headers:privateHeaders});
 }
 if(referral.status==='rewarded'){if(referral.reward_kind!==p.rewardKind)throw new LearningError('È già stato assegnato l’altro premio. I due bonus non si sommano.',409);return Response.json({ok:true},{headers:privateHeaders});}
 if(referral.status!=='pending')throw new LearningError('Invito non più in verifica.',409);
 const amount=rewardAmount(p.rewardKind),selected=JSON.stringify(p.lessonIds),expires=creditExpiry(new Date(now));
 const statements=[db.prepare(`UPDATE referrals SET status='rewarded',reward_kind=?,award_key=?,qualified_at=? WHERE id=? AND status='pending' AND referrer_id!=invited_id AND EXISTS(SELECT 1 FROM students WHERE id=referrals.referrer_id AND status='active') AND EXISTS(SELECT 1 FROM students WHERE id=referrals.invited_id AND status='active') AND (SELECT COUNT(DISTINCT l.id) FROM (SELECT id,referrer_id,invited_id,created_at,? AS reward_kind FROM referrals WHERE id=?) r JOIN lesson_payments p ON p.student_id=r.invited_id JOIN scheduled_lessons l ON l.id=p.lesson_id JOIN json_each(?) chosen ON chosen.value=l.id WHERE ${qualifyingLessonSql})=3`).bind(p.rewardKind,p.operationId,now,p.id,p.rewardKind,p.id,selected,now),
 ...p.lessonIds.map(lessonId=>db.prepare("INSERT OR IGNORE INTO referral_qualifications(referral_id,lesson_id) SELECT id,? FROM referrals WHERE id=? AND status='rewarded' AND award_key=?").bind(lessonId,p.id,p.operationId)),
 ...['referrer_id','invited_id'].map(column=>db.prepare(`INSERT OR IGNORE INTO referral_credits(id,referral_id,student_id,kind,amount,expires_at,created_at) SELECT id||'-'||?,id,${column},reward_kind,?,?,? FROM referrals WHERE id=? AND status='rewarded' AND award_key=? AND (SELECT COUNT(*) FROM referral_qualifications WHERE referral_id=referrals.id)=3`).bind(column,amount,expires,now,p.id,p.operationId))];
 await db.batch(statements);const awarded=await db.prepare('SELECT status,reward_kind FROM referrals WHERE id=?').bind(p.id).first<{status:string;reward_kind:string}>();if(awarded?.status!=='rewarded'||awarded.reward_kind!==p.rewardKind)throw new LearningError('Lezioni o saldi cambiati. Servono tre lezioni svolte e realmente saldate, compatibili con il premio scelto.',409);return Response.json({ok:true},{headers:privateHeaders});
 }catch(e){return failure(e instanceof z.ZodError||e instanceof SyntaxError?new LearningError('Controlla i dati richiesti.'):String(e).includes('REFERRAL_CREDIT')?new LearningError('Credito non applicabile: controlla saldo disponibile, scadenza, tipo di lezione e pagamento. Massimo 5 € per lezione, senza altri sconti.',409):String(e).includes('UNIQUE')?new LearningError('Invito o utilizzo già registrato. Ricarica per verificare.',409):e);}}
