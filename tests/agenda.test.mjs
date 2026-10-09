import test from 'node:test';
import assert from 'node:assert/strict';
import {agendaDay,agendaTime,weekDays,monthDays,shiftMonth,eventSpan,freeAvailabilityBands} from '../lib/agenda.ts';
test('Rome agenda uses local day near midnight and across daylight saving',()=>{
 assert.equal(agendaDay('2026-10-07T22:30:00Z'),'2026-10-08');
 assert.equal(agendaTime('2026-10-24T14:00:00Z'),'16:00');
 assert.equal(agendaTime('2026-10-26T15:00:00Z'),'16:00');
 assert.deepEqual(weekDays('2026-10-25'),['2026-10-19','2026-10-20','2026-10-21','2026-10-22','2026-10-23','2026-10-24','2026-10-25']);
});
test('month navigation clamps final day and month grid includes full weeks',()=>{
 assert.equal(shiftMonth('2027-01-31',1),'2027-02-28');
 const days=monthDays('2026-11-15');assert.equal(days.length,42);assert.equal(days[0],'2026-10-26');assert.equal(days.at(-1),'2026-12-06');
});
test('overnight events are clipped into both calendar days and midnight has no empty continuation',()=>{
 const e={starts_at:'2026-10-07T21:30:00Z',ends_at:'2026-10-07T22:25:00Z'};
 assert.deepEqual(eventSpan(e,'2026-10-07'),{start:1410,end:1440});assert.deepEqual(eventSpan(e,'2026-10-08'),{start:0,end:25});assert.equal(eventSpan(e,'2026-10-09'),null);
 assert.equal(eventSpan({...e,ends_at:'2026-10-07T22:00:00Z'},'2026-10-08'),null);
});
test('free availability bands split at occupied or blocked slots, gaps, modes and Rome days',()=>{
 const slot=(id,time,extra={})=>({id,kind:'free',starts_at:'2026-11-02T'+time+':00Z',ends_at:new Date(Date.parse('2026-11-02T'+time+':00Z')+15*60000).toISOString(),mode:'Entrambe',status:'available',...extra});
 const slots=[slot('a','09:00'),slot('b','09:20'),slot('c','09:40',{occupied:1}),slot('d','10:00'),slot('e','10:20',{status:'blocked'}),slot('f','10:40'),slot('g','11:00',{mode:'Online'}),slot('h','11:20',{kind:'paid'}),slot('i','11:40'),slot('j','22:40'),slot('k','23:00')];
 const bands=freeAvailabilityBands(slots.reverse());
 assert.deepEqual(bands.map(b=>[b.id,b.count,b.day]),[['a',2,'2026-11-02'],['d',1,'2026-11-02'],['f',1,'2026-11-02'],['g',1,'2026-11-02'],['i',1,'2026-11-02'],['j',1,'2026-11-02'],['k',1,'2026-11-03']]);
 assert.equal(bands[0].ends_at,'2026-11-02T09:35:00.000Z');
 assert.equal(slots.length,11);
});
