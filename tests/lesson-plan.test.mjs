import test from 'node:test';
import assert from 'node:assert/strict';
import {lessonDates,romeDateTime} from '../lib/lesson-plan.ts';
test('weekly lessons keep their civil time across daylight saving change',()=>{const dates=lessonDates({date:'2026-10-19',time:'16:00',repeat:'weekly',count:3,extraDates:[]});assert.deepEqual(dates,['2026-10-19','2026-10-26','2026-11-02']);assert.equal(romeDateTime(dates[0],'16:00'),'2026-10-19T14:00:00.000Z');assert.equal(romeDateTime(dates[1],'16:00'),'2026-10-26T15:00:00.000Z');});
test('chosen dates are unique and ordered; fortnightly dates span months',()=>{assert.deepEqual(lessonDates({date:'2026-11-02',time:'16:00',repeat:'multiple',count:1,extraDates:['2026-11-09','2026-11-02','2026-11-05']}),['2026-11-02','2026-11-05','2026-11-09']);assert.deepEqual(lessonDates({date:'2026-10-26',time:'16:00',repeat:'fortnightly',count:3,extraDates:[]}),['2026-10-26','2026-11-09','2026-11-23']);});
test('nonexistent civil time and invalid calendar dates are rejected',()=>{assert.throws(()=>romeDateTime('2027-03-28','02:30'));assert.throws(()=>romeDateTime('2027-02-30','16:00'));});
