import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
const db=new DatabaseSync(':memory:');
for(const f of (await readdir(new URL('../drizzle/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort())db.exec(await readFile(new URL('../drizzle/'+f,import.meta.url),'utf8'));
const binding={prepare(sql){const bind=(...args)=>({async first(){return db.prepare(sql).get(...args)||null;},async run(){return {meta:db.prepare(sql).run(...args)};}});return {bind,...bind()};}};
let settle=false,failCreate=false;const logs=[];let unique=0;const created=new Map();const sessions=new Map();
const stripe=async(path,body,key)=>{
 logs.push({path,body:body?.toString(),key});
 if(path==='checkout/sessions'){
  if(failCreate)throw Error('provider timeout');
  if(!created.has(key)){const session={id:'renewed-'+(++unique),url:'https://checkout.stripe.com/c/pay/'+unique,livemode:false};created.set(key,session);}
  return created.get(key);
 }
 const id=path.split('/')[2];const previous=sessions.get(id);assert.ok(previous,path);return previous;
};
globalThis.__checkout={bookingDb:()=>binding,paymentConfig:()=>({ready:true,origin:'https://site.example'}),stripe,
 reconcileBooking:async(id)=>{if(settle)db.prepare("UPDATE bookings SET status='confirmed' WHERE id=?").run(id);}};
async function compile(path,replace){const source=replace(await readFile(new URL('../lib/booking/'+path+'.ts',import.meta.url),'utf8'));return 'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText).toString('base64');}
const policy=await compile('payment-policy',s=>s);
const {openBookingCheckout}=await import(await compile('booking-checkout',s=>s.replace("import { bookingDb, paymentConfig, stripe } from './runtime';",'const {bookingDb,paymentConfig,stripe}=globalThis.__checkout;').replace("import { reconcileBooking } from './reconcile';",'const {reconcileBooking}=globalThis.__checkout;').replace("'./payment-policy'",JSON.stringify(policy))));
const starts=new Date(Date.now()+4*3600000).toISOString();const id=crypto.randomUUID();const slot=crypto.randomUUID();
db.prepare("INSERT INTO booking_slots(id,starts_at,ends_at,mode,status) VALUES(?,?,?,'Online','held')").run(slot,starts,starts);
db.prepare("INSERT INTO bookings(id,slot_id,access_token,name,email,subject,status,stripe_session,created_at) VALUES(?,?,'personal-token','Student','student@example.com','Matematica','pending','old',?)").run(id,slot,new Date().toISOString());
sessions.set('old',{id:'old',status:'open',payment_status:'unpaid',url:'https://checkout.stripe.com/c/pay/old',livemode:false,amount_total:2000,currency:'eur',metadata:{booking_id:id}});
const originalNow=Date.now;
try{
 await assert.rejects(()=>openBookingCheckout(id,'wrong'),e=>e.status===404);assert.equal(logs.length,0);
 assert.equal(await openBookingCheckout(id,'personal-token'),'https://checkout.stripe.com/c/pay/old');assert.equal(unique,0);
 settle=true;await assert.rejects(()=>openBookingCheckout(id,'personal-token'),e=>e.status===409);assert.equal(unique,0);settle=false;db.prepare("UPDATE bookings SET status='pending' WHERE id=?").run(id);
 sessions.get('old').id='mismatched-session';await assert.rejects(()=>openBookingCheckout(id,'personal-token'),e=>e.status===409);sessions.get('old').id='old';
 sessions.get('old').livemode=true;await assert.rejects(()=>openBookingCheckout(id,'personal-token'),e=>e.status===409);sessions.get('old').livemode=false;
 sessions.get('old').metadata.booking_id='another';await assert.rejects(()=>openBookingCheckout(id,'personal-token'),e=>e.status===409);sessions.get('old').metadata.booking_id=id;
 sessions.get('old').status='expired';failCreate=true;await assert.rejects(()=>openBookingCheckout(id,'personal-token'),/provider timeout/);
 const first=logs.filter(l=>l.path==='checkout/sessions').at(-1);const expiry=db.prepare('SELECT checkout_expires_at FROM bookings WHERE id=?').get(id).checkout_expires_at;assert.ok(expiry);
 Date.now=()=>originalNow()+2*60000;failCreate=false;
 await openBookingCheckout(id,'personal-token');const second=logs.filter(l=>l.path==='checkout/sessions').at(-1);assert.deepEqual(second,first);assert.equal(unique,1);assert.equal(db.prepare('SELECT checkout_expires_at FROM bookings WHERE id=?').get(id).checkout_expires_at,null);
 db.prepare("UPDATE bookings SET stripe_session='old',status='awaiting_payment' WHERE id=?").run(id);
 const concurrent=await Promise.allSettled([openBookingCheckout(id,'personal-token'),openBookingCheckout(id,'personal-token')]);assert.ok(concurrent.some(r=>r.status==='fulfilled'));assert.equal(unique,1);
 db.prepare("UPDATE bookings SET status='payment_review' WHERE id=?").run(id);const before=logs.length;await assert.rejects(()=>openBookingCheckout(id,'personal-token'),e=>e.status===409);assert.equal(logs.length,before);
 console.log('PASS: checkout ownership, fresh post-reconciliation state, test-only sessions, provider mismatch rejection, persisted retries across clock changes and concurrent renewal.');
}finally{Date.now=originalNow;db.close();delete globalThis.__checkout;}
