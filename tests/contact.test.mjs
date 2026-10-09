import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
const sql=new DatabaseSync(':memory:');
for(const f of (await readdir(new URL('../drizzle/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort())sql.exec(await readFile(new URL('../drizzle/'+f,import.meta.url),'utf8'));
let unavailable=false,loseAcknowledgement=false;
const db={prepare(query){if(unavailable)throw Error('Database unavailable');return {bind(...args){return {async first(){return sql.prepare(query).get(...args)||null;},async run(){const result=sql.prepare(query).run(...args);if(loseAcknowledgement){loseAcknowledgement=false;throw Error('DB acknowledgement lost after commit');}return {meta:{changes:Number(result.changes)}};}};}};}};
globalThis.__contact={env:{DB:db}};
async function compile(path,replace=s=>s){const s=replace(await readFile(new URL('../'+path,import.meta.url),'utf8')).replace("import { env } from '@/lib/runtime-env';",'const {env}=globalThis.__contact;').replace(/import \{\s*validateReferral\s*\} from '@\/lib\/referrals\/server';/g,"const validateReferral=async code=>{if(code)throw Error('Codice invito non disponibile.');};").replace("import {limitPublicRequest} from '@/lib/public-request-limit';",'const limitPublicRequest=async()=>null;').replace("from 'zod'",'from '+JSON.stringify(import.meta.resolve('zod')));return 'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText).toString('base64');}
const store=await compile('lib/request-store.ts');
const {POST}=await import(await compile('app/api/contatti/route.ts',s=>s.replace("from '@/lib/request-store'",'from '+JSON.stringify(store))));
const origin='https://site.example';
const payload={id:crypto.randomUUID(),name:'  Genitore di prova  ',email:'  QA@Example.com  ',subject:'Matematica',message:'',consent:true,website:''};
const req=(p=payload,source=origin)=>new Request(origin+'/api/contatti',{method:'POST',headers:{'Content-Type':'application/json',...(source?{Origin:source}:{})},body:typeof p==='string'?p:JSON.stringify(p)});
try{
 assert.equal((await POST(req(payload,'https://evil.example'))).status,403);
 assert.equal((await POST(req(payload,null))).status,403);
 assert.equal((await POST(req({...payload,consent:false}))).status,400);
 assert.equal((await POST(req({...payload,email:'bad'}))).status,400);
 assert.equal((await POST(req({...payload,name:'A'}))).status,400);
 assert.equal((await POST(req({...payload,website:'bot'}))).status,400);
 assert.equal((await POST(req({...payload,message:'x'.repeat(1001)}))).status,400);
 assert.equal((await POST(req('x'.repeat(5001)))).status,413);
 assert.equal((await POST(req('bad json'))).status,400);
 let response=await POST(req());assert.equal(response.status,201);assert.deepEqual(Object.keys(await response.json()).sort(),['id','ok']);
 const saved=sql.prepare('SELECT * FROM requests WHERE id=?').get(payload.id);assert.equal(saved.kind,'contact');assert.equal(saved.status,'new');assert.equal(saved.name,'Genitore di prova');assert.equal(saved.email,'qa@example.com');assert.deepEqual(JSON.parse(saved.details),{message:''});assert.equal(saved.assessment,null);
 assert.equal((await POST(req())).status,200);assert.equal(sql.prepare('SELECT COUNT(*) n FROM requests').get().n,1);
 response=await POST(req({...payload,message:'Changed'}));assert.equal(response.status,409);assert.ok(!(await response.text()).includes('qa@example.com'));assert.deepEqual(JSON.parse(sql.prepare('SELECT details FROM requests WHERE id=?').get(payload.id).details),{message:''});
 const duplicate={...payload,id:crypto.randomUUID(),message:'Vorrei chiedere informazioni.'};const race=await Promise.all([POST(req(duplicate)),POST(req(duplicate))]);assert.deepEqual(race.map(r=>r.status).sort(),[200,201]);
 loseAcknowledgement=true;const lost={...payload,id:crypto.randomUUID()};assert.equal((await POST(req(lost))).status,200);assert.equal((await POST(req(lost))).status,200);assert.equal(sql.prepare('SELECT COUNT(*) n FROM requests WHERE id=?').get(lost.id).n,1);
 const lesson={...payload,id:crypto.randomUUID()};sql.prepare("INSERT INTO requests(id,kind,name,email,subject,details,status,created_at,consent_version) VALUES(?,'lesson','Private student','private@example.com','Matematica','{}','new','2026-10-07','2026-10-04')").run(lesson.id);response=await POST(req(lesson));assert.equal(response.status,409);assert.ok(!(await response.text()).includes('private@example.com'));
 unavailable=true;assert.equal((await POST(req({...payload,id:crypto.randomUUID()}))).status,503);unavailable=false;
 for(const table of ['notifications','scheduled_lessons','consultations','lesson_payments','students'])assert.equal(sql.prepare(`SELECT COUNT(*) n FROM ${table}`).get().n,0);
 console.log('PASS: brief first contact, optional message, origin/consent/honeypot/size checks, durable private request, normalized recapito, content-matched retries, concurrent duplicate and lost DB acknowledgement, outage recovery; no accounts, appointments, payments or emails.');
}finally{sql.close();delete globalThis.__contact;}
