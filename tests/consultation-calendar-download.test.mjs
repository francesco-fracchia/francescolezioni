import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
import ICAL from 'ical.js';

test('calendar download requires the matching booking proof, rejects cancelled receipts and never exports contacts',async()=>{
 const db=new DatabaseSync(':memory:');let unavailable=false;
 db.exec('create table consultations(id text,payload_hash text,starts_at text,ends_at text,mode text,status text,name text,email text)');
 const id='28c36f3e-0917-41f3-9059-74becd7b24e1',token='a'.repeat(64);
 db.prepare('insert into consultations values(?,?,?,?,?,?,?,?)').run(id,token,'2026-11-02T09:00:00.000Z','2026-11-02T09:15:00.000Z','Online','confirmed','PRIVATE_NAME','PRIVATE_EMAIL');
 globalThis.__receiptDB={prepare(sql){if(unavailable)throw Error('PRIVATE_DATABASE_ERROR');return {bind(...args){return {first:async()=>db.prepare(sql).get(...args)};}};}};
 try {
  const source=(await readFile(new URL('../app/api/incontri/calendario/route.ts',import.meta.url),'utf8'))
   .replace("import {bookingDb} from '@/lib/booking/runtime';",'const bookingDb=()=>globalThis.__receiptDB;')
   .replace("from '@/lib/consultation-receipt.mjs'",'from '+JSON.stringify(new URL('../lib/consultation-receipt.mjs',import.meta.url).href));
  const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
  const {POST}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
  const request=(body,headers={})=>new Request('https://example.invalid/api/incontri/calendario',{method:'POST',headers:{Origin:'https://example.invalid',Accept:'application/json','Content-Type':'application/x-www-form-urlencoded',...headers},body:new URLSearchParams(body)});
  const response=await POST(request({id,token})),ics=await response.text();
  assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/text\/calendar/);assert.match(response.headers.get('content-disposition'),/attachment/);
  assert.equal(response.headers.get('referrer-policy'),'no-referrer');assert.equal(response.headers.get('cache-control'),'private, no-store');
  assert.equal(new ICAL.Component(ICAL.parse(ics)).getFirstSubcomponent('vevent').getFirstPropertyValue('uid'),'ff-consultation-'+id+'@lezionifrancesco.app');
  assert.doesNotMatch(ics,/PRIVATE_NAME|PRIVATE_EMAIL|aaaaaa/);
  assert.equal((await POST(request({id,token:'b'.repeat(64)}))).status,404);
  assert.equal((await POST(request({id,token},{Origin:'https://evil.invalid'}))).status,403);
  db.prepare("update consultations set status='cancelled'").run();assert.equal((await POST(request({id,token}))).status,404);
  const browserError=await POST(request({id,token},{Accept:'text/html'}));assert.equal(browserError.status,303);assert.equal(new URL(browserError.headers.get('location')).pathname,'/indisponibile');assert.ok(!browserError.headers.get('location').includes(token));
  unavailable=true;const failure=await POST(request({id,token}));assert.equal(failure.status,503);assert.ok(!(await failure.text()).includes('PRIVATE_DATABASE_ERROR'));
 }finally{delete globalThis.__receiptDB;db.close();}
});
