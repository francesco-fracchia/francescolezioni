import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../lib/form-safety.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {createSafetyRegistry,createTextDrafts}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));

test('Leaving is clean until a live form changes, and becomes clean again after reverting or saving',()=>{
 const registry=createSafetyRegistry();let current='',saved='';
 const remove=registry.register({scope:'request',dirty:()=>current!==saved,saving:()=>false});
 assert.deepEqual(registry.state(),{dirty:false,saving:false});
 current='Una richiesta lunga';assert.equal(registry.state().dirty,true);
 current='';assert.equal(registry.state().dirty,false);
 current='Una richiesta lunga';saved=current;assert.equal(registry.state().dirty,false);
 current='Altra modifica';remove();assert.equal(registry.state().dirty,false);
});
test('Pending writes block leaving even with no dirty fields, and stop blocking after failure or completion',()=>{
 const registry=createSafetyRegistry();let saving=false,dirty=false;
 registry.register({scope:'assignment',dirty:()=>dirty,saving:()=>saving});
 const updates=[];const unsubscribe=registry.subscribe(()=>updates.push(registry.state()));
 saving=true;registry.notify();assert.equal(registry.state().saving,true);
 dirty=true;saving=false;registry.notify();assert.deepEqual(registry.state(),{saving:false,dirty:true});
 dirty=false;registry.notify();assert.deepEqual(registry.state(),{saving:false,dirty:false});
 unsubscribe();registry.notify();assert.equal(updates.length,3);
});
test('Dialog checks are scoped, while page navigation includes every form and nested write',()=>{
 const registry=createSafetyRegistry();
 registry.register({scope:'dialog',dirty:()=>true,saving:()=>false});
 const remove=registry.register({scope:'tutor-template',dirty:()=>false,saving:()=>true});
 assert.deepEqual(registry.state(e=>e.scope==='dialog'),{dirty:true,saving:false});
 assert.deepEqual(registry.state(),{dirty:true,saving:true});remove();
 assert.deepEqual(registry.state(),{dirty:true,saving:false});
});
test('Text drafts keep separate students/tasks/attempts and clear only the saved response',()=>{
 const drafts=createTextDrafts(Infinity);
 drafts.write('student-a:task-1:first',{body:'Passaggi A',attemptId:'attempt-a'});
 drafts.write('student-b:task-1:first',{body:'Passaggi B',attemptId:'attempt-b'});
 assert.equal(drafts.read('student-a:task-1:review-2'),null);
 assert.equal(drafts.read('student-a:task-1:first').attemptId,'attempt-a');
 drafts.remove('student-a:task-1:first');assert.equal(drafts.read('student-a:task-1:first'),null);
 assert.equal(drafts.read('student-b:task-1:first').body,'Passaggi B');
 drafts.clear();assert.equal(drafts.read('student-b:task-1:first'),null);
});
test('A separate page instance never inherits another page’s in-memory draft',()=>{
 const first=createTextDrafts(Infinity),next=createTextDrafts(Infinity);
 first.write('student:task',{body:'Privato',attemptId:''});
 assert.equal(next.read('student:task'),null);
});
