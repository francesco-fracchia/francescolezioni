import { z } from 'zod';
import { bookingDb } from '@/lib/booking/runtime';
import { acceptablePassword,hashPassword,verifyPassword } from '@/lib/auth/passwords';
import { authHeaders,cookie,digest,getAccount,newSessionToken,safeDestination,sameAuthOrigin,sessionLifetime } from '@/lib/auth/session';

const reply=(body:unknown,status=200,extra:Record<string,string>={})=>Response.json(body,{status,headers:{...authHeaders,...extra}});
const password=z.string().max(512).refine(v=>[...v].length<=128);
export async function GET(request:Request){try{const a=await getAccount(request);return reply({account:a?{id:a.id,name:a.name,email:a.email,role:a.role,mustChangePassword:!!a.must_change_password}:null});}catch{return reply({error:'Accesso temporaneamente non disponibile.'},503);}}
async function reserveAttempts(request:Request,email:string){
 const db=bookingDb(),now=Date.now(),window=15*60*1000,slot=Math.floor(now/window);
 const keys=[['email:'+digest(email)+':'+slot,8],['ip:'+digest(request.headers.get('cf-connecting-ip')||'local')+':'+slot,80],['global:'+slot,200]] as const;
 await db.batch([db.prepare('DELETE FROM auth_attempts WHERE expires_at<?').bind(now),...keys.map(([key])=>db.prepare('INSERT INTO auth_attempts(key,attempts,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1').bind(key,(slot+1)*window))]);
 for(const [key,max] of keys){const row=await db.prepare('SELECT attempts FROM auth_attempts WHERE key=?').bind(key).first<{attempts:number}>();if(!row||row.attempts>max)return false;}return true;
}
export async function POST(request:Request){
 if(!sameAuthOrigin(request))return reply({error:'Richiesta non consentita.'},403);
 try{
  const raw=await request.text();if(raw.length>2000)return reply({error:'Richiesta troppo grande.'},413);
  const p=z.object({email:z.string().trim().email().max(254).transform(s=>s.toLowerCase()),password,destination:z.string().max(500).optional()}).parse(JSON.parse(raw));
  if(!await reserveAttempts(request,p.email))return reply({error:'Troppi tentativi. Riprova tra 15 minuti.'},429,{'Retry-After':'900'});
  const db=bookingDb();const a=await db.prepare('SELECT id,role,status,password_hash,auth_version,must_change_password FROM accounts WHERE email=?').bind(p.email).first<{id:string;role:string;status:string;password_hash:string;auth_version:number;must_change_password:number}>();
  const valid=await verifyPassword(p.password,a?.password_hash||null);
  if(!a||!valid||a.status!=='active')return reply({error:'Credenziali non valide o account non disponibile.'},401);
  const token=newSessionToken(),now=Date.now();
  await db.batch([
   db.prepare('DELETE FROM account_sessions WHERE expires_at<=?').bind(now),
   db.prepare("INSERT INTO account_sessions(token_hash,account_id,auth_version,expires_at,created_at) SELECT ?,id,auth_version,?,? FROM accounts WHERE id=? AND auth_version=? AND password_hash=? AND status='active'").bind(digest(token),now+sessionLifetime,now,a.id,a.auth_version,a.password_hash),
  ]);
  if(!await db.prepare('SELECT token_hash FROM account_sessions WHERE token_hash=?').bind(digest(token)).first())return reply({error:'Account aggiornato: ripeti l’accesso.'},401);
  const destination=a.must_change_password?'/account':safeDestination(p.destination||null)||(a.role==='tutor'?'/gestione':'/studente');
  return reply({ok:true,destination},200,{'Set-Cookie':cookie(request,token)});
 }catch(e){return reply({error:e instanceof z.ZodError||e instanceof SyntaxError?'Controlla email e password.':'Accesso temporaneamente non disponibile.'},e instanceof z.ZodError||e instanceof SyntaxError?400:503);}
}
export async function DELETE(request:Request){
 if(!sameAuthOrigin(request))return reply({error:'Richiesta non consentita.'},403);
 try{const a=await getAccount(request);if(a)await bookingDb().prepare('DELETE FROM account_sessions WHERE token_hash=?').bind(a.session_hash).run();return reply({ok:true},200,{'Set-Cookie':cookie(request,null)});}catch{return reply({error:'Uscita non completata. Riprova.'},503);}
}
export async function PATCH(request:Request){
 if(!sameAuthOrigin(request))return reply({error:'Richiesta non consentita.'},403);
 try{
  const a=await getAccount(request);if(!a)return reply({error:'Accedi alla piattaforma.'},401);
  const raw=await request.text();if(raw.length>2000)return reply({error:'Richiesta troppo grande.'},413);
  const p=z.object({currentPassword:password,password:password.refine(acceptablePassword)}).parse(JSON.parse(raw));
  if(!await reserveAttempts(request,'password-change:'+a.id))return reply({error:'Troppi tentativi. Riprova tra 15 minuti.'},429,{'Retry-After':'900'});
  const db=bookingDb();const current=await db.prepare("SELECT password_hash FROM accounts WHERE id=? AND auth_version=? AND status='active'").bind(a.id,a.auth_version).first<{password_hash:string}>();
  if(!current||!await verifyPassword(p.currentPassword,current.password_hash))return reply({error:'Password attuale non corretta.'},400);
  if(p.password===p.currentPassword)return reply({error:'Scegli una password diversa da quella attuale.'},400);
  const hash=await hashPassword(p.password),token=newSessionToken(),now=Date.now();
  await db.batch([
   db.prepare("UPDATE accounts SET password_hash=?,must_change_password=0,auth_version=auth_version+1,updated_at=? WHERE id=? AND auth_version=? AND password_hash=? AND status='active'").bind(hash,new Date(now).toISOString(),a.id,a.auth_version,current.password_hash),
   db.prepare('DELETE FROM account_sessions WHERE account_id=? AND EXISTS(SELECT 1 FROM accounts WHERE id=? AND password_hash=?)').bind(a.id,a.id,hash),
   db.prepare("INSERT INTO account_sessions(token_hash,account_id,auth_version,expires_at,created_at) SELECT ?,id,auth_version,?,? FROM accounts WHERE id=? AND password_hash=? AND status='active' AND must_change_password=0").bind(digest(token),now+sessionLifetime,now,a.id,hash),
  ]);
  if(!await db.prepare('SELECT token_hash FROM account_sessions WHERE token_hash=?').bind(digest(token)).first())return reply({error:'Account aggiornato durante l’operazione: ripeti l’accesso.'},409);
  return reply({ok:true,destination:a.role==='tutor'?'/gestione':'/studente'},200,{'Set-Cookie':cookie(request,token)});
 }catch(e){return reply({error:e instanceof z.ZodError||e instanceof SyntaxError?'Usa una password da 15 a 128 caratteri.':'Password non aggiornata. Riprova.'},e instanceof z.ZodError||e instanceof SyntaxError?400:503);}
}
