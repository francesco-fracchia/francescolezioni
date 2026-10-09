import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
const db=new DatabaseSync(':memory:');
for(const f of (await readdir(new URL('../drizzle/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort())db.exec(await readFile(new URL('../drizzle/'+f,import.meta.url),'utf8'));
const binding={prepare(sql){const bind=(...args)=>({async first(){return db.prepare(sql).get(...args)||null;},async all(){return {results:db.prepare(sql).all(...args)};},async run(){return {meta:db.prepare(sql).run(...args)};}});return {bind,...bind()};}};
let user=null,owner=false,ready=true,offline=false,closed=false;const checks=[],opens=[];
class BookingCheckoutError extends Error{constructor(message,status=409){super(message);this.status=status;}}
globalThis.__account={bookingDb:()=>binding,paymentConfig:()=>({ready}),getAccount:async()=>user?{id:user.userId,must_change_password:0,auth_version:0}:null,isRequestOwner:async()=>owner,
 reconcileLessonPayment:async(id)=>{checks.push({kind:'lesson',id});if(offline)throw Error('provider unavailable');},
 reconcileBooking:async(id)=>{checks.push({kind:'booking',id});if(offline)throw Error('provider unavailable');},
 openLessonCheckout:async(id,token)=>{if(closed)throw Error('CLOSED');opens.push({kind:'lesson',id,token});return 'https://checkout.stripe.com/c/pay/own';},
 openBookingCheckout:async(id,token)=>{if(closed)throw new BookingCheckoutError('Stato cambiato.');opens.push({kind:'booking',id,token});return 'https://checkout.stripe.com/c/pay/booking';},BookingCheckoutError};
async function compile(path,replace=s=>s){let source=replace(await readFile(new URL('../'+path,import.meta.url),'utf8'));source=source.replace(/import \{ ([^}]+) \} from '@\/lib\/booking\/runtime';/g,(_,names)=>`const {${names}}=globalThis.__account;`).replace("import { getAccount } from '@/lib/auth/session';",'const {getAccount}=globalThis.__account;').replace("import { isRequestOwner } from '@/lib/request-admin';",'const {isRequestOwner}=globalThis.__account;').replace("from 'zod'",'from '+JSON.stringify(import.meta.resolve('zod')));return 'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText).toString('base64');}
const access=await compile('lib/learning/access.ts');const policy=await compile('lib/booking/payment-policy.ts');
const payments=await import(await compile('app/api/studente/pagamenti/route.ts',s=>s.replace("from '@/lib/learning/access'",'from '+JSON.stringify(access)).replace("from '@/lib/booking/payment-policy'",'from '+JSON.stringify(policy)).replace("import { openLessonCheckout, reconcileLessonPayment } from '@/lib/booking/lesson-checkout';",'const {openLessonCheckout,reconcileLessonPayment}=globalThis.__account;').replace("import { openBookingCheckout, BookingCheckoutError } from '@/lib/booking/booking-checkout';",'const {openBookingCheckout,BookingCheckoutError}=globalThis.__account;').replace("import { reconcileBooking } from '@/lib/booking/reconcile';",'const {reconcileBooking}=globalThis.__account;')));
const [a,b,c,lesson,own,other,booking,slot]=Array.from({length:8},()=>crypto.randomUUID());const now=new Date().toISOString();const starts=new Date(Date.now()+4*3600000).toISOString();
for(const [id,name] of [[a,'Anna'],[b,'Bruno'],[c,'Carla']])db.prepare('INSERT INTO students(id,name,email,notes,created_at,updated_at) VALUES(?,?,?,\'SECRET INTERNAL\',?,?)').run(id,name,id+'@example.com',now,now);
db.prepare("INSERT INTO accounts(id,name,email,role,password_hash,must_change_password,created_at,updated_at) VALUES('parent','Parent','parent@example.com','guardian','test-only',0,?,?)").run(now,now);
for(const id of [a,b])db.prepare("INSERT INTO account_student_access(account_id,student_id,created_at) VALUES('parent',?,?)").run(id,now);
db.prepare("INSERT INTO scheduled_lessons(id,series_id,name,email,subject,starts_at,ends_at,mode,notes,status,created_at,payment_method,payment_status) VALUES(?,?,'PRIVATE GROUP','secret@example.com','Analisi 1',?,?,'Online','SECRET INTERNAL','planned',?,'online','awaiting')").run(lesson,lesson,starts,new Date(Date.parse(starts)+55*60000).toISOString(),now);
for(const [id,sid,token] of [[own,a,'own-token'],[other,c,'other-token']])db.prepare("INSERT INTO lesson_payments(id,lesson_id,access_token,student_id,name,email,amount,status,created_at) VALUES(?,?,?,?,'PRIVATE NAME','secret@example.com',1500,'awaiting',?)").run(id,lesson,token,sid,now);
db.prepare("INSERT INTO booking_slots(id,starts_at,ends_at,mode,status) VALUES(?,?,?,'Online','held')").run(slot,new Date(Date.parse(starts)+2*3600000).toISOString(),new Date(Date.parse(starts)+2*3600000+55*60000).toISOString());
db.prepare("INSERT INTO bookings(id,slot_id,student_id,access_token,name,email,subject,status,stripe_session,created_at) VALUES(?,?,?,'booking-token','Bruno','bruno@example.com','Matematica','pending','session',?)").run(booking,slot,b,now);
const base='https://site.example';const target=(kind='lesson',sid=a,id=own)=>({studentId:sid,kind,id});
const get=(p=target(),preview)=>new Request(base+'/api/studente/pagamenti?'+new URLSearchParams({...p,...(preview?{anteprima:preview}:{})}));
const post=(p=target(),origin=base,preview)=>new Request(base+'/api/studente/pagamenti'+(preview?'?anteprima='+preview:''),{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Authorization:'Bearer forged'},body:JSON.stringify(p)});
try{
 assert.equal((await payments.GET(get())).status,401);assert.equal(opens.length,0);
 user={userId:'parent',email:'parent@example.com'};
 let r=await payments.GET(get());let d=await r.json();assert.equal(r.status,200);assert.equal(d.amount,1500);assert.equal(d.canPay,true);assert.equal(r.headers.get('Cache-Control'),'private, no-store');
 for(const secret of ['own-token','other-token','SECRET INTERNAL','PRIVATE GROUP','secret@example.com','PRIVATE NAME'])assert.ok(!JSON.stringify(d).includes(secret),secret);
 assert.equal((await payments.GET(get(target('lesson',c,other)))).status,403);assert.equal((await payments.GET(get(target('lesson',a,other)))).status,404);assert.equal((await payments.GET(get(target('lesson',b,own)))).status,404);
 assert.equal((await payments.POST(post(target(),'https://evil.example'))).status,403);assert.equal((await payments.POST(post(target('lesson',a,other)))).status,404);assert.equal(opens.length,0);
 assert.equal((await payments.POST(post())).status,200);assert.deepEqual(opens.at(-1),{kind:'lesson',id:own,token:'own-token'});
 r=await payments.GET(get(target('booking',b,booking)));d=await r.json();assert.equal(d.amount,2000);assert.equal(d.canPay,true);assert.equal((await payments.POST(post(target('booking',b,booking)))).status,200);assert.deepEqual(opens.at(-1),{kind:'booking',id:booking,token:'booking-token'});
 assert.equal((await payments.GET(get(target('booking',a,booking)))).status,404);
 owner=true;const checksBefore=checks.length;d=await (await payments.GET(get(target(),a))).json();assert.equal(d.preview,true);assert.equal(d.canPay,false);assert.equal(checks.length,checksBefore);assert.equal((await payments.POST(post(target(),base,a))).status,403);owner=false;
 offline=true;d=await (await payments.GET(get())).json();assert.equal(d.canPay,false);assert.ok(d.warning);assert.equal(db.prepare('SELECT status FROM lesson_payments WHERE id=?').get(own).status,'awaiting');offline=false;
 db.prepare("UPDATE lesson_payments SET status='paid' WHERE id=?").run(own);assert.equal((await payments.POST(post())).status,409);db.prepare("UPDATE lesson_payments SET status='awaiting' WHERE id=?").run(own);
 db.prepare("UPDATE scheduled_lessons SET payment_status='payment_review' WHERE id=?").run(lesson);d=await (await payments.GET(get())).json();assert.equal(d.requiresReview,true);assert.equal(d.canPay,false);assert.equal((await payments.POST(post())).status,409);db.prepare("UPDATE scheduled_lessons SET payment_status='awaiting',payment_method='cash' WHERE id=?").run(lesson);assert.equal((await payments.POST(post())).status,409);
 db.prepare("UPDATE scheduled_lessons SET payment_method='online',starts_at=?,ends_at=? WHERE id=?").run(new Date(Date.now()+45*60000).toISOString(),new Date(Date.now()+100*60000).toISOString(),lesson);assert.equal((await payments.POST(post())).status,409);db.prepare('UPDATE scheduled_lessons SET starts_at=?,ends_at=? WHERE id=?').run(starts,new Date(Date.parse(starts)+55*60000).toISOString(),lesson);
 closed=true;assert.equal((await payments.POST(post())).status,409);assert.equal((await payments.POST(post(target('booking',b,booking)))).status,409);closed=false;
 ready=false;d=await (await payments.GET(get())).json();assert.equal(d.canPay,false);assert.equal((await payments.POST(post())).status,409);ready=true;
 db.prepare("UPDATE account_student_access SET status='revoked' WHERE student_id=?").run(a);assert.equal((await payments.GET(get())).status,403);assert.equal((await payments.POST(post())).status,403);
 db.prepare("UPDATE students SET status='archived' WHERE id=?").run(b);assert.equal((await payments.GET(get(target('booking',b,booking)))).status,403);
 assert.equal((await payments.GET(new Request(base+'/api/studente/pagamenti?id=invalid'))).status,400);
 console.log('PASS: authenticated individual/group balances, multi-child guardian, no bearer-token disclosure, authorized test checkout, review/deadline/cash safeguards, readonly preview, provider outage, revocation and CSRF.');
}finally{delete globalThis.__account;db.close();}
