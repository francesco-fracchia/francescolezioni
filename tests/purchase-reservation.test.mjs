import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
const sql=new DatabaseSync(':memory:');
for(const f of (await readdir(new URL('../drizzle/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort())sql.exec(await readFile(new URL('../drizzle/'+f,import.meta.url),'utf8'));
function statement(query,args=[]){return {bind:(...a)=>statement(query,a),async first(){return sql.prepare(query).get(...args)||null;},async all(){return {results:sql.prepare(query).all(...args)};},async run(){return {meta:sql.prepare(query).run(...args)};}};}
const db={prepare:statement,async batch(statements){sql.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());sql.exec('COMMIT');return results;}catch(e){sql.exec('ROLLBACK');throw e;}}};
let live=false,ready=true,fail=false;const created=new Map(),sessions=new Map(),calls=[];
const config=()=>({ready,live,origin:'https://site.example'});
async function stripe(path,body,key){calls.push({path,body:body?.toString(),key});if(path==='checkout/sessions'){
 if(fail)throw Error('timeout');if(!created.has(key)){const s={id:'cs_'+created.size,url:'https://checkout.stripe.com/pay/'+created.size,livemode:live,status:'open',payment_status:'unpaid',currency:'eur',amount_total:Number(body.get('line_items[0][price_data][unit_amount]')),metadata:{package_id:body.get('metadata[package_id]')}};created.set(key,s);sessions.set(s.id,s);}return created.get(key);
 }return sessions.get(path.split('/')[2]);}
globalThis.__purchase={bookingDb:()=>db,paymentConfig:config,stripe};
async function compile(file,replace=s=>s){const source=replace(await readFile(new URL('../'+file,import.meta.url),'utf8'));return 'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText).toString('base64');}
const access=await compile('lib/learning/access.ts',s=>s.replace(/^import.*$/gm,''));
const deps=s=>s.replace(/import \{.*\} from '@\/lib\/booking\/runtime';/,'const {bookingDb,paymentConfig,stripe}=globalThis.__purchase;').replace("'@/lib/learning/access'",JSON.stringify(access));
const {openPurchase,reconcilePurchase}=await import(await compile('lib/packages/checkout.ts',deps));
const {reservePurchasedLesson,availableLessonSlotsSql}=await import(await compile('lib/packages/reservation.ts',deps));
const now=new Date().toISOString(),student=crypto.randomUUID(),other=crypto.randomUUID();
for(const id of [student,other])sql.prepare("INSERT INTO students(id,name,email,created_at,updated_at) VALUES(?,?,'student@example.com',?,?)").run(id,id,now,now);
function slot(days=10){const id=crypto.randomUUID(),start=new Date(Date.now()+days*86400000).toISOString();sql.prepare("INSERT INTO booking_slots(id,starts_at,ends_at,mode,status) VALUES(?,?,?,'Online','available')").run(id,start,new Date(Date.parse(start)+3300000).toISOString());return id;}
try{
 const id=crypto.randomUUID();ready=false;await assert.rejects(()=>openPurchase(id,student,5),e=>e.status===503);assert.equal(created.size,0);ready=true;
 fail=true;await assert.rejects(()=>openPurchase(id,student,5),/timeout/);const attempt=calls.at(-1);fail=false;await openPurchase(id,student,5);assert.deepEqual(calls.at(-1),attempt);assert.equal(created.size,1);
 await assert.rejects(()=>openPurchase(id,other,5),e=>e.status===409);await assert.rejects(()=>openPurchase(id,student,1),e=>e.status===409);
 const s=sessions.values().next().value;s.payment_status='paid';s.amount_total=1;await assert.rejects(()=>reconcilePurchase(id),e=>e.status===409);assert.equal(sql.prepare('SELECT status FROM lesson_packages WHERE id=?').get(id).status,'awaiting');s.amount_total=9500;s.livemode=true;await assert.rejects(()=>reconcilePurchase(id));s.livemode=false;
 await reconcilePurchase(id);await reconcilePurchase(id);assert.equal(sql.prepare('SELECT status FROM lesson_packages WHERE id=?').get(id).status,'active');
 const target=slot(),request={id:crypto.randomUUID(),studentId:student,packageId:id,slotId:target,subject:'Informatica'};
 await assert.rejects(()=>reservePurchasedLesson({...request,studentId:other}),e=>e.status===409);
 await reservePurchasedLesson(request);await reservePurchasedLesson(request);assert.equal(sql.prepare('SELECT COUNT(*) n FROM package_uses WHERE package_id=?').get(id).n,1);assert.equal(sql.prepare('SELECT status FROM booking_slots WHERE id=?').get(target).status,'scheduled');assert.equal(sql.prepare('SELECT payment_status FROM scheduled_lessons WHERE id=?').get(request.id).payment_status,'paid');
 const covered=sql.prepare('SELECT amount,status FROM lesson_payments WHERE lesson_id=?').get(request.id);assert.equal(covered.amount,1900);assert.equal(covered.status,'paid');
 await assert.rejects(()=>reservePurchasedLesson({...request,id:crypto.randomUUID()}),e=>e.status===409);
 const conflictSlot=slot(12),start=sql.prepare('SELECT starts_at FROM booking_slots WHERE id=?').get(conflictSlot).starts_at;
 sql.prepare("INSERT INTO consultation_slots(id,starts_at,ends_at,mode,created_at) VALUES('consult-slot',?,?,'Online',?)").run(start,new Date(Date.parse(start)+900000).toISOString(),now);
 sql.prepare("INSERT INTO consultations(id,slot_id,request_id,name,email,subject,student_type,mode,starts_at,ends_at,payload_hash,created_at) VALUES('consult','consult-slot','request','Test','test@example.com','Matematica','Superiori','Online',?,?,'hash',?)").run(start,new Date(Date.parse(start)+900000).toISOString(),now);
 assert.ok(!(await db.prepare(availableLessonSlotsSql).bind(now).all()).results.some(s=>s.id===conflictSlot));await assert.rejects(()=>reservePurchasedLesson({...request,id:crypto.randomUUID(),slotId:conflictSlot}),/LESSON_CONFLICT/);
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM package_uses WHERE package_id=?').get(id).n,1);
 // A live single lesson is credited once and cannot be used twice.
 live=true;const single=crypto.randomUUID();await openPurchase(single,student,1);const singleSession=sessions.get(sql.prepare('SELECT stripe_session FROM lesson_packages WHERE id=?').get(single).stripe_session);singleSession.payment_status='paid';await reconcilePurchase(single);const singleRequest={...request,id:crypto.randomUUID(),packageId:single,slotId:slot(14)};await reservePurchasedLesson(singleRequest);assert.equal(sql.prepare('SELECT amount FROM lesson_payments WHERE lesson_id=?').get(singleRequest.id).amount,2000);await assert.rejects(()=>reservePurchasedLesson({...singleRequest,id:crypto.randomUUID(),slotId:slot(16)}),e=>e.status===409);
 sql.prepare("UPDATE scheduled_lessons SET status='cancelled' WHERE id=?").run(singleRequest.id);assert.equal(sql.prepare("SELECT COUNT(*) n FROM package_uses WHERE package_id=? AND status='applied'").get(single).n,0);
 console.log('PASS: purchase amount/mode/ownership, timeout idempotency, verified credits, booking conflict rollback, no duplicate consumption, single lesson and returned credit.');
}finally{sql.close();delete globalThis.__purchase;}
