import test from 'node:test';
import assert from 'node:assert/strict';
import ICAL from 'ical.js';
import {consultationReceipt} from '../lib/consultation-receipt.mjs';
const appointment={id:'28c36f3e-0917-41f3-9059-74becd7b24e1',starts_at:'2026-11-02T09:00:00.000Z',ends_at:'2026-11-02T09:15:00.000Z',mode:'Online',status:'confirmed'};
test('confirmation exports a parseable event with UTC dates, stable identity and a display reminder',()=>{
 const result=consultationReceipt(appointment,Date.parse('2026-10-19T10:00:00Z'));
 const parsed=new ICAL.Component(ICAL.parse(result.calendar)),event=parsed.getFirstSubcomponent('vevent');
 assert.equal(event.getFirstPropertyValue('uid'),'ff-consultation-'+appointment.id+'@lezionifrancesco.app');
 assert.equal(event.getFirstPropertyValue('dtstart').toJSDate().toISOString(),appointment.starts_at);
 assert.equal(event.getFirstPropertyValue('dtend').toJSDate().toISOString(),appointment.ends_at);
 assert.equal(event.getFirstPropertyValue('status'),'CONFIRMED');
 assert.equal(event.getFirstSubcomponent('valarm').getFirstPropertyValue('trigger').toSeconds(),-1800);
 assert.match(result.summary,/10:00–10:15 \(ora di Roma\)/);
 assert.match(result.instructions,/collegamento/);
 assert.ok(result.calendar.split('\r\n').every(line=>Buffer.byteLength(line)<=75));
 assert.ok(!/ATTENDEE|ORGANIZER|test-student@example|PRIVATE_TOKEN/.test(result.calendar));
 assert.equal(consultationReceipt(appointment,Date.now()).calendar.match(/UID:[^\r]+/)[0],result.calendar.match(/UID:[^\r]+/)[0]);
});
test('receipt distinguishes the office from online and handles Italian daylight saving time',()=>{
 const office=consultationReceipt({...appointment,mode:'Lodi'});
 assert.match(office.instructions,/Via San Colombano 43/);
 assert.equal(new ICAL.Component(ICAL.parse(office.calendar)).getFirstSubcomponent('vevent').getFirstPropertyValue('location'),'Via San Colombano 43, Lodi');
 const summer=consultationReceipt({...appointment,starts_at:'2026-06-02T08:00:00Z',ends_at:'2026-06-02T08:15:00Z'});
 assert.match(summer.summary,/10:00–10:15/);
 assert.doesNotMatch(office.instructions,/videochiamata/);
});
test('cancelled or malformed appointments cannot create a confirmed reminder',()=>{
 for(const patch of [{status:'cancelled'},{id:'x\r\nATTENDEE:bad'},{mode:'Arbitrary'},{starts_at:'invalid'},{ends_at:appointment.starts_at}])assert.throws(()=>consultationReceipt({...appointment,...patch}));
});
