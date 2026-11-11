import { z } from 'zod';
import { isRequestOwner } from '@/lib/request-admin';
import { bookingDb } from '@/lib/booking/runtime';
import { failure,LearningError,privateHeaders,sameOrigin } from '@/lib/learning/access';
import { packagesFor,usesFor } from '@/lib/packages/server';
const uuid=z.string().uuid();
const schema=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('create'),id:uuid,studentId:uuid,method:z.enum(['cash','pos'])}),
 z.object({kind:z.literal('activate'),id:uuid,confirmed:z.literal(true)}),
 z.object({kind:z.literal('cover'),id:uuid,packageId:uuid,paymentId:uuid}),
 z.object({kind:z.literal('return'),id:uuid}),
 z.object({kind:z.literal('void'),id:uuid,confirmed:z.literal(true)}),
]);
export async function GET(request:Request){try{
 if(!await isRequestOwner())throw new LearningError('Accesso riservato al tutor.',403);
 const db=bookingDb(),sid=new URL(request.url).searchParams.get('studente');
 if(!sid){const s=await db.prepare('SELECT id,name,status FROM students ORDER BY name,id LIMIT 1001').all();return Response.json({students:s.results.slice(0,1000),truncated:s.results.length>1000},{headers:privateHeaders});}
 if(!uuid.safeParse(sid).success)throw new LearningError('Studente non valido.');
 const [packages,uses,payments]=await Promise.all([packagesFor(sid),usesFor(sid),db.prepare(`SELECT p.id,l.id AS lesson_id,l.subject,l.starts_at,l.mode FROM lesson_payments p JOIN scheduled_lessons l ON l.id=p.lesson_id WHERE p.student_id=? AND p.status='awaiting' AND p.amount=2000 AND p.stripe_session IS NULL AND p.attempt_key IS NULL AND l.status='planned' AND l.payment_status='awaiting' AND l.payment_method IN ('cash','pos') AND l.starts_at>? AND (SELECT COUNT(*) FROM lesson_payments pc WHERE pc.lesson_id=l.id)=1 AND NOT EXISTS(SELECT 1 FROM referral_redemptions r WHERE r.payment_id=p.id AND r.status='applied') AND NOT EXISTS(SELECT 1 FROM package_uses x WHERE x.payment_id=p.id AND x.status='applied') ORDER BY l.starts_at,p.id LIMIT 201`).bind(sid,new Date().toISOString()).all()]);
 return Response.json({packages:packages.slice(0,200),uses:uses.slice(0,200),payments:payments.results.slice(0,200),truncated:packages.length>200||uses.length>200||payments.results.length>200},{headers:privateHeaders});
 }catch(e){return failure(e);}}
export async function POST(request:Request){try{
 if(!await isRequestOwner())throw new LearningError('Accesso riservato al tutor.',403);sameOrigin(request);
 const raw=await request.text();if(raw.length>600)throw new LearningError('Dati troppo grandi.',413);
 const p=schema.parse(JSON.parse(raw)),db=bookingDb(),now=new Date().toISOString();
 if(p.kind==='create'){
 const old=await db.prepare('SELECT student_id,payment_method FROM lesson_packages WHERE id=?').bind(p.id).first<{student_id:string;payment_method:string}>();if(old){if(old.student_id===p.studentId&&old.payment_method===p.method)return Response.json({ok:true},{headers:privateHeaders});throw new LearningError('Identificativo già utilizzato.',409);}
 const r=await db.prepare("INSERT INTO lesson_packages(id,student_id,amount,units,unit_amount,payment_method,created_at) SELECT ?,id,9500,5,1900,?,? FROM students WHERE id=? AND status='active' ON CONFLICT(id) DO NOTHING").bind(p.id,p.method,now,p.studentId).run();
 if(!r.meta.changes){const winner=await db.prepare('SELECT student_id,payment_method FROM lesson_packages WHERE id=?').bind(p.id).first<{student_id:string;payment_method:string}>();if(winner?.student_id===p.studentId&&winner.payment_method===p.method)return Response.json({ok:true},{headers:privateHeaders});throw new LearningError('Studente non disponibile.',409);}
 return Response.json({ok:true},{status:201,headers:privateHeaders});
 }
 if(p.kind==='cover'){
 const old=await db.prepare('SELECT package_id,payment_id,status FROM package_uses WHERE id=?').bind(p.id).first<{package_id:string;payment_id:string;status:string}>();if(old){if(old.package_id===p.packageId&&old.payment_id===p.paymentId)return Response.json({ok:true,status:old.status},{headers:privateHeaders});throw new LearningError('Identificativo già utilizzato.',409);}
 await db.prepare('INSERT INTO package_uses(id,package_id,payment_id,created_at) VALUES(?,?,?,?)').bind(p.id,p.packageId,p.paymentId,now).run();return Response.json({ok:true},{headers:privateHeaders});
 }
 if(p.kind==='return'){
 const old=await db.prepare('SELECT status FROM package_uses WHERE id=?').bind(p.id).first<{status:string}>();if(old?.status==='returned')return Response.json({ok:true},{headers:privateHeaders});
 const r=await db.prepare("UPDATE package_uses SET status='returned' WHERE id=? AND status='applied' AND EXISTS(SELECT 1 FROM lesson_payments pay JOIN scheduled_lessons l ON l.id=pay.lesson_id WHERE pay.id=package_uses.payment_id AND l.status='planned' AND l.starts_at>?)").bind(p.id,now).run();if(!r.meta.changes)throw new LearningError('La lezione è già iniziata o l’utilizzo è cambiato. Verifica lo storico.',409);return Response.json({ok:true},{headers:privateHeaders});
 }
 const old=await db.prepare('SELECT status FROM lesson_packages WHERE id=?').bind(p.id).first<{status:string}>();if(!old)throw new LearningError('Pacchetto non disponibile.',404);
 if(p.kind==='activate'){
 if(old.status==='active')return Response.json({ok:true},{headers:privateHeaders});
 const r=await db.prepare("UPDATE lesson_packages SET status='active',paid_at=? WHERE id=? AND status='awaiting' AND payment_method IN ('cash','pos') AND EXISTS(SELECT 1 FROM students WHERE id=lesson_packages.student_id AND status='active')").bind(now,p.id).run();if(!r.meta.changes)throw new LearningError('Pacchetto non attivabile. Ricarica la scheda.',409);
 }else{
 if(old.status==='voided')return Response.json({ok:true},{headers:privateHeaders});
 const r=await db.prepare("UPDATE lesson_packages SET status='voided' WHERE id=? AND status IN ('awaiting','active') AND payment_method IN ('cash','pos') AND NOT EXISTS(SELECT 1 FROM package_uses x WHERE x.package_id=lesson_packages.id AND x.status='applied')").bind(p.id).run();if(!r.meta.changes)throw new LearningError('Ci sono lezioni associate al pacchetto. Verifica prima gli utilizzi; non viene eseguito un rimborso.',409);
 }
 return Response.json({ok:true},{headers:privateHeaders});
 }catch(e){return failure(e instanceof z.ZodError||e instanceof SyntaxError?new LearningError('Controlla i dati richiesti.'):String(e).includes('PACKAGE_')?new LearningError('Pacchetto non applicabile: controlla lezioni residue, studente, saldo e orario. Solo individuali future da 20 €, senza altri sconti o checkout.',409):String(e).includes('UNIQUE')?new LearningError('Utilizzo già registrato. Ricarica la scheda.',409):e);}}
