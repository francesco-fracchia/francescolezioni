import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import ICAL from 'ical.js';
import ts from 'typescript';
import {sealCalendarValue,openCalendarValue,tokenHash} from '../lib/calendar/security.mjs';
import {calendarSettings,calendarSelection,updateCalendarSettings,subscriptionUrl,feedAccount} from '../lib/calendar/settings.mjs';
import {renderTutorCalendar,tutorCalendarEvents} from '../lib/calendar/feed.mjs';
import {calendarRange,readCalendarObjects} from '../lib/calendar/ical.mjs';
import {syntheticAppleTransport} from './fixtures/caldav.mjs';
import {appleCalendarUrl,readOnlyAppleFetch,iCloudClient,discoverCalendars,fetchICloudEvents} from '../lib/calendar/icloud.mjs';

const key=randomBytes(32).toString('hex'),calendar={id:'a'.repeat(64),name:'Personale',color:'#087f8c'},range=calendarRange('2026-10-01','2026-11-01');
const ics=(...events)=>['BEGIN:VCALENDAR','VERSION:2.0',...events.flatMap(lines=>['BEGIN:VEVENT',...lines,'END:VEVENT']),'END:VCALENDAR',''].join('\r\n');
const event=(uid,extra=[])=>['UID:'+uid,'DTSTART:20261015T080000Z','DTEND:20261015T090000Z','SUMMARY:Impegno personale',...extra];
test('Calendar credentials and feed secrets are encrypted, authenticated and bound to owner and purpose',()=>{
 const original={appleId:'synthetic@example.com',password:'aaaa-bbbb-cccc-dddd'};
 const sealed=sealCalendarValue(original,key,'tutor','icloud');
 assert.ok(!sealed.includes(original.password));assert.ok(!sealed.includes(original.appleId));
 assert.deepEqual(openCalendarValue(sealed,key,'tutor','icloud'),original);
 assert.throws(()=>openCalendarValue(sealed,key,'other','icloud'));
 assert.throws(()=>openCalendarValue(sealed,key,'tutor','feed'));
 assert.throws(()=>openCalendarValue(sealed.replace(/.$/,'!'),key,'tutor','icloud'));
});
test('iCloud expands recurrences, excluded dates, moved and cancelled instances without echoing the app feed',()=>{
 const data=ics(
  ['UID:weekly','DTSTART;TZID=Europe/Rome:20261015T100000','DTEND;TZID=Europe/Rome:20261015T110000','RRULE:FREQ=WEEKLY;COUNT=3','EXDATE;TZID=Europe/Rome:20261022T100000','SUMMARY:Ricorrenza'],
  ['UID:weekly','RECURRENCE-ID;TZID=Europe/Rome:20261029T100000','DTSTART;TZID=Europe/Rome:20261030T120000','DTEND;TZID=Europe/Rome:20261030T130000','SUMMARY:Spostato'],
  event('cancelled',['STATUS:CANCELLED']),event('ff-app-lesson-id@lezionifrancesco.app')
 );
 const result=readCalendarObjects([{data,url:'https://p01-caldav.icloud.com/event.ics'}],calendar,range);
 assert.equal(result.length,2);assert.equal(result[0].starts_at,'2026-10-15T08:00:00.000Z');
 assert.equal(result[1].name,'Spostato');assert.equal(result[1].starts_at,'2026-10-30T11:00:00.000Z');
 assert.ok(result.every(e=>e.calendar_id===calendar.id&&e.kind==='icloud'));
 const stable=readCalendarObjects([{data:data.replace('20261030T120000','20261030T140000').replace('20261030T130000','20261030T150000')}],calendar,range);
 assert.equal(stable[1].id,result[1].id);
});
test('All-day dates keep exclusive ends across DST; cancelled recurring exceptions disappear',()=>{
 const data=ics(['UID:holiday','DTSTART;VALUE=DATE:20261024','DTEND;VALUE=DATE:20261027','SUMMARY:Fuori sede'],
  ['UID:cancel-series','DTSTART:20261015T080000Z','DTEND:20261015T090000Z','RRULE:FREQ=DAILY;COUNT=2'],
  ['UID:cancel-series','RECURRENCE-ID:20261016T080000Z','DTSTART:20261016T080000Z','DTEND:20261016T090000Z','STATUS:CANCELLED']);
 const result=readCalendarObjects([{data}],calendar,range),allDay=result.find(e=>e.name==='Fuori sede');
 assert.equal(result.length,2);assert.equal(allDay.all_day,true);
 assert.equal(allDay.starts_at,'2026-10-23T22:00:00.000Z');assert.equal(allDay.ends_at,'2026-10-26T23:00:00.000Z');
 assert.throws(()=>calendarRange('2026-02-30','2026-03-01'));
 assert.throws(()=>calendarRange('2026-01-01','2026-12-31'));
});
test('Transport never sends credentials outside Apple CalDAV hosts and refuses all write methods',async()=>{
 for(const url of ['http://caldav.icloud.com','https://evil.example','https://caldav.icloud.com.evil.example','https://user:pass@caldav.icloud.com','https://caldav.icloud.com:444','https://caldav.icloud.com/?x=1'])assert.throws(()=>appleCalendarUrl(url));
 const calls=[];const transport=readOnlyAppleFetch(async(url,options)=>{calls.push({url,options});return new Response(null,{status:302,headers:{Location:'https://evil.example/steal'}});});
 await assert.rejects(transport('https://caldav.icloud.com/',{method:'REPORT',headers:{Authorization:'Basic synthetic'}}),/non consentito/);
 assert.equal(calls.length,1);
 for(const method of ['PUT','POST','DELETE','MKCALENDAR','PATCH'])await assert.rejects(transport('https://caldav.icloud.com/',{method}),/soltanto la lettura/);
 assert.equal(calls.length,1);
 const entity=readOnlyAppleFetch(async()=>new Response('<!DOCTYPE x [<!ENTITY x SYSTEM "file:///etc/passwd">]>'));
 await assert.rejects(entity('https://caldav.icloud.com/'),/non supportata/);
 const huge=readOnlyAppleFetch(async()=>new Response('x'.repeat(5*1024*1024+1)));
 await assert.rejects(huge('https://caldav.icloud.com/'),/troppo grande/);
});

// Real tsdav discovery/REPORT parsing over an in-memory CalDAV transport.
test('The actual CalDAV client discovers Apple calendars and reads a bounded expanded REPORT',async()=>{
 const requests=[],client=await iCloudClient({appleId:'synthetic@example.com',password:'aaaa-bbbb-cccc-dddd'},syntheticAppleTransport(ics(event('protocol')),requests));
 const calendars=await discoverCalendars(client);assert.equal(calendars.length,1);assert.equal(calendars[0].name,'Personale');assert.equal(calendars[0].color,'#087f8c');
 const events=await fetchICloudEvents(client,calendars,[calendars[0].id],range);assert.equal(events.length,1);
 assert.ok(requests.every(r=>['PROPFIND','GET','REPORT','OPTIONS'].includes(r.method)));
 const report=requests.find(r=>r.method==='REPORT');assert.ok(report.body.includes('20260930T220000Z'));assert.ok(report.body.includes('20261031T230000Z')); assert.ok(report.body.includes('expand'));
 await assert.rejects(fetchICloudEvents(client,calendars,['b'.repeat(64)],range),/non è più disponibile/);
});

async function database(){
 const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');
 for(const file of (await readdir(new URL('../drizzle/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort())sql.exec(await readFile(new URL('../drizzle/'+file,import.meta.url),'utf8'));
 const db={prepare(query){const bind=(...args)=>({async first(){return sql.prepare(query).get(...args)||null;},async all(){return {results:sql.prepare(query).all(...args)};},async run(){return {meta:{changes:Number(sql.prepare(query).run(...args).changes)}};}});return {bind,...bind()};}};
 const now=new Date().toISOString();
 for(const [id,role]of [['tutor','tutor'],['student','student']])sql.prepare('INSERT INTO accounts(id,email,name,role,password_hash,must_change_password,created_at,updated_at) VALUES(?,?,?,?,?,0,?,?)').run(id,id+'@example.com',id,role,'synthetic',now,now);
 return {sql,db,actor:{id:'tutor',role:'tutor',auth_version:0,must_change_password:0}};
}
test('Feed tokens survive reload, rotate and revoke; credentials/selection are independent and stale writes cannot undo revocation',async()=>{
 const {sql,db,actor}=await database();try{
  let settings=await updateCalendarSettings(db,actor,0,{kind:'create-feed'},key);
  const url=subscriptionUrl(settings,key,'https://site.example'),token=new URL(url).searchParams.get('token');
  assert.equal((await feedAccount(db,token)).id,actor.id);assert.notEqual(settings.feed_token_hash,token);assert.equal(settings.feed_token_hash,tokenHash(token));
  assert.equal(subscriptionUrl(await calendarSettings(db,actor.id),key,'https://site.example'),url);
  settings=await updateCalendarSettings(db,actor,settings.version,{kind:'connect'},key,{appleId:'synthetic@example.com',password:'aaaa-bbbb-cccc-dddd'});
  assert.ok(!JSON.stringify(settings).includes('aaaa-bbbb-cccc-dddd'));
  settings=await updateCalendarSettings(db,actor,settings.version,{kind:'select',calendars:[calendar.id]},key);assert.deepEqual(calendarSelection(settings),[calendar.id]);
  settings=await updateCalendarSettings(db,actor,settings.version,{kind:'rotate-feed'},key);assert.equal(await feedAccount(db,token),null);
  const rotated=new URL(subscriptionUrl(settings,key,'https://site.example')).searchParams.get('token');
  settings=await updateCalendarSettings(db,actor,settings.version,{kind:'disconnect'},key);assert.equal(settings.encrypted_credentials,null);assert.deepEqual(calendarSelection(settings),[]);assert.ok(await feedAccount(db,rotated));
  const stale=settings.version;settings=await updateCalendarSettings(db,actor,stale,{kind:'revoke-feed'},key);
  assert.equal(await feedAccount(db,rotated),null);await assert.rejects(updateCalendarSettings(db,actor,stale,{kind:'create-feed'},key),/cambiate/);
  settings=await updateCalendarSettings(db,actor,settings.version,{kind:'create-feed'},key);const active=new URL(subscriptionUrl(settings,key,'https://site.example')).searchParams.get('token');
  sql.prepare("UPDATE accounts SET status='suspended' WHERE id='tutor'").run();assert.equal(await feedAccount(db,active),null);
  await assert.rejects(updateCalendarSettings(db,actor,settings.version,{kind:'connect'},key,{}),/Accesso/);
 }finally{sql.close();}
});
test('Tutor subscription exports stable cancellation UIDs, UTF-8 folding and no student or payment details',async()=>{
 const {sql,db}=await database();try{
  const start='2026-10-15T08:00:00.000Z',end='2026-10-15T08:55:00.000Z';
  sql.prepare("INSERT INTO scheduled_lessons(id,series_id,name,email,subject,starts_at,ends_at,mode,notes,status,created_at) VALUES('one','series','PRIVATE STUDENT','private@example.com',?,?,?,'Online','PRIVATE NOTE','planned',?)").run('Matematica è utile '.repeat(12),start,end,start);
  let events=await tutorCalendarEvents(db,Date.parse('2026-10-15T00:00:00Z'));assert.equal(events.length,1);
  const original=renderTutorCalendar(events,Date.parse(start));const parsed=new ICAL.Component(ICAL.parse(original)).getFirstSubcomponent('vevent');
  const uid=parsed.getFirstPropertyValue('uid');assert.equal(parsed.getFirstPropertyValue('status'),'CONFIRMED');
  for(const secret of ['PRIVATE STUDENT','private@example.com','PRIVATE NOTE','payment'])assert.ok(!original.includes(secret));
  for(const line of original.split('\r\n'))assert.ok(Buffer.byteLength(line)<=75);
  sql.prepare("UPDATE scheduled_lessons SET status='cancelled',version=version+1 WHERE id='one'").run();events=await tutorCalendarEvents(db,Date.parse(start));
  const cancelled=new ICAL.Component(ICAL.parse(renderTutorCalendar(events,Date.parse(start)))).getFirstSubcomponent('vevent');
  assert.equal(cancelled.getFirstPropertyValue('uid'),uid);assert.equal(cancelled.getFirstPropertyValue('status'),'CANCELLED');assert.equal(cancelled.getFirstPropertyValue('sequence'),1);
 }finally{sql.close();}
});

test('Overlapping internal and iCloud events get separate columns, with midnight and touching boundaries preserved',async()=>{
 const source=await readFile(new URL('../lib/agenda.ts',import.meta.url),'utf8');const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText;
 const {agendaEventLayout,eventSpan}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
 const events=[{id:'app',starts_at:'2026-10-15T08:00:00Z',ends_at:'2026-10-15T09:00:00Z'},{id:'icloud',starts_at:'2026-10-15T08:30:00Z',ends_at:'2026-10-15T09:30:00Z'},{id:'after',starts_at:'2026-10-15T09:30:00Z',ends_at:'2026-10-15T10:00:00Z'}];
 const layout=agendaEventLayout(events,'2026-10-15');assert.deepEqual(layout.map(e=>e.columns),[2,2,1]);assert.notEqual(layout[0].column,layout[1].column);
 assert.equal(eventSpan({starts_at:'2026-10-14T22:00:00Z',ends_at:'2026-10-15T22:00:00Z'},'2026-10-16'),null);
});
