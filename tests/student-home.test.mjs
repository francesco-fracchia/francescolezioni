import test from 'node:test';
import assert from 'node:assert/strict';
import {activeAppointment,nextAppointment,homeworkOverview,studyOverview,materialsToStudy} from '../lib/student-home.ts';
import {lessonCalendar} from '../lib/lesson-calendar-export.ts';
const now=Date.parse('2026-10-25T09:00:00Z');
const appointment=(id,start,status='planned',kind='lesson')=>({id,kind,status,subject:'Matematica',mode:'Online',starts_at:new Date(start).toISOString(),ends_at:new Date(start+3300000).toISOString()});
const blank=()=>({lessons:[],bookings:[],materials:[],courses:[],modules:[]});
test('next lesson includes an ongoing class, excludes tentative/cancelled/finished and respects authoritative no-result',()=>{
 const data=blank();data.lessons=[appointment('past',now-7200000),appointment('cancelled',now+3600000,'cancelled'),appointment('ongoing',now-600000),appointment('later',now+7200000)];
 data.bookings=[appointment('reserved',now+60000,'awaiting_payment','booking'),appointment('confirmed',now+3600000,'confirmed','booking')];
 assert.equal(nextAppointment(data,now).id,'ongoing');assert.equal(activeAppointment({...data.lessons[2],ends_at:new Date(now).toISOString()},now),false);
 assert.equal(activeAppointment({...data.lessons[2],starts_at:'bad'},now),false);
 data.nextAppointment=null;assert.equal(nextAppointment(data,now),null);
 data.nextAppointment=appointment('outside-history',now+600000);assert.equal(nextAppointment(data,now).id,'outside-history');
});
test('homework priorities use latest attempt, private reviews stay pending, and corrections only use published work',()=>{
 const tasks=['todo','revise','waiting','complete','draft'].map(id=>({id,title:id,status:id==='draft'?'draft':'published',due_date:id==='todo'?'2026-10-26':id==='revise'?'2026-10-24':null,created_at:'2026-10-01'}));
 const submission=(id,assignment_id,attempt,feedback_status,review_status,reviewed_at)=>({id,assignment_id,attempt,feedback_status,review_status,reviewed_at,created_at:'2026-10-01',feedback:feedback_status==='draft'?'PRIVATE':''});
 const data={assignments:tasks,submissions:[submission('older','revise',1,'published','accepted','2026-10-20'),submission('latest','revise',2,'published','revise','2026-10-24'),submission('private','waiting',1,'draft','accepted','2026-10-25'),submission('accepted','complete',1,'published','accepted','2026-10-21'),submission('draft-task','draft',1,'published','accepted','2026-10-26')]};
 const result=homeworkOverview(data);assert.deepEqual(result.pending.map(t=>t.task.id),['revise','todo']);assert.equal(result.waiting,1);assert.equal(result.correction.submission.id,'latest');assert.equal(JSON.stringify(result).includes('PRIVATE'),false);
});
test('published plans, summaries and uncompleted materials are ordered without mutating source lists',()=>{
 const plans=[{id:'older',status:'published',updated_at:'2026-10-01'},{id:'hidden',status:'draft',updated_at:'2026-10-27'},{id:'latest',status:'published',updated_at:'2026-10-24'}];
 const summaries=[{id:'old',status:'published',starts_at:'2026-10-01'},{id:'cancelled-shared',status:'published',starts_at:'2026-10-25',appointment_status:'cancelled'},{id:'draft',status:'draft',starts_at:'2026-10-26'}];
 const result=studyOverview({plans,summaries});assert.equal(result.plan.id,'latest');assert.equal(result.summary.id,'cancelled-shared');assert.equal(plans[0].id,'older');
 const data=blank();data.materials=[{id:'old',status:'published',completed_at:null,created_at:'2026-10-01',position:0},{id:'new',status:'published',completed_at:null,created_at:'2026-10-24',position:1},{id:'done',status:'published',completed_at:'2026-10-24',created_at:'2026-10-25'},{id:'draft',status:'draft',completed_at:null,created_at:'2026-10-26'}];assert.deepEqual(materialsToStudy(data).map(m=>m.id),['new','old']);assert.equal(data.materials[0].id,'old');
});
test('calendar exports UTC around Rome DST, stable UID and escaped/folded UTF-8 without invitations',()=>{
 const a=appointment('abc-123',Date.parse('2026-10-25T10:00:00Z'));a.subject='Algebra, geometria; perché '.repeat(9)+'\r\nORGANIZER:mailto:example@example.com';
 const file=lessonCalendar(a,'Via San Colombano 43, Lodi',new Date(now));
 assert.match(file,/DTSTART:20261025T100000Z\r\n/);assert.match(file,/DTEND:20261025T105500Z\r\n/);assert.match(file,/UID:lesson-abc-123@francesco-fracchia\r\n/);
 for(const line of file.split('\r\n'))assert.ok(Buffer.byteLength(line,'utf8')<=75);
 const unfolded=file.replace(/\r\n /g,'');assert.ok(unfolded.includes('Algebra\\, geometria\\;'));assert.ok(unfolded.includes('\\nORGANIZER:mailto:'));assert.equal(file.split('\r\n').some(line=>/^(ORGANIZER|ATTENDEE|METHOD|URL):/.test(line)),false);assert.ok(file.endsWith('END:VCALENDAR\r\n'));
 assert.match(lessonCalendar(a,'Online',new Date(now+1000)),/UID:lesson-abc-123@francesco-fracchia/);
});
test('calendar refuses tentative, cancelled, finished, invalid or injected appointment IDs',()=>{
 for(const a of [appointment('pending',now+1000,'pending','booking'),appointment('cancel',now+1000,'cancelled'),appointment('past',now-7200000),{...appointment('invalid',now+1000),starts_at:'bad'},{...appointment('inject',now+1000),id:'abc\r\nATTENDEE:bad'}])assert.throws(()=>lessonCalendar(a,'Online',new Date(now)));
});
