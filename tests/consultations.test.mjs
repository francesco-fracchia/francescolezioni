import assert from 'node:assert/strict';
import { readFile,readdir } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import ts from 'typescript';
const sql=new DatabaseSync(':memory:');
for(const f of (await readdir(new URL('../drizzle/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort())sql.exec(await readFile(new URL('../drizzle/'+f,import.meta.url),'utf8'));
let owner=false,loseReply=false;
const db={prepare(query){const bind=(...args)=>({query,args,async first(){return sql.prepare(query).get(...args)||null;},async all(){return {results:sql.prepare(query).all(...args)};},async run(){return {meta:{changes:Number(sql.prepare(query).run(...args).changes)}};}});return {bind,...bind()};},async batch(statements){sql.exec('BEGIN');try{const results=statements.map(s=>({meta:{changes:Number(sql.prepare(s.query).run(...s.args).changes)}}));sql.exec('COMMIT');if(loseReply){loseReply=false;throw Error('Simulated committed write with lost reply');}return results;}catch(e){if(sql.isTransaction)sql.exec('ROLLBACK');throw e;}}};
globalThis.__consultations={bookingDb:()=>db,isRequestOwner:async()=>owner};
async function compile(path,replace=s=>s){let s=replace(await readFile(new URL('../'+path,import.meta.url),'utf8')).replace("import { bookingDb } from '@/lib/booking/runtime';",'const {bookingDb}=globalThis.__consultations;').replace("import { isRequestOwner } from '@/lib/request-admin';",'const {isRequestOwner}=globalThis.__consultations;').replace(/import \{\s*validateReferral\s*\} from '@\/lib\/referrals\/server';/g,"const validateReferral=async code=>{if(code)throw Error('Codice invito non disponibile.');};").replace("import {limitPublicRequest} from '@/lib/public-request-limit';",'const limitPublicRequest=async()=>null;').replace("from 'zod'",'from '+JSON.stringify(import.meta.resolve('zod')));return 'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText).toString('base64');}
const plan=await compile('lib/lesson-plan.ts');
const helpers=await compile('lib/consultations.ts',s=>s.replace("from '@/lib/lesson-plan'",'from '+JSON.stringify(plan)));
const recurrence=await compile('lib/consultation-recurrence.ts',s=>s.replace("from '@/lib/consultations'",'from '+JSON.stringify(helpers)));
const catalog=await compile('lib/catalog.ts');
const replace=s=>s.replace("from '@/lib/consultation-recurrence'",'from '+JSON.stringify(recurrence)).replace("from '@/lib/consultations'",'from '+JSON.stringify(helpers)).replace("from '@/lib/catalog'",'from '+JSON.stringify(catalog));
const publicApi=await import(await compile('app/api/incontri/route.ts',replace));
const admin=await import(await compile('app/api/gestione/incontri/route.ts',replace));
const daily=await import(await compile('app/api/gestione/incontri/ricorrenza/route.ts',replace));
const {ensureDailyConsultations}=await import(recurrence);
const {consultationWindow}=await import(helpers);
const origin='https://site.example';
const req=(method='GET',body,path='/api/incontri',site=origin)=>new Request(origin+path,{method,headers:{Origin:site,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
const date=new Date(Date.now()+7*86400000).toISOString().slice(0,10);
const window={id:crypto.randomUUID(),date,from:'16:00',to:'17:00',mode:'Entrambe'};
const booking=(slot,changes={})=>({id:crypto.randomUUID(),slotId:slot.id,name:'Studente di prova',email:'test@example.com',phone:'',subject:'Matematica',studentType:'Superiori',message:'Esercizi sulle equazioni',mode:'Online',consent:true,website:'',...changes});
const slotAt=(time,mode='Entrambe')=>{const start=consultationWindow(date,time,`${String(Number(time.slice(0,2))+1).padStart(2,'0')}:${time.slice(3)}`)[0];const id=crypto.randomUUID();sql.prepare('INSERT INTO consultation_slots(id,starts_at,ends_at,mode,created_at) VALUES(?,?,?,?,?)').run(id,start.starts_at,start.ends_at,mode,new Date().toISOString());return {id,...start,mode};};
function paidSlot(slot,status='available'){const id=crypto.randomUUID();sql.prepare('INSERT INTO booking_slots(id,starts_at,ends_at,mode,status) VALUES(?,?,?,\'Online\',?)').run(id,slot.starts_at,new Date(Date.parse(slot.starts_at)+55*60000).toISOString(),status);return id;}
function lesson(slot){return ()=>sql.prepare("INSERT INTO scheduled_lessons(id,series_id,name,email,subject,starts_at,ends_at,mode,notes,status,created_at) VALUES(?,?,'Tutor fixture','t@example.com','Matematica',?,?,'Online','','planned',?)").run(crypto.randomUUID(),crypto.randomUUID(),slot.starts_at,new Date(Date.parse(slot.starts_at)+55*60000).toISOString(),new Date().toISOString());}
try{
 assert.equal((await admin.GET()).status,403);assert.equal((await admin.POST(req('POST',window))).status,403);owner=true;
 assert.equal((await admin.POST(req('POST',window,'/api/gestione/incontri','https://evil.example'))).status,403);
 assert.equal((await admin.POST(req('POST',{...window,to:'16:10'}))).status,400);
 let r=await admin.POST(req('POST',window));assert.equal(r.status,201,await r.clone().text());assert.equal((await r.json()).created,3);
 assert.equal((await (await admin.POST(req('POST',window))).json()).created,0);
 let data=await (await publicApi.GET()).json();assert.equal(data.slots.length,3);assert.ok(data.slots.every(s=>/^[a-f0-9-]{36}$/.test(s.id)));assert.ok(!JSON.stringify(data).includes('example.com'));
 const [first,second]=data.slots;const payload=booking(first,{mode:'Lodi',assessment:{test:'Matematica superiori',answers:[0,0,0,0,0],score:100}});
 assert.equal((await publicApi.POST(req('POST',payload,'/api/incontri','https://evil.example'))).status,403);
 assert.equal((await publicApi.POST(req('POST',{...payload,consent:false}))).status,400);
 r=await publicApi.POST(req('POST',payload));assert.equal(r.status,201,await r.clone().text());assert.equal((await r.json()).appointment.mode,'Lodi');
 assert.equal(sql.prepare('SELECT status FROM requests WHERE id=?').get(payload.id).status,'confirmed');assert.equal(JSON.parse(sql.prepare('SELECT assessment FROM requests WHERE id=?').get(payload.id).assessment).score,20);
 assert.equal((await publicApi.POST(req('POST',payload))).status,200);assert.equal(sql.prepare('SELECT count(*) n FROM consultations').get().n,1);
 assert.equal((await publicApi.POST(req('POST',{...payload,name:'Changed'}))).status,409);
 assert.equal((await publicApi.POST(req('POST',booking(first)))).status,409);
 assert.equal((await publicApi.POST(req('POST',booking(second)))).status,201); // Exact five-minute gap allowed.
 assert.equal((await admin.PATCH(req('PATCH',{id:first.id,action:'block'}))).status,409);
 assert.throws(lesson(first),/LESSON_CONFLICT/);
 const paid=paidSlot(first);assert.throws(()=>sql.prepare("UPDATE booking_slots SET status='held',booking_id='paid-test' WHERE id=?").run(paid),/LESSON_CONFLICT/);assert.equal(sql.prepare('SELECT status FROM booking_slots WHERE id=?').get(paid).status,'available');
 // Moving an existing paid hold or a manual lesson into a free appointment is blocked.
 const later=slotAt('18:00');const hold=paidSlot(later,'held');assert.throws(()=>sql.prepare('UPDATE booking_slots SET starts_at=?,ends_at=? WHERE id=?').run(first.starts_at,first.ends_at,hold),/LESSON_CONFLICT/);
 const manual=slotAt('20:00');lesson(manual)();const lessonId=sql.prepare('SELECT id FROM scheduled_lessons').get().id;assert.throws(()=>sql.prepare('UPDATE scheduled_lessons SET starts_at=?,ends_at=? WHERE id=?').run(first.starts_at,first.ends_at,lessonId),/LESSON_CONFLICT/);
 const blocked=slotAt('21:00');paidSlot(blocked,'blocked');assert.equal((await publicApi.POST(req('POST',booking(blocked)))).status,409);
 const online=slotAt('22:00','Online');assert.equal((await publicApi.POST(req('POST',booking(online,{mode:'Lodi'})))).status,409);
 // Reservation race: both visitors saw the same available slot.
 const race=slotAt('10:00');const outcomes=await Promise.all([publicApi.POST(req('POST',booking(race))),publicApi.POST(req('POST',booking(race)))]);assert.deepEqual(outcomes.map(r=>r.status).sort(),[201,409]);
 const lost=slotAt('11:00'),retry=booking(lost);loseReply=true;assert.equal((await publicApi.POST(req('POST',retry))).status,503);assert.equal((await publicApi.POST(req('POST',retry))).status,200);assert.equal(sql.prepare('SELECT count(*) n FROM consultations WHERE slot_id=?').get(lost.id).n,1);
 r=await admin.PATCH(req('PATCH',{id:payload.id,action:'cancel',version:0}));assert.equal(r.status,200,await r.clone().text());assert.equal(sql.prepare('SELECT status FROM requests WHERE id=?').get(payload.id).status,'closed');assert.equal((await admin.PATCH(req('PATCH',{id:payload.id,action:'cancel',version:0}))).status,409);
 assert.equal((await publicApi.POST(req('POST',payload))).status,200);assert.equal((await (await publicApi.POST(req('POST',payload))).json()).appointment.status,'cancelled');
 assert.equal((await publicApi.POST(req('POST',booking(first)))).status,201);
 const blockedFree=slotAt('12:00');assert.equal((await admin.PATCH(req('PATCH',{id:blockedFree.id,action:'block'}))).status,200);assert.equal((await publicApi.POST(req('POST',booking(blockedFree)))).status,409);assert.equal((await admin.PATCH(req('PATCH',{id:blockedFree.id,action:'unblock'}))).status,200);
 owner=false;assert.equal((await admin.PATCH(req('PATCH',{id:blockedFree.id,action:'block'}))).status,403);
 data=await (await publicApi.GET()).json();assert.ok(!data.slots.some(s=>s.id===first.id));assert.ok(data.slots.every(s=>Object.keys(s).sort().join(',')==='ends_at,id,mode,starts_at'));
 const old={...slotAt('13:00')};sql.prepare('UPDATE consultation_slots SET starts_at=?,ends_at=? WHERE id=?').run(new Date(Date.now()+60000).toISOString(),new Date(Date.now()+16*60000).toISOString(),old.id);assert.equal((await publicApi.POST(req('POST',booking(old)))).status,409);
 assert.throws(()=>consultationWindow('2027-03-28','02:00','03:00'),/non valido/);
 assert.equal(sql.prepare('SELECT count(*) n FROM notifications').get().n,0);assert.equal(sql.prepare('SELECT count(*) n FROM lesson_payments').get().n,0);
 // Daily recurrence: guarded configuration, retry, weekends, pauses and rolling extension.
 const ruleBody={startDate:date,from:'10:00',to:'18:30',mode:'Entrambe'};
 assert.equal((await daily.GET()).status,403);assert.equal((await daily.POST(req('POST',ruleBody))).status,403);owner=true;
 assert.equal((await daily.POST(req('POST',ruleBody,'/api/gestione/incontri/ricorrenza','https://evil.example'))).status,403);
 r=await daily.POST(req('POST',ruleBody));assert.equal(r.status,200,await r.clone().text());let rule=(await r.json()).rule;
 const count=sql.prepare("SELECT count(*) n FROM consultation_slots WHERE recurrence_id='daily'").get().n;assert.ok(count>850&&count<=875);
 assert.equal((await daily.POST(req('POST',ruleBody))).status,200);assert.equal(sql.prepare("SELECT count(*) n FROM consultation_slots WHERE recurrence_id='daily'").get().n,count);
 assert.equal((await daily.POST(req('POST',{...ruleBody,from:'11:00'}))).status,409);
 data=await (await publicApi.GET()).json();assert.ok(data.slots.length>200);assert.equal(data.truncated,false);
 const generated=sql.prepare("SELECT * FROM consultation_slots WHERE recurrence_id='daily' ORDER BY starts_at LIMIT 1").get();
 assert.equal((await daily.PATCH(req('PATCH',{active:false,version:rule.version}))).status,200);
 assert.equal((await publicApi.POST(req('POST',booking(generated)))).status,409);
 data=await (await publicApi.GET()).json();assert.ok(!data.slots.some(s=>s.id===generated.id));
 assert.equal((await daily.PATCH(req('PATCH',{active:false,version:rule.version}))).status,200); // Same mutation after lost reply.
 rule=(await (await daily.GET()).json()).rule;assert.equal((await daily.PATCH(req('PATCH',{active:true,version:rule.version}))).status,200);
 assert.equal((await admin.PATCH(req('PATCH',{id:generated.id,action:'block'}))).status,200);
 const trueNow=Date.now;try{Date.now=()=>trueNow()+20*86400000;await ensureDailyConsultations(db);assert.ok(sql.prepare("SELECT count(*) n FROM consultation_slots WHERE recurrence_id='daily'").get().n>count);assert.equal(sql.prepare('SELECT status FROM consultation_slots WHERE id=?').get(generated.id).status,'blocked');}finally{Date.now=trueNow;}
 // Rome time stays 10:00 across the March daylight-saving boundary.
 sql.prepare("UPDATE consultation_recurrence SET start_date='2027-03-20',generated_until=NULL").run();await ensureDailyConsultations(db);
 for(const day of ['2027-03-27','2027-03-28','2027-03-29']){const slots=sql.prepare("SELECT * FROM consultation_slots WHERE recurrence_id='daily' AND starts_at>=? AND starts_at<? ORDER BY starts_at").all(day+'T00:00:00Z',day+'T23:59:59Z');assert.equal(slots.length,25);assert.equal(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Rome',hour:'2-digit',minute:'2-digit'}).format(new Date(slots[0].starts_at)),'10:00');assert.equal(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Rome',hour:'2-digit',minute:'2-digit'}).format(new Date(slots.at(-1).ends_at)),'18:15');}
 assert.equal(sql.prepare('SELECT count(*) n FROM notifications').get().n,0);
 console.log('PASS: owner availability, Rome/DST, public privacy, direct free confirmation, recalculated assessment, exact buffer, paid/manual cross-conflicts, simultaneous reservations, lost-reply retry, cancellation, blocked/mode/lead-time checks; no payments or email.');
}finally{sql.close();delete globalThis.__consultations;}
