import test from 'node:test';
import assert from 'node:assert/strict';
import {studentLocation,studentAddress,sectionHistory} from '../lib/student-navigation.ts';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function harness(){
 const entries=[{url:'/studente?anteprima=a&vista=compiti',state:{__NA:true,tree:'keep'}}];let index=0,nav;const applied=[];
 const port={href:()=>entries[index].url,state:()=>entries[index].state,replace:(state,url)=>{entries[index]={state,url};},push:(state,url)=>{entries.splice(++index,Infinity,{state,url});},go:delta=>queueMicrotask(()=>{index+=delta;assert.ok(index>=0&&index<entries.length);nav.pop();})};
 return {port,entries,applied,get index(){return index;},connect(needs=()=>false,confirm=async()=>true){nav=sectionHistory(port,needs,confirm,url=>applied.push(url));return nav;},go:port.go};
}
test('student URLs keep section, selected child, preview scope and unrelated parameters',()=>{
 assert.deepEqual(studentLocation('?vista=materiali&studente=a'),{view:'courses',student:'a'});
 assert.equal(studentLocation('?vista=unknown&anteprima=a').view,'home');
 const address=studentAddress('?anteprima=a&fonte=test','lessons','b');
 const params=new URL(address,'https://example.invalid').searchParams;
 assert.equal(params.get('studente'),'b');assert.equal(params.get('anteprima'),'b');assert.equal(params.get('vista'),'lezioni');assert.equal(params.get('fonte'),'test');
});
test('Back and Forward apply exact entries, preserve Next state and survive reload without extra pushes',async()=>{
 const h=harness();let nav=h.connect();nav.push('/studente?studente=a&vista=piano');nav.push('/studente?studente=b&vista=lezioni');
 nav.dispose();nav=h.connect();h.go(-1);await flush();assert.equal(h.port.href(),'/studente?studente=a&vista=piano');assert.equal(h.port.state().__NA,true);
 h.go(1);await flush();assert.equal(h.port.href(),'/studente?studente=b&vista=lezioni');assert.equal(h.entries.length,3);
});
test('dirty history traversal restores the URL before asking, cancellation preserves Forward and draft section',async()=>{
 const h=harness();let resolve,questions=0;const nav=h.connect(()=>true,()=>{questions++;return new Promise(r=>{resolve=r;});});
 nav.push('/studente?studente=a&vista=piano');nav.push('/studente?studente=a&vista=compiti');
 h.go(-1);await flush();assert.equal(h.index,2);assert.equal(h.applied.length,0);assert.equal(nav.pending,true);
 h.go(-1);await flush();assert.equal(questions,1);resolve(false);await flush();assert.equal(h.index,2);assert.equal(h.entries.length,3);
 h.go(-1);await flush();resolve(true);await flush();assert.equal(h.index,1);assert.equal(h.applied.length,1);assert.equal(h.entries.length,3);
 h.go(1);await flush();resolve(true);await flush();assert.equal(h.index,2);
});
test('a saving form rejects traversal and an unmounted workspace ignores a late confirmation',async()=>{
 const h=harness();let resolve;const nav=h.connect(()=>true,()=>new Promise(r=>{resolve=r;}));nav.push('/studente?vista=compiti');h.go(-1);await flush();nav.dispose();resolve(true);await flush();assert.equal(h.index,1);assert.deepEqual(h.applied,[]);
});
