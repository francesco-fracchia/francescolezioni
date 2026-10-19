import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../app/acquista/load-resource.ts',import.meta.url),'utf8');
const module='data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText).toString('base64');
const {loadPurchaseResource}=await import(module);
const fallback='Caricamento non riuscito. Riprova.';
const originalFetch=globalThis.fetch;

test('Failed purchase read can be retried as a GET without opening a checkout',async()=>{
 const requests=[];
 globalThis.fetch=async(url,options)=>{requests.push({url,...options});if(requests.length===1)throw new TypeError('Failed to fetch');return Response.json({packages:[]});};
 try{
  await assert.rejects(loadPurchaseResource('/api/acquisti',new AbortController().signal,fallback),{message:fallback});
  assert.deepEqual(await loadPurchaseResource('/api/acquisti',new AbortController().signal,fallback),{packages:[]});
  assert.equal(requests.length,2);assert.ok(requests.every(r=>!r.method&&!r.body&&r.cache==='no-store'));
 }finally{globalThis.fetch=originalFetch;}
});
test('HTTP errors and invalid JSON terminate the read with a usable error',async()=>{
 try{
  globalThis.fetch=async()=>Response.json({error:'Servizio temporaneamente non disponibile.'},{status:503});
  await assert.rejects(loadPurchaseResource('/api/acquisti/prenota',new AbortController().signal,fallback),{message:'Servizio temporaneamente non disponibile.'});
  globalThis.fetch=async()=>new Response('<html>Gateway error</html>');
  await assert.rejects(loadPurchaseResource('/api/acquisti/prenota',new AbortController().signal,fallback),{message:fallback});
 }finally{globalThis.fetch=originalFetch;}
});
test('Hung reads time out; cancelled or superseded reads remain distinguishable',async()=>{
 let received;
 globalThis.fetch=async(_url,{signal})=>{received=signal;return new Promise((_resolve,reject)=>{const abort=()=>reject(new DOMException('Aborted','AbortError'));if(signal.aborted)abort();else signal.addEventListener('abort',abort,{once:true});});};
 try{
  const request=new AbortController();
  await assert.rejects(loadPurchaseResource('/api/acquisti',request.signal,fallback,10),{message:fallback});
  assert.equal(received.aborted,true);assert.equal(request.signal.aborted,false);
  const cancelled=new AbortController(),pending=loadPurchaseResource('/api/acquisti/prenota',cancelled.signal,fallback);
  cancelled.abort();await assert.rejects(pending,{name:'AbortError'});assert.equal(received.aborted,true);
 }finally{globalThis.fetch=originalFetch;}
});
