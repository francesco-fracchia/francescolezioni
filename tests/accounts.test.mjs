import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
const sql=new DatabaseSync(':memory:');for(const file of (await readdir(new URL('../drizzle/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort())sql.exec(await readFile(new URL('../drizzle/'+file,import.meta.url),'utf8'));
let currentHeaders=new Headers(),platformOwner=false,beforeBatch=null;
const db={prepare(query){const bind=(...args)=>({async first(){return sql.prepare(query).get(...args)||null;},async all(){return {results:sql.prepare(query).all(...args)};},async run(){const r=sql.prepare(query).run(...args);return {meta:{changes:Number(r.changes)}};},query,args});return {bind,...bind()};},async batch(statements){if(beforeBatch&&statements.some(s=>s.query.startsWith('UPDATE accounts SET password_hash'))){const f=beforeBatch;beforeBatch=null;f();}sql.exec('BEGIN');try{const results=[];for(const s of statements){const r=sql.prepare(s.query).run(...s.args);results.push({meta:{changes:Number(r.changes)}});}sql.exec('COMMIT');return results;}catch(e){sql.exec('ROLLBACK');throw e;}}};
globalThis.__auth={bookingDb:()=>db,headers:async()=>currentHeaders,getChatGPTUser:async()=>platformOwner?{userId:'private-owner',email:'owner@example.com',fullName:'Owner'}:null,env:{REQUEST_OWNER_EMAIL:'owner@example.com'}};
async function compile(path,replace=s=>s){let s=replace(await readFile(new URL('../'+path,import.meta.url),'utf8')).replace("import { headers } from 'next/headers';",'const {headers}=globalThis.__auth;').replace("import { bookingDb } from '@/lib/booking/runtime';",'const {bookingDb}=globalThis.__auth;').replace("import { getChatGPTUser } from '@/app/chatgpt-auth';",'const {getChatGPTUser}=globalThis.__auth;').replace("import { env } from '@/lib/runtime-env';",'const {env}=globalThis.__auth;').replace("from 'zod'",'from '+JSON.stringify(import.meta.resolve('zod')));return 'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText).toString('base64');}
const passwordsUrl=await compile('lib/auth/passwords.ts'),sessionUrl=await compile('lib/auth/session.ts');const passwordLib=await import(passwordsUrl),session=await import(sessionUrl);
const ownerUrl=await compile('lib/request-admin.ts',s=>s.replace("from '@/lib/auth/session'",'from '+JSON.stringify(sessionUrl)));const owner=await import(ownerUrl);
const replace=s=>s.replace("from '@/lib/auth/session'",'from '+JSON.stringify(sessionUrl)).replace("from '@/lib/auth/passwords'",'from '+JSON.stringify(passwordsUrl)).replace("from '@/lib/request-admin'",'from '+JSON.stringify(ownerUrl));
const login=await import(await compile('app/api/accesso/route.ts',replace)),admin=await import(await compile('app/api/gestione/account/route.ts',replace)),learning=await import(await compile('lib/learning/access.ts',replace));
const base='https://site.example',now=new Date().toISOString(),[a,b,c]=Array.from({length:3},()=>crypto.randomUUID());
for(const [id,name] of [[a,'Anna'],[b,'Bruno'],[c,'Carla']])sql.prepare('INSERT INTO students(id,name,email,notes,created_at,updated_at) VALUES(?,?,?,\'PRIVATE NOTE\',?,?)').run(id,name,id+'@example.com',now,now);
const req=(method='GET',body,cookie='',origin=base)=>new Request(base+'/api/accesso',{method,headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
async function adminCall(body){const r=req('POST',body);currentHeaders=r.headers;return admin.POST(r);}
const cookieOf=r=>r.headers.get('Set-Cookie')?.split(';')[0];const newPassword='Una frase lunga per il collaudo 2026';
try{
 assert.equal(await owner.isRequestOwner(),false);assert.equal((await admin.GET()).status,403);platformOwner=true;
 assert.equal((await admin.POST(req('POST',{},'', 'https://evil.example'))).status,403);
 const id=crypto.randomUUID(),input={kind:'create',id,name:'Parent',email:'parent@example.com',role:'guardian',studentId:a};
 let r=await adminCall(input);assert.equal(r.status,201,await r.clone().text());const created=await r.json();assert.ok(created.temporaryPassword.length>=32);assert.ok(!JSON.stringify(await (await admin.GET()).json()).includes('scrypt:'));
 const stored=sql.prepare('SELECT password_hash FROM accounts WHERE id=?').get(id).password_hash;assert.notEqual(stored,created.temporaryPassword);assert.equal(await passwordLib.verifyPassword(created.temporaryPassword,stored),true);assert.equal(await passwordLib.verifyPassword('wrong',stored),false);
 assert.equal((await adminCall({...input,id:crypto.randomUUID()})).status,409);const retried=await (await adminCall(input)).json();assert.equal(retried.credentialsUnavailable,true);assert.ok(!retried.temporaryPassword);
 await adminCall({kind:'link',id,studentId:b});
 platformOwner=false;currentHeaders=new Headers();assert.equal((await login.POST(req('POST',{email:'parent@example.com',password:'wrong'}))).status,401);assert.equal((await login.POST(req('POST',{email:'parent@example.com',password:created.temporaryPassword},'','https://evil.example'))).status,403);
 r=await login.POST(req('POST',{email:'parent@example.com',password:created.temporaryPassword,destination:'https://evil.example'}));assert.equal(r.status,200);let cookie=cookieOf(r);assert.ok(r.headers.get('Set-Cookie').includes('HttpOnly; SameSite=Strict'));assert.ok(r.headers.get('Set-Cookie').includes('Secure'));assert.equal((await r.json()).destination,'/account');
 assert.equal(sql.prepare('SELECT token_hash FROM account_sessions').get().token_hash.includes(cookie.split('=')[1]),false);
 await assert.rejects(()=>learning.studentScope(req('GET',undefined,cookie)),e=>e.status===403);currentHeaders=req('GET',undefined,cookie).headers;assert.equal(await owner.isRequestOwner(),false);
 assert.equal((await login.PATCH(req('PATCH',{currentPassword:created.temporaryPassword,password:'short'},cookie))).status,400);
 r=await login.PATCH(req('PATCH',{currentPassword:created.temporaryPassword,password:newPassword},cookie));assert.equal(r.status,200,await r.clone().text());const oldCookie=cookie;cookie=cookieOf(r);assert.notEqual(cookie,oldCookie);assert.equal(await session.getAccount(req('GET',undefined,oldCookie)),null);
 let scope=await learning.studentScope(req('GET',undefined,cookie));assert.equal(scope.students.length,2);assert.ok(scope.students.some(s=>s.id===a));assert.equal(await session.getAccount(req('GET',undefined,cookie+'; '+cookie)),null);
 assert.equal((await login.POST(req('POST',{email:'parent@example.com',password:newPassword,destination:'//evil.example'}))).status,200);
 assert.equal(session.safeDestination('/gestione?test=1'),'/gestione?test=1');assert.equal(session.safeDestination('/\\evil.example'),null);assert.equal(session.safeDestination('/accesso'),null);assert.equal(session.safeDestination('/acquista?studente=123'),'/acquista?studente=123');assert.equal(session.safeDestination('/acquista/evil'),null);
 // Child revocation takes effect on the next request without waiting for expiry.
 platformOwner=true;currentHeaders=new Headers();await adminCall({kind:'revoke',id,studentId:a});platformOwner=false;scope=await learning.studentScope(req('GET',undefined,cookie));assert.equal(scope.students.length,1);assert.equal(scope.students[0].id,b);
 platformOwner=true;await adminCall({kind:'status',id,status:'suspended'});platformOwner=false;assert.equal(await session.getAccount(req('GET',undefined,cookie)),null);assert.equal((await login.POST(req('POST',{email:'parent@example.com',password:newPassword}))).status,401);
 platformOwner=true;await adminCall({kind:'status',id,status:'active'});platformOwner=false;assert.equal(await session.getAccount(req('GET',undefined,cookie)),null);
 // A reset revokes sessions and a password change must not win over a later reset.
 platformOwner=true;currentHeaders=new Headers();r=await adminCall({kind:'reset',id});let reset=await r.json();platformOwner=false;r=await login.POST(req('POST',{email:'parent@example.com',password:reset.temporaryPassword}));assert.equal(r.status,200);cookie=cookieOf(r);
 beforeBatch=()=>sql.prepare('UPDATE accounts SET auth_version=auth_version+1 WHERE id=?').run(id);
 r=await login.PATCH(req('PATCH',{currentPassword:reset.temporaryPassword,password:'Una password successiva abbastanza lunga'},cookie));assert.equal(r.status,409);assert.equal(await session.getAccount(req('GET',undefined,cookie)),null);
 sql.prepare('DELETE FROM auth_attempts').run();
 // Durable limits cover missing emails too; no user-existence detail in failures.
 for(let i=0;i<8;i++)assert.equal((await login.POST(req('POST',{email:'missing@example.com',password:'wrong'}))).status,401);
 assert.equal((await login.POST(req('POST',{email:'missing@example.com',password:'wrong'}))).status,429);
 platformOwner=true;currentHeaders=new Headers();const studentId=crypto.randomUUID();r=await adminCall({kind:'create',id:studentId,name:'Student',email:'student@example.com',role:'student',studentId:a});assert.equal(r.status,201);assert.equal((await adminCall({kind:'link',id:studentId,studentId:b})).status,409);
 // First tutor account may only be bootstrapped from the private owner identity.
 r=await adminCall({kind:'tutor',id:crypto.randomUUID()});assert.equal(r.status,201);const tutor=await r.json();const tutorId=tutor.id;assert.equal((await adminCall({kind:'tutor',id:crypto.randomUUID()})).status,409);platformOwner=false;r=await login.POST(req('POST',{email:'owner@example.com',password:tutor.temporaryPassword}));const tutorCookie=cookieOf(r);currentHeaders=req('GET',undefined,tutorCookie).headers;assert.equal(await owner.isRequestOwner(),false);
 r=await login.PATCH(req('PATCH',{currentPassword:tutor.temporaryPassword,password:newPassword},tutorCookie));assert.equal(r.status,200);currentHeaders=req('GET',undefined,cookieOf(r)).headers;assert.equal(await owner.isRequestOwner(),true);assert.equal((await admin.GET()).status,200);
 assert.equal((await admin.POST(req('POST',{kind:'status',id:tutorId,status:'suspended'}))).status,400);
 r=await login.DELETE(req('DELETE',undefined,cookieOf(r)));assert.equal(r.status,200);assert.ok(r.headers.get('Set-Cookie').includes('Max-Age=0'));
 assert.equal(sql.prepare('SELECT count(*) n FROM notifications').get().n,0);
 console.log('PASS: runtime scrypt, password hashes, private-owner bootstrap, account creation, forced change, cookie protections, own/guardian grants, tutor isolation, revocation, suspension, reset races, session rotation and durable login limits.');
}finally{delete globalThis.__auth;sql.close();}
