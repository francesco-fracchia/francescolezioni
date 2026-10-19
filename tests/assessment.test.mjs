import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const code=await readFile(new URL('../lib/assessment.ts',import.meta.url),'utf8');
const {assessmentReducer:reduce,initialAssessment,assessmentReview}=await import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText).toString('base64'));
const answer=(state,value)=>reduce(state,{type:'answer',value,optionCount:4});
test('previous questions retain choices; editing an answer does not erase later answers',()=>{
 let state=initialAssessment(5);assert.equal(reduce(state,{type:'next'}),state);
 state=reduce(answer(state,1),{type:'next'});state=answer(state,4);
 state=reduce(state,{type:'previous'});assert.equal(state.question,0);assert.equal(state.answers[0],1);
 state=reduce(answer(state,2),{type:'next'});assert.equal(state.answers[1],4);
 assert.deepEqual(state.answers,[2,4,null,null,null]);assert.equal(state.complete,false);
});
test('a result requires every answer, supports review, and reset removes old choices',()=>{
 let state=initialAssessment(3);
 for(const value of [0,4,2])state=reduce(answer(state,value),{type:'next'});
 assert.equal(state.complete,true);assert.deepEqual(state.answers,[0,4,2]);
 state=reduce(state,{type:'review'});assert.equal(state.complete,false);assert.equal(state.question,0);assert.deepEqual(state.answers,[0,4,2]);
 state=reduce(state,{type:'reset',count:5});assert.deepEqual(state.answers,[null,null,null,null,null]);assert.equal(state.question,0);
 assert.equal(answer(state,-1),state);assert.equal(answer(state,5),state);
});
test('incorrect answers and explicit unknown answers are counted separately without changing scoring',()=>{
 const questions=[0,1,2].map((correct,index)=>({topic:String(index),text:'Question',options:['A','B','C','D'],correct,explanation:'Explanation'}));
 const review=assessmentReview(questions,[0,0,4]);assert.equal(review.score,33);assert.equal(review.correct,1);assert.equal(review.incorrect,1);assert.equal(review.unknown,1);
 assert.deepEqual(review.items.map(item=>item.outcome),['correct','incorrect','unknown']);assert.equal(review.items[1].answer,'A');assert.equal(review.items[2].answer,'Non lo so');
});
