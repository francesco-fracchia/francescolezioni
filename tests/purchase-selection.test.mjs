import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
async function compile(path){const source=await readFile(new URL('../'+path,import.meta.url),'utf8');return 'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText).toString('base64');}
const {createLatestRead}=await import(await compile('app/acquista/latest-read.ts'));
const {loadPurchaseResource}=await import(await compile('app/acquista/load-resource.ts'));
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}

test('A transport that ignores abort cannot overwrite the latest child with an older success',async()=>{
 const original=globalThis.fetch,reads=createLatestRead(),pending=new Map(),signals=new Map();let selected='';
 globalThis.fetch=(url,{signal})=>{const result=deferred();pending.set(url,result);signals.set(url,signal);return result.promise;};
 const load=async id=>{const request=reads.start();const data=await loadPurchaseResource('/'+id,request.signal,'Errore');if(request.isCurrent())selected=data.studentId;};
 try{
  const first=load('child-a'),second=load('child-b');assert.equal(signals.get('/child-a').aborted,true);
  pending.get('/child-b').resolve(Response.json({studentId:'child-b'}));await second;assert.equal(selected,'child-b');
  pending.get('/child-a').resolve(Response.json({studentId:'child-a'}));await first;assert.equal(selected,'child-b');
 }finally{reads.cancel();globalThis.fetch=original;}
});
test('An outdated failure cannot turn the latest successful child selection into an error',async()=>{
 const original=globalThis.fetch,reads=createLatestRead(),pending=new Map();let selected='',error='';
 globalThis.fetch=url=>{const result=deferred();pending.set(url,result);return result.promise;};
 const load=async id=>{const request=reads.start();try{const data=await loadPurchaseResource('/'+id,request.signal,'Errore');if(request.isCurrent())selected=data.studentId;}catch(e){if(request.isCurrent())error=e.message;}};
 try{
  const first=load('child-a'),second=load('child-b');pending.get('/child-b').resolve(Response.json({studentId:'child-b'}));await second;
  pending.get('/child-a').reject(new Error('Old network error'));await first;assert.equal(selected,'child-b');assert.equal(error,'');
 }finally{reads.cancel();globalThis.fetch=original;}
});
test('Re-selecting the same child and leaving the page invalidate every superseded ticket',()=>{
 const reads=createLatestRead(),first=reads.start(),second=reads.start();
 assert.equal(first.isCurrent(),false);assert.equal(second.isCurrent(),true);
 reads.cancel();assert.equal(second.isCurrent(),false);assert.equal(second.signal.aborted,true);
 const third=reads.start();assert.equal(third.isCurrent(),true);assert.equal(first.isCurrent(),false);reads.cancel();
});
