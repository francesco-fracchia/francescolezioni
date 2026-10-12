import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHmac } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import ts from 'typescript';
import { validStripeSignature } from '../lib/booking/signature.ts';

test('Stripe webhook authenticates before writes, reconciles confirmed provider data and tolerates retries',async()=>{
 const sql=new DatabaseSync(':memory:');for(const file of (await readdir(new URL('../drizzle/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort())sql.exec(await readFile(new URL('../drizzle/'+file,import.meta.url),'utf8'));
 let writes=0,reads=0,live=false,providerDown=false;const sessions=new Map(),calls=[];
 const db={prepare(query){const bound=(...args)=>({async first(){reads++;return sql.prepare(query).get(...args)||null;},async run(){writes++;const r=sql.prepare(query).run(...args);return {meta:{changes:Number(r.changes)}};}});return {bind:bound,...bound()};}};
 const secret='test-only-webhook-signature';
 const shared={bookingDb:()=>db,paymentConfig:()=>({live,webhook:secret}),validStripeSignature,stripe:async path=>{if(providerDown)throw Error('Provider unavailable');return sessions.get(path.split('/').at(-1));},reconcileLessonPayment:async id=>calls.push(['lesson',id]),reconcileBooking:async id=>calls.push(['booking',id])};
 globalThis.__webhookTest=shared;
 const compile=async(file,replace)=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(replace(await readFile(new URL('../'+file,import.meta.url),'utf8')),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText).toString('base64');
 const purchaseModule=await compile('lib/packages/checkout.ts',s=>s.replace("import {bookingDb,paymentConfig,stripe} from '@/lib/booking/runtime';",'const {bookingDb,paymentConfig,stripe}=globalThis.__webhookTest;').replace("import {LearningError} from '@/lib/learning/access';",'class LearningError extends Error {}'));
 const source=await compile('app/api/stripe/webhook/route.ts',s=>s.replace("from '@/lib/packages/checkout'",'from '+JSON.stringify(purchaseModule)).replace("import { reconcileLessonPayment } from '@/lib/booking/lesson-checkout';",'const {reconcileLessonPayment}=globalThis.__webhookTest;').replace("import { reconcileBooking } from '@/lib/booking/reconcile';",'const {reconcileBooking}=globalThis.__webhookTest;').replace("import { bookingDb,paymentConfig } from '@/lib/booking/runtime';",'const {bookingDb,paymentConfig}=globalThis.__webhookTest;').replace("import { validStripeSignature } from '@/lib/booking/signature';",'const {validStripeSignature}=globalThis.__webhookTest;'));
 const {POST}=await import(source),now=new Date().toISOString(),student=crypto.randomUUID(),packageId=crypto.randomUUID();
 const deliver=(event,{signed=true,at=Math.floor(Date.now()/1000),tamper=false}={})=>{const raw=JSON.stringify(event),sig=createHmac('sha256',secret).update(at+'.'+raw).digest('hex');return POST(new Request('https://site.example/api/stripe/webhook',{method:'POST',headers:signed?{'stripe-signature':`t=${at},v1=${sig}`}:{},body:raw+(tamper?' ':'')}));};
 const event=(session,type='checkout.session.completed',livemode=false)=>({id:'evt_test',type,livemode,data:{object:session}});
 try {
  sql.prepare("INSERT INTO students(id,name,email,created_at,updated_at) VALUES(?,'Test','test@example.test',?,?)").run(student,now,now);
  sql.prepare("INSERT INTO lesson_packages(id,student_id,amount,units,unit_amount,payment_method,status,created_at,live_mode,checkout_expires_at) VALUES(?,?,9500,5,1900,'online','awaiting',?,0,?)").run(packageId,student,now,2000000000);
  const session={id:'cs_test_valid',expires_at:2000000000,metadata:{package_id:packageId},livemode:false,amount_total:9500,currency:'eur',payment_status:'unpaid'};sessions.set(session.id,session);
  for(const options of [{signed:false},{tamper:true},{at:Math.floor(Date.now()/1000)-301}])assert.equal((await deliver(event(session),options)).status,400);
  assert.equal(writes,0);assert.equal(reads,0);
  assert.equal((await deliver(event(session,'checkout.session.completed',true))).status,200);assert.equal(writes,0);
  assert.equal((await deliver(event(session,'customer.created'))).status,200);assert.equal(writes,0);
  assert.equal((await deliver(event(session))).status,200);assert.equal(sql.prepare('SELECT status FROM lesson_packages WHERE id=?').get(packageId).status,'awaiting');
  // A signed completion is not enough: paid status, total, currency and
  // ownership are re-read from Stripe before crediting the package.
  session.payment_status='paid';session.amount_total=1;assert.equal((await deliver(event(session))).status,503);assert.equal(sql.prepare('SELECT status FROM lesson_packages WHERE id=?').get(packageId).status,'awaiting');
  session.amount_total=9500;providerDown=true;assert.equal((await deliver(event(session))).status,503);providerDown=false;
  assert.equal((await deliver(event(session,'checkout.session.async_payment_succeeded'))).status,200);const paid=sql.prepare('SELECT status,paid_at,stripe_session FROM lesson_packages WHERE id=?').get(packageId);assert.equal(paid.status,'active');assert.equal(paid.stripe_session,session.id);
  assert.equal((await deliver(event(session))).status,200);assert.equal(sql.prepare('SELECT paid_at FROM lesson_packages WHERE id=?').get(packageId).paid_at,paid.paid_at);
  assert.equal((await deliver(event({...session,id:'cs_test_foreign'}))).status,200);assert.equal(sql.prepare('SELECT stripe_session FROM lesson_packages WHERE id=?').get(packageId).stripe_session,session.id);
  // Unrelated events and metadata cannot leak into another payment branch.
  assert.equal((await deliver(event({id:'cs_test_other',metadata:{}},'checkout.session.expired'))).status,200);assert.deepEqual(calls,[]);
  live=true;const before=writes;assert.equal((await deliver(event(session))).status,200);assert.equal(writes,before);
 } finally {delete globalThis.__webhookTest;sql.close();}
});
