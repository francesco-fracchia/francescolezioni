import { z } from 'zod';
import { isRequestOwner } from '@/lib/request-admin';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { env } from '@/lib/runtime-env';
import { bookingDb } from '@/lib/booking/runtime';
import { hashPassword,temporaryPassword } from '@/lib/auth/passwords';
import { authHeaders,sameAuthOrigin } from '@/lib/auth/session';
const id=z.string().uuid();
const commands=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('create'),id,name:z.string().trim().min(2).max(100),email:z.string().trim().email().max(254).transform(s=>s.toLowerCase()),role:z.enum(['student','guardian']),studentId:id}),
 z.object({kind:z.literal('tutor'),id}),
 z.object({kind:z.literal('status'),id,status:z.enum(['active','suspended'])}),
 z.object({kind:z.literal('reset'),id}),
 z.object({kind:z.literal('link'),id,studentId:id}),
 z.object({kind:z.literal('revoke'),id,studentId:id}),
]);
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:authHeaders});
export async function GET(){
 if(!await isRequestOwner())return reply({error:'Accesso riservato al tutor.'},403);
 try{const db=bookingDb();const [accounts,links,students]=await Promise.all([
  db.prepare('SELECT id,email,name,role,status,must_change_password,created_at FROM accounts ORDER BY name LIMIT 201').all(),
  db.prepare('SELECT account_id,student_id,status FROM account_student_access').all(),
  db.prepare('SELECT id,name,status FROM students ORDER BY name LIMIT 1000').all(),
 ]);return reply({accounts:accounts.results.slice(0,200),links:links.results,students:students.results,truncated:accounts.results.length>200,canCreateTutor:!accounts.results.some(a=>a.role==='tutor')});
 }catch{return reply({error:'Account temporaneamente non disponibili.'},503);}
}
export async function POST(request:Request){
 if(!await isRequestOwner())return reply({error:'Accesso riservato al tutor.'},403);
 if(!sameAuthOrigin(request))return reply({error:'Richiesta non consentita.'},403);
 try{
  const raw=await request.text();if(raw.length>2000)return reply({error:'Richiesta troppo grande.'},413);
  const p=commands.parse(JSON.parse(raw)),db=bookingDb(),now=new Date().toISOString();
  if(p.kind==='create'||p.kind==='tutor'){
   let name='',email='',role:string=p.kind==='tutor'?'tutor':p.role;
   if(p.kind==='tutor'){
    const user=await getChatGPTUser();if(!user||!env.REQUEST_OWNER_EMAIL||user.email.toLowerCase()!==env.REQUEST_OWNER_EMAIL.toLowerCase())return reply({error:'Il primo account tutor si crea dal tuo accesso privato di revisione.'},403);
    email=user.email.trim().toLowerCase();name=user.fullName||'Francesco Fracchia';
    const tutor=await db.prepare("SELECT id FROM accounts WHERE role='tutor'").first();if(tutor)return reply({error:'L’account tutor è già presente.'},409);
   }else{
    email=p.email;name=p.name;
    if(!await db.prepare("SELECT id FROM students WHERE id=? AND status='active'").bind(p.studentId).first())return reply({error:'Scegli uno studente attivo.'},409);
   }
   const existing=await db.prepare('SELECT id,email,name,role FROM accounts WHERE id=? OR email=?').bind(p.id,email).first<{id:string;email:string;name:string;role:string}>();
   if(existing)return existing.id===p.id&&existing.email===email&&existing.name===name&&existing.role===role?reply({ok:true,id:p.id,credentialsUnavailable:true}):reply({error:'Questa email ha già un account. Collegalo alla scheda o usa il reset della password.'},409);
   const password=temporaryPassword(),hash=await hashPassword(password);
   await db.batch([
    db.prepare(`INSERT OR IGNORE INTO accounts(id,name,email,role,password_hash,created_at,updated_at) SELECT ?,?,?,?,?,?,? WHERE ${p.kind==='create'?"EXISTS(SELECT 1 FROM students WHERE id=? AND status='active')":"NOT EXISTS(SELECT 1 FROM accounts WHERE role='tutor')"}`).bind(p.id,name,email,role,hash,now,now,...(p.kind==='create'?[p.studentId]:[])),
    ...(p.kind==='create'?[db.prepare("INSERT OR IGNORE INTO account_student_access(account_id,student_id,created_at) SELECT id,?,? FROM accounts WHERE id=? AND password_hash=? AND EXISTS(SELECT 1 FROM students WHERE id=? AND status='active')").bind(p.studentId,now,p.id,hash,p.studentId)]:[]),
   ]);
   const saved=await db.prepare('SELECT password_hash FROM accounts WHERE id=?').bind(p.id).first<{password_hash:string}>();
   if(!saved)return reply({error:'Dati cambiati: ricarica prima di creare l’account.'},409);
   return saved.password_hash===hash?reply({ok:true,id:p.id,email,temporaryPassword:password},201):reply({ok:true,id:p.id,credentialsUnavailable:true});
  }
  const account=await db.prepare('SELECT id,role,auth_version FROM accounts WHERE id=?').bind(p.id).first<{id:string;role:string;auth_version:number}>();if(!account)return reply({error:'Account non trovato.'},404);
  if(p.kind==='status'||p.kind==='reset'){
   if(account.role==='tutor'&&p.kind==='status')return reply({error:'L’account tutor non si sospende da questa pagina.'},400);
   const password=p.kind==='reset'?temporaryPassword():null,hash=password?await hashPassword(password):null;
   const results=await db.batch([
    db.prepare(p.kind==='reset'?"UPDATE accounts SET password_hash=?,must_change_password=1,auth_version=auth_version+1,updated_at=? WHERE id=? AND auth_version=?":"UPDATE accounts SET status=?,auth_version=auth_version+1,updated_at=? WHERE id=? AND auth_version=?").bind(p.kind==='reset'?hash:p.status,now,p.id,account.auth_version),
    db.prepare('DELETE FROM account_sessions WHERE account_id=? AND auth_version<=?').bind(p.id,account.auth_version),
   ]);
   if(!results[0].meta.changes)return reply({error:'Account aggiornato contemporaneamente. Ricarica.'},409);
   return reply({ok:true,...(password?{temporaryPassword:password}:{})});
  }
  if(account.role==='tutor')return reply({error:'Collega soltanto account studente o genitore.'},400);
  if(p.kind==='revoke'){await db.prepare("UPDATE account_student_access SET status='revoked' WHERE account_id=? AND student_id=?").bind(p.id,p.studentId).run();return reply({ok:true});}
  if(!await db.prepare("SELECT id FROM students WHERE id=? AND status='active'").bind(p.studentId).first())return reply({error:'Scegli uno studente attivo.'},409);
  const guard=account.role==='student'?"AND NOT EXISTS(SELECT 1 FROM account_student_access WHERE account_id=? AND student_id<>? AND status='active')":'';
  await db.prepare(`INSERT INTO account_student_access(account_id,student_id,created_at) SELECT id,?,? FROM accounts WHERE id=? AND status='active' AND EXISTS(SELECT 1 FROM students WHERE id=? AND status='active') ${guard} ON CONFLICT(account_id,student_id) DO UPDATE SET status='active'`).bind(p.studentId,now,p.id,p.studentId,...(account.role==='student'?[p.id,p.studentId]:[])).run();
  const link=await db.prepare("SELECT account_id FROM account_student_access WHERE account_id=? AND student_id=? AND status='active'").bind(p.id,p.studentId).first();
  return link?reply({ok:true}):reply({error:'Uno studente può avere una sola scheda attiva. Per più figli usa un account genitore.'},409);
 }catch(e){return reply({error:String(e).includes('UNIQUE')?'Email già utilizzata. Ricarica gli account.':e instanceof z.ZodError||e instanceof SyntaxError?'Controlla i dati richiesti.':'Operazione non completata. Ricarica prima di riprovare.'},e instanceof z.ZodError||e instanceof SyntaxError?400:503);}
}
