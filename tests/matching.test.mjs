import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
const sql=new DatabaseSync(':memory:');
for(const f of (await readdir(new URL('../drizzle/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort())sql.exec(await readFile(new URL('../drizzle/'+f,import.meta.url),'utf8'));
let owner=false,beforeBatch=null,failBatch=false;
const db={prepare(query){const bind=(...args)=>({async first(){return sql.prepare(query).get(...args)||null;},async all(){return {results:sql.prepare(query).all(...args)};},async run(){const r=sql.prepare(query).run(...args);return {meta:{changes:Number(r.changes)}};},query,args});return {bind,...bind()};},async batch(statements){if(beforeBatch){const f=beforeBatch;beforeBatch=null;f();}sql.exec('BEGIN');try{const out=[];for(const [i,s] of statements.entries()){if(failBatch&&i===2)throw Error('Simulated failure');const r=sql.prepare(s.query).run(...s.args);out.push({meta:{changes:Number(r.changes)}});}sql.exec('COMMIT');return out;}catch(e){sql.exec('ROLLBACK');throw e;}}};
globalThis.__matching={isRequestOwner:async()=>owner,bookingDb:()=>db};
async function compile(path,replace=s=>s){const source=replace(await readFile(new URL('../'+path,import.meta.url),'utf8')).replace("import { isRequestOwner } from '@/lib/request-admin';",'const {isRequestOwner}=globalThis.__matching;').replace("import { bookingDb } from '@/lib/booking/runtime';",'const {bookingDb}=globalThis.__matching;').replace("from 'zod'",'from '+JSON.stringify(import.meta.resolve('zod')));return 'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText).toString('base64');}
const requestTypes=await compile('lib/requests/types.ts');const compareUrl=await compile('lib/matching/compare.ts',s=>s.replace("from '@/lib/requests/types'",'from '+JSON.stringify(requestTypes)));const compare=await import(compareUrl);const route=await import(await compile('app/api/gestione/abbinamenti/route.ts',s=>s.replace("from '@/lib/matching/compare'",'from '+JSON.stringify(compareUrl))));
const base='https://site.example';const checks={program:true,level:true,goal:true,availability:true,mode:true};
const req=(method='GET',body,origin=base)=>new Request(base+'/api/gestione/abbinamenti',{method,headers:{Origin:origin,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
const details={groupRequest:'matching',studentType:'Università',groupSize:'Fino a 4 studenti',mode:'Entrambe',program:'Limiti e derivate',level:'Devo consolidare',goal:'Esame',availability:'Giovedì 17–19',deadline:'2026-11-10'};
function fixture(count=4){return Array.from({length:count},(_,i)=>{const id=crypto.randomUUID(),studentId=crypto.randomUUID(),now=new Date().toISOString();sql.prepare("INSERT INTO students(id,name,email,notes,created_at,updated_at) VALUES(?,?,?,'PRIVATE NOTE',?,?)").run(studentId,'Studente '+id.slice(0,6),id+'@example.com',now,now);sql.prepare("INSERT INTO requests(id,kind,name,email,subject,details,status,student_id,created_at,consent_version) VALUES(?,'group',?,?,'Analisi 1',?,'new',?,?,'test')").run(id,'Referente '+i,id+'@example.com',JSON.stringify(details),studentId,now);return {id,studentId};});}
async function data(){const r=await route.GET(req());assert.equal(r.status,200);assert.equal(r.headers.get('Cache-Control'),'private, no-store');return r.json();}
async function body(ids,extra={}){const d=await data();const rows=ids.map(id=>d.candidates.find(r=>r.id===id)).sort((a,b)=>a.id.localeCompare(b.id));return {id:crypto.randomUUID(),name:'Gruppo Analisi',mode:'Online',availability:'Giovedì 17–18',notes:'Verificato dal tutor',requestIds:ids,expected:JSON.stringify(rows),checks,...extra};}
async function save(ids,extra={}){const p=await body(ids,extra);const r=await route.POST(req('POST',p));assert.equal(r.status,201,await r.clone().text());return p;}
const approve=id=>route.PATCH(req('PATCH',{id,action:'approve',checks}));
try{
 assert.equal((await route.GET(req())).status,403);assert.equal((await route.POST(req('POST',{}))).status,403);owner=true;
 assert.equal((await route.POST(req('POST',{},'https://evil.example'))).status,403);assert.equal((await route.PATCH(req('PATCH',{},'https://evil.example'))).status,403);
 const f=fixture();const ids=f.map(r=>r.id);let d=await data();assert.equal(d.candidates.length,4);assert.ok(!JSON.stringify(d).includes('PRIVATE NOTE'));
 let pair=d.candidates.slice(0,2);assert.ok(compare.compareCandidates(...pair).every(s=>s.status==='same'));pair[1]={...pair[1],details:JSON.stringify({...details,level:'Da valutare insieme',availability:'Lunedì 9–12'})};const signals=compare.compareCandidates(...pair);assert.equal(signals.find(s=>s.key==='level').status,'missing');assert.equal(signals.find(s=>s.key==='availability').status,'review');
 // Persisted drafts do not create groups, appointments, payments or messages.
 const p=await save(ids.slice(0,2),{checks:{...checks,program:false}});assert.equal(sql.prepare('SELECT count(*) n FROM student_groups').get().n,0);
 assert.equal((await route.POST(req('POST',p))).status,200);assert.equal((await route.POST(req('POST',{...p,name:'Changed'}))).status,409);
 assert.equal((await route.PATCH(req('PATCH',{id:p.id,action:'approve',checks:{...checks,program:false}}))).status,400);
 // Stale details and an archival arriving immediately before the atomic write.
 sql.prepare('UPDATE requests SET details=? WHERE id=?').run(JSON.stringify({...details,availability:'Lunedì'}),ids[0]);assert.equal((await approve(p.id)).status,409);sql.prepare('UPDATE requests SET details=? WHERE id=?').run(JSON.stringify(details),ids[0]);
 beforeBatch=()=>sql.prepare("UPDATE students SET status='archived' WHERE id=?").run(f[0].studentId);assert.equal((await approve(p.id)).status,409);assert.equal(sql.prepare('SELECT status FROM matching_proposals WHERE id=?').get(p.id).status,'draft');assert.equal(sql.prepare('SELECT count(*) n FROM student_groups').get().n,0);sql.prepare("UPDATE students SET status='active' WHERE id=?").run(f[0].studentId);
 // Batch failure leaves no partly created group or request links.
 failBatch=true;assert.equal((await approve(p.id)).status,400);failBatch=false;assert.equal(sql.prepare('SELECT status FROM matching_proposals WHERE id=?').get(p.id).status,'draft');assert.equal(sql.prepare('SELECT count(*) n FROM group_members').get().n,0);
 const overlapping=await save([ids[0],ids[2]]);const results=await Promise.all([approve(p.id),approve(overlapping.id)]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);assert.equal(sql.prepare('SELECT count(*) n FROM student_groups').get().n,1);assert.equal(sql.prepare('SELECT count(*) n FROM group_members').get().n,2);
 assert.equal(sql.prepare('SELECT group_id,status FROM requests WHERE id=?').get(ids[0]).status,'matching');
 assert.equal((await approve(p.id)).status,200);assert.equal((await route.PATCH(req('PATCH',{id:p.id,action:'dismiss'}))).status,409);
 sql.prepare('DELETE FROM group_members WHERE group_id=? AND student_id=?').run(p.id,f[0].studentId);assert.equal((await approve(p.id)).status,200);assert.equal(sql.prepare('SELECT count(*) n FROM group_members WHERE group_id=?').get(p.id).n,1); // Retry never rewrites subsequent tutor edits.
 for(const table of ['scheduled_lessons','lesson_payments','notifications','bookings'])assert.equal(sql.prepare('SELECT count(*) n FROM '+table).get().n,0);
 const g=fixture(3);let b=await body(g.map(r=>r.id));sql.prepare('UPDATE requests SET details=? WHERE id=?').run(JSON.stringify({...details,groupSize:'Coppia'}),g[0].id);b=await body(g.map(r=>r.id));assert.equal((await route.POST(req('POST',b))).status,409);
 sql.prepare('UPDATE requests SET details=? WHERE id=?').run(JSON.stringify({...details,studentType:'Superiori'}),g[0].id);assert.equal((await route.POST(req('POST',await body(g.slice(0,2).map(r=>r.id))))).status,409);
 sql.prepare('UPDATE requests SET details=? WHERE id=?').run(JSON.stringify({...details,mode:'Lodi'}),g[0].id);assert.equal((await route.POST(req('POST',await body(g.slice(0,2).map(r=>r.id))))).status,409);
 sql.prepare('UPDATE requests SET details=? WHERE id=?').run(JSON.stringify(details),g[0].id);sql.prepare('UPDATE requests SET student_id=? WHERE id=?').run(g[0].studentId,g[1].id);assert.equal((await route.POST(req('POST',await body(g.slice(0,2).map(r=>r.id))))).status,409);sql.prepare('UPDATE requests SET student_id=? WHERE id=?').run(g[1].studentId,g[1].id);
 const draft=await save(g.slice(0,2).map(r=>r.id));assert.equal((await route.PATCH(req('PATCH',{id:draft.id,action:'dismiss'}))).status,200);assert.equal((await approve(draft.id)).status,409);assert.equal((await route.PATCH(req('PATCH',{id:draft.id,action:'dismiss'}))).status,200);
 // Same student's alternative request is blocked by the active group membership.
 sql.prepare('UPDATE requests SET student_id=? WHERE id=?').run(f[1].studentId,g[2].id);assert.equal((await route.POST(req('POST',await body([g[1].id,g[2].id])))).status,409);
 // Existing groups and closed requests do not enter this waiting list.
 const h=fixture(2);sql.prepare('UPDATE requests SET details=? WHERE id=?').run(JSON.stringify({...details,groupRequest:'existing'}),h[0].id);sql.prepare("UPDATE requests SET status='closed' WHERE id=?").run(h[1].id);d=await data();assert.ok(h.every(x=>!d.candidates.some(c=>c.id===x.id)));
 console.log('PASS: owner/CSRF, honest comparison, explicit review, persisted drafts, freshness, archive race, atomic rollback, overlapping proposals, idempotent approval, preferences, no automatic appointments/payments/messages.');
}finally{delete globalThis.__matching;sql.close();}
