import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes} from 'node:crypto';
import ts from 'typescript';
import {privateAccessAllowed} from '../lib/node/private-access.mjs';

test('Calendar APIs isolate tutors, validate origins, hide credentials, revoke feeds and reject stale iCloud results',async()=>{
 const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');
 for(const file of(await readdir(new URL('../drizzle/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort())sql.exec(await readFile(new URL('../drizzle/'+file,import.meta.url),'utf8'));
 const db={prepare(query){const bind=(...args)=>({async first(){return sql.prepare(query).get(...args)||null;},async all(){return {results:sql.prepare(query).all(...args)};},async run(){return {meta:{changes:Number(sql.prepare(query).run(...args).changes)}};}});return {bind,...bind()};}};
 const stamp=new Date().toISOString();for(const [id,role]of [['tutor','tutor'],['student','student'],['guardian','guardian']])sql.prepare('INSERT INTO accounts(id,email,name,role,password_hash,must_change_password,created_at,updated_at) VALUES(?,?,?,?,?,0,?,?)').run(id,id+'@example.com',id,role,'synthetic',stamp,stamp);
 let actor=null,providerCalls=0,afterProvider=null;
 const calendar={id:'a'.repeat(64),name:'Personale',color:'#087f8c'};
 globalThis.__calendarAccess={
  bookingDb:()=>db,env:{CALENDAR_CONNECTION_KEY:randomBytes(32).toString('hex'),SITE_ORIGIN:'https://site.example'},
  getAccount:async()=>{if(!actor)return null;const row=sql.prepare("SELECT * FROM accounts WHERE id=? AND auth_version=? AND status='active'").get(actor.id,actor.auth_version);return row||null;},
  sameAuthOrigin:r=>r.headers.get('origin')==='https://site.example',
  iCloudClient:async()=>{providerCalls++;return {};},discoverCalendars:async()=>[calendar],
  fetchICloudEvents:async()=>{if(afterProvider){const operation=afterProvider;afterProvider=null;operation();}return [{kind:'icloud',id:'event',name:'PRIVATE ICLOUD EVENT',calendar_id:calendar.id,starts_at:'2026-10-15T08:00:00Z',ends_at:'2026-10-15T09:00:00Z'}];},
 };
 async function compile(file,runtimeUrl){
  let source=await readFile(new URL('../'+file,import.meta.url),'utf8');
  source=source.replace(/import \{ ?getAccount ?\} from '@\/lib\/auth\/session';/, 'const {getAccount}=globalThis.__calendarAccess;')
   .replace(/import \{ ?sameAuthOrigin ?\} from '@\/lib\/auth\/session';/, 'const {sameAuthOrigin}=globalThis.__calendarAccess;')
   .replace(/import \{ ?bookingDb ?\} from '@\/lib\/booking\/runtime';/, 'const {bookingDb}=globalThis.__calendarAccess;')
   .replace(/import \{ ?env ?\} from '@\/lib\/runtime-env';/, 'const {env}=globalThis.__calendarAccess;')
   .replace(/import \{[^}]+\} from ['"](?:\.\/icloud\.mjs|@\/lib\/calendar\/icloud\.mjs)['"];?/, 'const {iCloudClient,discoverCalendars,fetchICloudEvents}=globalThis.__calendarAccess;')
   .replace(/from ['"]@\/lib\/calendar\/runtime['"]/g,'from '+JSON.stringify(runtimeUrl))
   .replace(/from ['"](?:\.\/|@\/lib\/calendar\/)([^'"]+\.mjs)['"]/g,(_,name)=>'from '+JSON.stringify(new URL('../lib/calendar/'+name,import.meta.url).href))
   .replace("from 'zod'",'from '+JSON.stringify(import.meta.resolve('zod')));
  return 'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText).toString('base64');
 }
 const runtime=await compile('lib/calendar/runtime.ts');
 const settings=await import(await compile('app/api/gestione/calendari/route.ts',runtime)),external=await import(await compile('app/api/gestione/calendari/eventi/route.ts',runtime)),feed=await import(await compile('app/api/calendari/lezioni/route.ts',runtime));
 const request=(path='/api/gestione/calendari',body,origin='https://site.example')=>new Request('https://site.example'+path,{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
 try{
  for(const id of [null,'student','guardian']){actor=id?{id,auth_version:0}:null;assert.equal((await settings.GET(request())).status,403);assert.equal((await external.GET(request('/api/gestione/calendari/eventi?from=2026-10-01&to=2026-11-01'))).status,403);assert.equal((await settings.POST(request(undefined,{kind:'create-feed',version:0}))).status,403);}
  assert.equal(providerCalls,0);actor={id:'tutor',auth_version:0};
  assert.equal((await settings.POST(request(undefined,{kind:'create-feed',version:0},'https://evil.example'))).status,403);
  assert.equal((await settings.POST(request(undefined,{kind:'connect',version:0,appleId:'synthetic@example.com',password:'main-password'}))).status,400);
  assert.equal((await external.GET(request('/api/gestione/calendari/eventi?from=2026-02-30&to=2026-03-02'))).status,400);
  const connect=await settings.POST(request(undefined,{kind:'connect',version:0,appleId:'synthetic@example.com',password:'aaaa-bbbb-cccc-dddd'}));assert.equal(connect.status,200,await connect.clone().text());let state=await connect.json();
  for(const sensitive of ['aaaa-bbbb-cccc-dddd','synthetic@example.com','encrypted_credentials','feed_token_hash'])assert.ok(!JSON.stringify(state).includes(sensitive));
  assert.ok(!sql.prepare('SELECT encrypted_credentials FROM calendar_connections').get().encrypted_credentials.includes('aaaa-bbbb-cccc-dddd'));
  const discovered=await(await settings.GET(request('/api/gestione/calendari?discover=1'))).json();assert.equal(discovered.calendars[0].name,'Personale');
  assert.equal((await settings.POST(request(undefined,{kind:'select',version:state.version,calendars:['b'.repeat(64)]}))).status,409);
  state=await(await settings.POST(request(undefined,{kind:'select',version:state.version,calendars:[calendar.id]}))).json();
  const url='/api/gestione/calendari/eventi?from=2026-10-01&to=2026-11-01';
  let response=await external.GET(request(url));assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');assert.equal((await response.json()).events[0].name,'PRIVATE ICLOUD EVENT');
  actor={id:'student',auth_version:0};assert.equal((await external.GET(request(url))).status,403);actor={id:'tutor',auth_version:0};
  afterProvider=()=>sql.prepare("UPDATE calendar_connections SET encrypted_credentials=NULL,selected_calendars='[]',version=version+1").run();
  assert.equal((await external.GET(request('/api/gestione/calendari/eventi?from=2026-11-01&to=2026-12-01'))).status,409);
  state=await(await settings.GET(request())).json();assert.equal(state.connected,false);
  state=await(await settings.POST(request(undefined,{kind:'create-feed',version:state.version}))).json();
  const feedPath=new URL(state.subscriptionUrl).pathname+new URL(state.subscriptionUrl).search;
  actor=null;response=await feed.GET(request(feedPath));assert.equal(response.status,200);assert.ok(response.headers.get('content-type').startsWith('text/calendar'));assert.ok((await response.text()).endsWith('END:VCALENDAR\r\n'));
  assert.equal((await feed.GET(request('/api/calendari/lezioni'))).status,403);assert.equal((await feed.GET(request('/api/calendari/lezioni?token=wrong'))).status,403);
  assert.equal((await feed.GET(request(feedPath+'&token=wrong'))).status,403);assert.equal((await feed.HEAD(request(feedPath))).status,200);assert.equal('POST' in feed,false);
  assert.equal(await privateAccessAllowed(request(feedPath),db,'private'),true);assert.equal(await privateAccessAllowed(request('/api/calendari/lezioni',{token:'wrong'}),db,'private'),false);
  actor={id:'tutor',auth_version:0};state=await(await settings.POST(request(undefined,{kind:'revoke-feed',version:state.version}))).json();assert.equal(state.subscriptionUrl,null);assert.equal((await feed.GET(request(feedPath))).status,403);
  sql.prepare("UPDATE accounts SET auth_version=1 WHERE id='tutor'").run();assert.equal((await settings.POST(request(undefined,{kind:'create-feed',version:state.version}))).status,403);
 }finally{sql.close();delete globalThis.__calendarAccess;}
});
