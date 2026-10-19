import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
async function compile(file,replace=s=>s){const source=replace(await readFile(new URL('../'+file,import.meta.url),'utf8')).replace(/import \{ensureCalendarAvailability\} from '@\/lib\/calendar\/availability';/g,'const ensureCalendarAvailability=async()=>{};').replace(/from ['"]@\/lib\/calendar\/([^'"]+\.mjs)['"]/g,(_,name)=>'from '+JSON.stringify(new URL('../lib/calendar/'+name,import.meta.url).href));return 'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText.replace(/(['"])@\/lib\/form-errors\.mjs\1/g,JSON.stringify(new URL('../lib/form-errors.mjs',import.meta.url).href))).toString('base64');}
const policy=await compile('lib/booking/cancellation-policy.ts'),dates=await compile('lib/lesson-plan.ts');
const {cancellationRefundPercent:percent,cancellationRefundAmount:amount}=await import(policy);
const requested='2026-10-25T09:00:00.000Z';
assert.equal(percent('2026-10-26T09:00:00.000Z',requested,'student'),100);
assert.equal(percent('2026-10-26T08:59:59.999Z',requested,'student'),50);
assert.throws(()=>percent('2026-10-25T10:00:00.000Z',requested,'tutor'));assert.equal(percent('2026-10-25T10:00:00.000Z',requested,'tutor',35),35);assert.equal(percent('2026-10-25T10:00:00.000Z',requested,'tutor',0),0);assert.throws(()=>percent('2026-10-25T10:00:00.000Z',requested,'tutor',101));assert.equal(percent('2026-10-26T09:00:00.000Z',requested,'student',0),100);assert.equal(amount(2000,35),700);assert.equal(amount(2000,0),0);assert.throws(()=>amount(2000,101));
assert.equal(amount(2000,50),1000);assert.equal(amount(1900,50),950);assert.equal(amount(1500,50),750);assert.equal(amount(0,50),0);
assert.throws(()=>percent('invalid',requested,'student'));assert.throws(()=>amount(-1,100));
const sql=new DatabaseSync(':memory:');
for(const file of (await readdir(new URL('../drizzle/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort())sql.exec(await readFile(new URL('../drizzle/'+file,import.meta.url),'utf8'));
function statement(query,args=[]){return {query,args,bind:(...a)=>statement(query,a),async first(){return sql.prepare(query).get(...args)||null;},async all(){return {results:sql.prepare(query).all(...args)};},async run(){return {meta:sql.prepare(query).run(...args)};}};}
const db={prepare:statement,async batch(statements){sql.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());sql.exec('COMMIT');return results;}catch(e){sql.exec('ROLLBACK');throw e;}}};
let owner=true,providerCalls=0;
globalThis.__cancel={bookingDb:()=>db,isRequestOwner:async()=>owner,stripe:async()=>{providerCalls++;throw Error('No money movement expected');}};
const route=await compile('app/api/gestione/appuntamenti/route.ts',s=>s.replace("import { isRequestOwner } from '@/lib/request-admin';",'const {isRequestOwner}=globalThis.__cancel;').replace("import { bookingDb,stripe } from '@/lib/booking/runtime';",'const {bookingDb,stripe}=globalThis.__cancel;').replace("import { reconcileLessonPayment } from '@/lib/booking/lesson-checkout';",'const reconcileLessonPayment=async()=>{};').replace("import { reconcileBooking } from '@/lib/booking/reconcile';",'const reconcileBooking=async()=>{};').replace("import { noticeStatements,dispatchAppointmentNotices } from '@/lib/notifications/appointments';",'const noticeStatements=async()=>[];const dispatchAppointmentNotices=async()=>({preview:true});').replace("'@/lib/booking/cancellation-policy'",JSON.stringify(policy)).replace("'@/lib/lesson-plan'",JSON.stringify(dates)).replace("'zod'",JSON.stringify(import.meta.resolve('zod'))));
const {POST}=await import(route);
const received=new Date(Date.now()-10000).toISOString();
function lesson(offset){const id=crypto.randomUUID(),start=new Date(Date.parse(received)+offset).toISOString();sql.prepare("INSERT INTO scheduled_lessons(id,series_id,name,email,subject,starts_at,ends_at,mode,notes,created_at,payment_method,payment_status) VALUES(?,?,'Anna','a@example.com','Matematica',?,?,'Lodi','',?,'cash','paid')").run(id,id,start,new Date(Date.parse(start)+3300000).toISOString(),received);return id;}
const payload=id=>({id,entity:'lesson',version:0,action:'cancel',cancelledBy:'student',requestedAt:received});
const send=(data,origin='https://site.example')=>POST(new Request('https://site.example/api/gestione/appuntamenti',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(data)}));
try{
 const boundary=lesson(86400000);let response=await send(payload(boundary));assert.equal(response.status,200);assert.equal((await response.json()).refundPercent,100);
 const near=lesson(86400000-1);response=await send(payload(near));assert.equal((await response.json()).refundPercent,50);
 const row=sql.prepare('SELECT * FROM scheduled_lessons WHERE id=?').get(near);assert.equal(row.cancellation_requested_at,received);assert.equal(row.cancelled_by,'student');assert.equal(row.status,'cancelled');
 response=await send(payload(near));assert.equal(response.status,409);assert.equal(sql.prepare('SELECT version FROM scheduled_lessons WHERE id=?').get(near).version,1);
 const tutor=lesson(3600000);for(const invalid of [-1,101,35.5]){const res=await send({...payload(tutor),cancelledBy:'tutor',refundPercent:invalid});assert.equal(res.status,400);}response=await send({...payload(tutor),cancelledBy:'tutor'});assert.equal(response.status,400);assert.equal(sql.prepare('SELECT status FROM scheduled_lessons WHERE id=?').get(tutor).status,'planned');response=await send({...payload(tutor),cancelledBy:'tutor',refundPercent:35});assert.equal((await response.json()).refundPercent,35);assert.equal(sql.prepare('SELECT cancellation_refund_percent FROM scheduled_lessons WHERE id=?').get(tutor).cancellation_refund_percent,35);const zero=lesson(2*3600000);response=await send({...payload(zero),cancelledBy:'tutor',refundPercent:0});assert.equal((await response.json()).refundPercent,0);
 const future=lesson(10*86400000);response=await send({...payload(future),requestedAt:new Date(Date.now()+86400000).toISOString()});assert.equal(response.status,400);assert.equal(sql.prepare('SELECT status FROM scheduled_lessons WHERE id=?').get(future).status,'planned');
 owner=false;assert.equal((await send(payload(future))).status,403);owner=true;assert.equal((await send(payload(future),'https://evil.example')).status,403);
 // A paid package quota is reimbursable, but must not also become a reusable lesson.
 const student=crypto.randomUUID(),pkg=crypto.randomUUID(),pay=crypto.randomUUID(),use=crypto.randomUUID(),covered=lesson(5*86400000);
 sql.prepare("UPDATE scheduled_lessons SET payment_status='awaiting',student_id=? WHERE id=?").run(student,covered);
 sql.prepare("INSERT INTO students(id,name,email,created_at,updated_at) VALUES(?,'Anna','a@example.com',?,?)").run(student,received,received);
 sql.prepare("INSERT INTO lesson_packages(id,student_id,amount,units,unit_amount,payment_method,status,paid_at,created_at) VALUES(?,?,9500,5,1900,'cash','active',?,?)").run(pkg,student,received,received);
 sql.prepare("INSERT INTO lesson_payments(id,lesson_id,access_token,student_id,name,email,amount,status,created_at) VALUES(?,?,?,?,'Anna','a@example.com',2000,'awaiting',?)").run(pay,covered,crypto.randomUUID(),student,received);
 sql.prepare('INSERT INTO package_uses(id,package_id,payment_id,created_at) VALUES(?,?,?,?)').run(use,pkg,pay,received);
 const version=sql.prepare('SELECT version FROM scheduled_lessons WHERE id=?').get(covered).version;
 response=await send({...payload(covered),version});assert.equal(response.status,200);assert.equal((await response.json()).refundPercent,100);
 assert.equal(sql.prepare('SELECT status FROM package_uses WHERE id=?').get(use).status,'applied');assert.equal(sql.prepare('SELECT amount FROM lesson_payments WHERE id=?').get(pay).amount,1900);
 assert.equal(providerCalls,0);
 // The public paid-booking route persists and sends only the methods enabled for this checkout.
 let paypal=true;const checkoutBodies=[];
 globalThis.__publicCheckout={bookingDb:()=>db,paymentConfig:()=>({ready:true,live:false,paypal,origin:'https://site.example'}),stripe:async(path,body)=>{assert.equal(path,'checkout/sessions');checkoutBodies.push(body);return {id:'cs_'+checkoutBodies.length,url:'https://checkout.stripe.com/c/pay/test',livemode:false};}};
 const checkoutRoute=await compile('app/api/booking/checkout/route.ts',s=>s.replace("import { resolveStudent } from '@/lib/students/resolve';",`const resolveStudent=async()=>({id:'${student}',notifications:0});`).replace("import { newNoticeStatement,dispatchAppointmentNotices } from '@/lib/notifications/appointments';",'const newNoticeStatement=()=>globalThis.__publicCheckout.bookingDb().prepare("SELECT 1");const dispatchAppointmentNotices=async()=>({preview:true});').replace("import { bookingDb,paymentConfig,stripe } from '@/lib/booking/runtime';",'const {bookingDb,paymentConfig,stripe}=globalThis.__publicCheckout;').replace("import { schoolSubjects,universitySubjects } from '@/lib/catalog';",'const schoolSubjects=["Matematica"];const universitySubjects=[];').replace("import {limitPublicRequest} from '@/lib/public-request-limit';",'const limitPublicRequest=async()=>null;').replace("'zod'",JSON.stringify(import.meta.resolve('zod'))));
 const {POST:createCheckout}=await import(checkoutRoute);
 for(const enabled of [true,false]){
  paypal=enabled;const slotId=crypto.randomUUID(),start=new Date(Date.now()+(enabled?20:22)*86400000).toISOString();
  sql.prepare("INSERT INTO booking_slots(id,starts_at,ends_at,mode) VALUES(?,?,?,'Online')").run(slotId,start,new Date(Date.parse(start)+3300000).toISOString());
  const res=await createCheckout(new Request('https://site.example/api/booking/checkout',{method:'POST',headers:{origin:'https://site.example','Content-Type':'application/json'},body:JSON.stringify({slotId,name:'Anna',email:'a@example.com',subject:'Matematica',consent:true})}));
  assert.equal(res.status,200);assert.equal(checkoutBodies.at(-1).get('payment_method_types[0]'),'card');assert.equal(checkoutBodies.at(-1).get('payment_method_types[1]'),enabled?'paypal':null);
  assert.equal(sql.prepare('SELECT checkout_paypal FROM bookings WHERE slot_id=?').get(slotId).checkout_paypal,enabled?1:0);
 }
 delete globalThis.__publicCheckout;
 console.log('PASS: exact 24h boundary, received-time snapshot, 100/50 refunds on actual cents, tutor cancellation, authorization, stale-write guard, future rejection, no double package credit and no money movement.');
}finally{sql.close();delete globalThis.__cancel;}
