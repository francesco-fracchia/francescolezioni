import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const encode=s=>'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText).toString('base64');
const catalog=encode(await readFile(new URL('../lib/catalog.ts',import.meta.url),'utf8'));
const {examPlans,getExamPlan,recommendedLessons,examEstimate,examContactMessage}=await import(encode((await readFile(new URL('../lib/exam-preparation.ts',import.meta.url),'utf8')).replace("from './catalog'",'from '+JSON.stringify(catalog))));
const plan=getExamPlan('analisi-1');
test('individual estimate uses five-lesson packs, remainder lessons and ordinary group rates',()=>{
 assert.equal(recommendedLessons(plan),8);assert.deepEqual({...examEstimate(plan,[0,1,2,3,4],0),selected:undefined},{selected:undefined,lessons:8,packages:1,singles:3,individual:155,group:120});
 assert.equal(examEstimate(plan,[1,2,4],0).individual,95);assert.equal(examEstimate(plan,[0,1,2,3,4],2).individual,190);
 assert.equal(examEstimate(plan,[],0).individual,0);assert.equal(examEstimate(plan,[],1).individual,20);
});
test('contact keeps selected topics and exercise-only requests without arbitrary URL text',()=>{
 const message=examContactMessage({piano:'analisi-1',argomenti:'0,2,3,4',extra:'1'});assert.ok(message.includes('7 lezioni'));assert.ok(message.includes('1 lezione di esercizio'));assert.ok(!message.includes('Limiti e continuità'));
 assert.ok(examContactMessage({piano:'analisi-1',argomenti:'',extra:'2'}).includes('esercitazioni'));
 for(const p of [{piano:'<script>',argomenti:'0'},{piano:'analisi-1',argomenti:'0,9'},{piano:'analisi-1',argomenti:'0,evil'},{piano:['analisi-1'],argomenti:'0'},{piano:'analisi-1',argomenti:['0']},{piano:'analisi-1',argomenti:'',extra:'0'}])assert.equal(examContactMessage(p),'');
 assert.equal(examContactMessage({piano:'analisi-1',argomenti:'0,0',extra:'1000'}).includes('La proposta indica 1 lezione'),true);
});
test('every advertised university subject has an accessible plan and a usable contact-length proposal',async()=>{
 const {universitySubjects}=await import(catalog);assert.deepEqual(examPlans.map(p=>p.name),universitySubjects);assert.equal(new Set(examPlans.map(p=>p.slug)).size,examPlans.length);
 for(const p of examPlans){assert.ok(p.blocks.every(b=>Number.isInteger(b.lessons)&&b.lessons>0));assert.ok(examContactMessage({piano:p.slug,argomenti:p.blocks.map((_,i)=>i).join(','),extra:'10'}).length<=1000);}
});
