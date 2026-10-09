import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
const sql=new DatabaseSync(':memory:');
for(const f of (await readdir(new URL('../drizzle/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort())sql.exec(await readFile(new URL('../drizzle/'+f,import.meta.url),'utf8'));
let owner=false,loseRun=false;
const db={prepare(query){const bind=(...args)=>({async first(){return sql.prepare(query).get(...args)||null;},async all(){return {results:sql.prepare(query).all(...args)};},async run(){const r=sql.prepare(query).run(...args);if(loseRun){loseRun=false;throw Error('Lost response');}return {meta:{changes:Number(r.changes)}};}});return {query,args:[],bind(...args){return {...bind(...args),query,args};},...bind()};},async batch(statements){sql.exec('BEGIN');try{const results=statements.map(s=>({meta:{changes:Number(sql.prepare(s.query).run(...s.args).changes)}}));sql.exec('COMMIT');return results;}catch(e){sql.exec('ROLLBACK');throw e;}}};
globalThis.__meet={bookingDb:()=>db,isRequestOwner:async()=>owner,getAccount:async()=>null,stripe:async()=>{throw Error('Unexpected provider call');},reconcileLessonPayment:async()=>{throw Error('Unexpected reconciliation');},reconcileBooking:async()=>{throw Error('Unexpected reconciliation');},noticeStatements:async()=>[],dispatchAppointmentNotices:async()=>({preview:true})};
async function compile(file,replace=s=>s){const source=replace(await readFile(new URL('../'+file,import.meta.url),'utf8')).replace(/import \{\s*bookingDb\s*\} from '@\/lib\/booking\/runtime';/g,'const {bookingDb}=globalThis.__meet;').replace(/import \{\s*isRequestOwner\s*\} from '@\/lib\/request-admin';/g,'const {isRequestOwner}=globalThis.__meet;').replace(/import \{\s*getAccount\s*\} from '@\/lib\/auth\/session';/g,'const {getAccount}=globalThis.__meet;').replace("from 'zod'",'from '+JSON.stringify(import.meta.resolve('zod')));return 'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText).toString('base64');}
const access=await compile('lib/learning/access.ts'),calendar=await compile('lib/lesson-calendar-export.ts');
const {meetUrl,lessonCalendar}=await import(calendar);
const admin=await import(await compile('app/api/gestione/video/route.ts',s=>s.replace("from '@/lib/learning/access'",'from '+JSON.stringify(access)).replace("from '@/lib/lesson-calendar-export'",'from '+JSON.stringify(calendar))));
const dates=await compile('lib/lesson-plan.ts');
const appointments=await import(await compile('app/api/gestione/appuntamenti/route.ts',s=>s.replace("import { bookingDb,stripe } from '@/lib/booking/runtime';",'const {bookingDb,stripe}=globalThis.__meet;').replace("import { reconcileLessonPayment } from '@/lib/booking/lesson-checkout';",'const {reconcileLessonPayment}=globalThis.__meet;').replace("import { reconcileBooking } from '@/lib/booking/reconcile';",'const {reconcileBooking}=globalThis.__meet;').replace("import { noticeStatements,dispatchAppointmentNotices } from '@/lib/notifications/appointments';",'const {noticeStatements,dispatchAppointmentNotices}=globalThis.__meet;').replace("from '@/lib/lesson-plan'",'from '+JSON.stringify(dates))));
const base='https://site.example',request=(body,origin=base)=>new Request(base+'/api/gestione/video',{method:'PATCH',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
const future=Date.now()+10*86400000,now=new Date().toISOString();let offset=0;
function appointment(entity='lesson',{mode='Online',status=entity==='lesson'?'planned':'confirmed',ended=false}={}){const id=crypto.randomUUID(),start=new Date(future+offset++*7200000-(ended?20*86400000:0)).toISOString(),end=new Date(Date.parse(start)+3300000).toISOString();
 if(entity==='lesson')sql.prepare("INSERT INTO scheduled_lessons(id,series_id,name,email,subject,starts_at,ends_at,mode,notes,status,created_at,payment_method) VALUES(?,?,'Anna','anna@example.invalid','Matematica',?,?,?,'PRIVATE NOTE',?,?,'cash')").run(id,id,start,end,mode,status,now);
 else {const slot=crypto.randomUUID();sql.prepare("INSERT INTO booking_slots(id,starts_at,ends_at,mode,status) VALUES(?,?,?,?,'available')").run(slot,start,end,mode);sql.prepare("INSERT INTO bookings(id,slot_id,access_token,name,email,subject,status,created_at) VALUES(?,?,'PRIVATE TOKEN','Anna','anna@example.invalid','Informatica',?,?)").run(id,slot,status,now);}
 return {id,entity,version:0,url:'https://meet.google.com/abc-defg-hij'};
}
async function patch(p,status=200){const r=await admin.PATCH(request(p));assert.equal(r.status,status,await r.clone().text());assert.equal(r.headers.get('Cache-Control'),'private, no-store');return r;}
try{
 assert.equal(meetUrl(' HTTPS://MEET.GOOGLE.COM/ABC-DEFG-HIJ?authuser=1#extra '),'https://meet.google.com/abc-defg-hij');
 for(const value of ['javascript:alert(1)','http://meet.google.com/abc-defg-hij','https://meet.google.com.evil.invalid/abc-defg-hij','https://evil.invalid/abc-defg-hij','https://user:pass@meet.google.com/abc-defg-hij','https://meet.google.com:444/abc-defg-hij','https://meet.google.com/lookup/secret','https://meet.google.com/abc-defg-hij/extra','https://meet.google.com/abc-defg-hij%0aURL:evil',null,{},''])assert.equal(meetUrl(value),null,String(value));
 const l=appointment();await patch(l,403);owner=true;assert.equal((await admin.PATCH(request(l,'https://evil.invalid'))).status,403);
 await patch({...l,url:'https://evil.invalid/abc-defg-hij'},400);await patch({...l,url:'x'.repeat(700)},413);
 assert.equal((await admin.PATCH(new Request(base+'/api/gestione/video',{method:'PATCH',headers:{Origin:base},body:'{'}))).status,400);
 loseRun=true;await patch({...l,url:l.url+'?authuser=1'},503);await patch(l);await patch(l);
 const row=()=>sql.prepare('SELECT version,video_url,notes,payment_method,operation_id FROM scheduled_lessons WHERE id=?').get(l.id);
 assert.equal(row().version,1);assert.equal(row().video_url,l.url);assert.equal(row().notes,'PRIVATE NOTE');assert.equal(row().payment_method,'cash');assert.equal(row().operation_id,null);
 await patch({...l,url:'https://meet.google.com/mno-pqrs-tuv'},409);
 const results=await Promise.all(['https://meet.google.com/mno-pqrs-tuv','https://meet.google.com/xxx-yyyy-zzz'].map(url=>admin.PATCH(request({...l,version:1,url}))));assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);assert.equal(row().version,2);
 await patch({...l,version:2,url:''});assert.equal(row().video_url,null);await patch({...l,version:2,url:''});assert.equal(row().version,3);
 const b=appointment('booking');await patch(b);assert.equal(sql.prepare('SELECT video_url FROM bookings WHERE id=?').get(b.id).video_url,b.url);await patch({...b,version:1,url:''});
 for(const p of [appointment('lesson',{mode:'Lodi'}),appointment('lesson',{status:'cancelled'}),appointment('lesson',{ended:true}),appointment('booking',{status:'pending'}),appointment('booking',{mode:'Lodi'}),appointment('booking',{ended:true}),{...l,id:crypto.randomUUID()}])await patch(p,409);
 const event={id:l.id,kind:'lesson',mode:'Online',subject:'Matematica\nATTENDEE:evil@example.invalid',status:'planned',starts_at:new Date(future).toISOString(),ends_at:new Date(future+3300000).toISOString(),video_url:l.url+'?authuser=1'};
 const exported=lessonCalendar(event,'Online').replace(/\r\n /g,'');assert.ok(exported.includes('\r\nURL:'+l.url+'\r\n'));assert.ok(!exported.includes('authuser'));assert.ok(!exported.includes('\r\nATTENDEE:'));assert.ok(!exported.includes('ORGANIZER:'));
 for(const changed of [{mode:'Lodi'},{video_url:'https://evil.invalid/abc-defg-hij'}])assert.ok(!lessonCalendar({...event,...changed},'Lodi').includes('\r\nURL:'));
 assert.throws(()=>lessonCalendar({...event,status:'cancelled'},'Online'));
 // Moving an appointment retains its link online, clears it in person and respects the version saved by the link editor.
 const moveDate=new Date(Date.now()+45*86400000).toISOString().slice(0,10);
 for(const entity of ['lesson','booking']){const p=appointment(entity);await patch(p);if(entity==='booking')sql.prepare("UPDATE booking_slots SET status='booked',booking_id=? WHERE id=(SELECT slot_id FROM bookings WHERE id=?)").run(p.id,p.id);
  const move=(version,mode,time)=>appointments.POST(new Request(base+'/api/gestione/appuntamenti',{method:'POST',headers:{Origin:base},body:JSON.stringify({entity,id:p.id,version,action:'modify',date:moveDate,time,mode})}));
  assert.equal((await move(0,'Online','10:00')).status,409);
  const hour=entity==='lesson'?'10:00':'14:00';assert.equal((await move(1,'Online',hour)).status,200);
  const read=()=>sql.prepare('SELECT video_url,version FROM '+(entity==='lesson'?'scheduled_lessons':'bookings')+' WHERE id=?').get(p.id);
  assert.equal(read().video_url,p.url);assert.equal(read().version,2);
  assert.equal((await move(2,'Lodi',hour)).status,200);assert.equal(read().video_url,null);assert.equal(read().version,3);
 }
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM notifications').get().n,0);assert.equal(sql.prepare('SELECT COUNT(*) n FROM lesson_payments').get().n,0);
 console.log('PASS: Meet validation, tutor-only writes, CSRF, active appointments, canonical links, lost-response retry, concurrent versions, removal, ICS escaping and no payment/email effects.');
}finally{delete globalThis.__meet;sql.close();}
