import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../lib/uploads/client.ts',import.meta.url),'utf8');
const {uploadForm,UploadFailure}=await import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText).toString('base64'));
function setup(t,direct){
 const originalFetch=globalThis.fetch,originalXHR=globalThis.XMLHttpRequest,calls=[],requests=[];
 globalThis.fetch=async(url,options)=>{calls.push({url,options});if(url==='/api/uploads'&&options.method!=='POST')return Response.json({direct});if(url==='/api/uploads')return Response.json({uploadUrl:'https://private.example.invalid/one-file',uploadProof:'fixture-proof'});return Response.json({ok:true});};
 globalThis.XMLHttpRequest=class{upload={};status=200;responseText='{"ok":true}';open(method,url){this.method=method;this.url=url;}setRequestHeader(){}send(body){this.body=body;requests.push(this);}getAllResponseHeaders(){return 'content-type: application/json';}abort(){this.onabort?.();}};
 t.after(()=>{globalThis.fetch=originalFetch;globalThis.XMLHttpRequest=originalXHR;});
 const form=new FormData();form.set('file',new File(['0123456789'],'fixture.txt',{type:'text/plain'}));form.set('title','Fixture');form.set('id','stable-attempt');
 return {calls,requests,form};
}
const tick=()=>new Promise(r=>setImmediate(r));
test('multipart progress measures real transfer, finalizing is distinct, and no automatic repeat occurs',async t=>{
 const {form,requests,calls}=setup(t,false),progress=[];const result=uploadForm('/api/tasks','POST',form,'submission','task',{onProgress:p=>progress.push(p)});await tick();
 const xhr=requests[0];xhr.upload.onprogress({loaded:4,total:10,lengthComputable:true});assert.equal(progress.at(-1).loaded,4);xhr.upload.onload();assert.equal(progress.at(-1).phase,'finalizing');xhr.onload();assert.equal((await result).ok,true);assert.equal(requests.length,1);assert.equal(calls.length,1);
});
test('direct upload commits only the scoped proof and strings after storage acknowledges bytes',async t=>{
 const {form,requests,calls}=setup(t,true),progress=[];const result=uploadForm('/api/materials','PUT',form,'material','module',{onProgress:p=>progress.push(p)});await tick();
 const xhr=requests[0];assert.ok(xhr.body instanceof File);assert.equal(calls.length,2);xhr.upload.onload();xhr.onload();assert.equal((await result).ok,true);
 const commit=calls.at(-1);assert.equal(commit.url,'/api/materials');const body=JSON.parse(commit.options.body);assert.equal(body.uploadProof,'fixture-proof');assert.equal(body.id,'stable-attempt');assert.equal(body.file,undefined);assert.equal(progress.at(-1).phase,'finalizing');
});
test('interruption before delivery keeps a safe retry and never finalizes the file',async t=>{
 const {form,requests,calls}=setup(t,true),controller=new AbortController();const result=uploadForm('/api/materials','PUT',form,'material','module',{signal:controller.signal});await tick();controller.abort();await assert.rejects(result,e=>e instanceof UploadFailure&&e.interrupted&&!e.uncertain);assert.equal(calls.length,2);assert.equal(requests.length,1);
});
test('lost multipart acknowledgement reports uncertain save, without retry or false completion',async t=>{
 const {form,requests}=setup(t,false);const result=uploadForm('/api/tasks','PUT',form,'task','task');await tick();requests[0].upload.onload();requests[0].onerror();await assert.rejects(result,e=>e.uncertain&&!e.interrupted);assert.equal(requests.length,1);
});
test('failure after direct upload was finalized is uncertain, while transfer rejection is safe to retry',async t=>{
 const {form,requests}=setup(t,true),fetch=globalThis.fetch;globalThis.fetch=(url,options)=>url==='/api/materials'?Promise.reject(new TypeError('network')):fetch(url,options);
 const result=uploadForm('/api/materials','PUT',form,'material','module');await tick();requests[0].upload.onload();requests[0].onload();await assert.rejects(result,e=>e.uncertain);
});
