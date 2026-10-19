import test from 'node:test';
import assert from 'node:assert/strict';
import {agendaCursor,dateCursor} from '../lib/agenda-keyboard.ts';
test('time navigation moves quarters and days, bounds edges, supports hour/page and beginning/end shortcuts',()=>{
 assert.deepEqual(agendaCursor('ArrowDown',0,0,44,7),{row:1,column:0});assert.deepEqual(agendaCursor('ArrowRight',1,0,44,7),{row:1,column:1});
 assert.deepEqual(agendaCursor('ArrowUp',0,0,44,1),{row:0,column:0});assert.deepEqual(agendaCursor('PageDown',42,6,44,7),{row:43,column:6});
 assert.deepEqual(agendaCursor('Home',10,3,44,7),{row:0,column:3});assert.deepEqual(agendaCursor('End',10,3,44,7,true),{row:43,column:6});assert.equal(agendaCursor('Tab',10,3,44,7),null);
});
test('month and mini-calendar keyboard moves preserve week order and stop at available dates',()=>{
 assert.equal(dateCursor('ArrowDown',3,42),10);assert.equal(dateCursor('ArrowLeft',0,42),0);assert.equal(dateCursor('End',10,42),13);assert.equal(dateCursor('ArrowDown',40,42),41);assert.equal(dateCursor('Tab',10,42),null);
});
