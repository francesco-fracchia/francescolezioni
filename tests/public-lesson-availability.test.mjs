import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
test('pre-purchase availability exposes dates and mode only and returns recoverable service errors',async()=>{
 let fail=false,schedule=0,calendar=0,query;
 globalThis.__availabilityQA={ensureSchedule:async()=>{schedule++;},ensureCalendarAvailability:async()=>{calendar++;},bookingDb:()=>({prepare(sql){query=sql;return {bind(){return {all:async()=>{if(fail)throw Error('PRIVATE_DATABASE_DETAIL');return {results:[{id:'private-slot',starts_at:'2026-11-02T09:00:00Z',ends_at:'2026-11-02T09:55:00Z',mode:'Entrambe',name:'PRIVATE_STUDENT',email:'PRIVATE_EMAIL'}]};}};}};}})};
 try{
 const source=(await readFile(new URL('../app/api/lezioni/disponibilita/route.ts',import.meta.url),'utf8'))
  .replace("import {ensureCalendarAvailability} from '@/lib/calendar/availability';",'const {ensureCalendarAvailability}=globalThis.__availabilityQA;')
  .replace("import {ensureSchedule} from '@/lib/booking/schedule';",'const {ensureSchedule}=globalThis.__availabilityQA;')
  .replace("import {bookingDb} from '@/lib/booking/runtime';",'const {bookingDb}=globalThis.__availabilityQA;')
  .replace("import {availableLessonSlotsSql} from '@/lib/packages/reservation';",'const availableLessonSlotsSql="SHARED_RESERVATION_AVAILABILITY";');
 const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
 const {GET}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
 const response=await GET(),body=await response.json();
 assert.equal(response.status,200);assert.equal(query,'SHARED_RESERVATION_AVAILABILITY');assert.equal(schedule,1);assert.equal(calendar,1);
 assert.deepEqual(body.slots,[{starts_at:'2026-11-02T09:00:00Z',ends_at:'2026-11-02T09:55:00Z',mode:'Entrambe'}]);
 assert.match(response.headers.get('cache-control'),/no-store/);
 fail=true;const error=await GET();assert.equal(error.status,503);assert.ok(!JSON.stringify(await error.json()).includes('PRIVATE_DATABASE_DETAIL'));
 }finally{delete globalThis.__availabilityQA;}
});
