import test from 'node:test';
import assert from 'node:assert/strict';
import {visibleStudentAppointment,studentAppointmentLabel,activeAppointment} from '../lib/student-home.ts';
const start=Date.parse('2026-10-19T10:00:00Z'),end=start+55*60000;
const lesson={kind:'lesson',status:'planned',starts_at:new Date(start).toISOString(),ends_at:new Date(end).toISOString()};
test('lesson remains visible and joinable through its end, with distinct upcoming/current labels',()=>{
 for(const [now,label] of [[start-1,'In programma'],[start,'In corso'],[end-1,'In corso']]){assert.equal(visibleStudentAppointment(lesson,now),true);assert.equal(studentAppointmentLabel(lesson,now),label);assert.equal(activeAppointment(lesson,now),true);}
 assert.equal(visibleStudentAppointment(lesson,end),false);assert.equal(studentAppointmentLabel(lesson,end),null);assert.equal(activeAppointment(lesson,end),false);
});
test('unconfirmed payments stay visible without becoming current/joinable; cancellations and invalid ranges stay excluded',()=>{
 const booking={...lesson,kind:'booking',status:'pending'};assert.equal(visibleStudentAppointment(booking,start),true);assert.equal(studentAppointmentLabel(booking,start),null);assert.equal(activeAppointment(booking,start),false);
 assert.equal(studentAppointmentLabel({...booking,status:'confirmed'},start),'In corso');
 for(const a of [{...lesson,status:'cancelled'},{...lesson,status:'expired'},{...lesson,ends_at:lesson.starts_at},{...lesson,starts_at:'invalid'}])assert.equal(visibleStudentAppointment(a,start),false);
});
