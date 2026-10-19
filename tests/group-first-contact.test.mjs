import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
import {randomUUID} from 'node:crypto';
const saved=new Map();
globalThis.__groupFirstContact={findRequest:async id=>saved.get(id),saveRequest:async record=>{saved.set(record.id,record);}};
const source=(await readFile(new URL('../app/api/requests/route.ts',import.meta.url),'utf8'))
 .replace("import { tests } from '@/lib/catalog';",'const tests={};')
 .replace("import {findRequest,saveRequest} from '@/lib/request-store';",'const {findRequest,saveRequest}=globalThis.__groupFirstContact;')
 .replace("import {limitPublicRequest} from '@/lib/public-request-limit';",'const limitPublicRequest=async()=>null;')
 .replace("'@/lib/form-errors.mjs'",JSON.stringify(new URL('../lib/form-errors.mjs',import.meta.url).href))
 .replace("'zod'",JSON.stringify(import.meta.resolve('zod')));
const {POST}=await import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText).toString('base64'));
const body=()=>({id:randomUUID(),kind:'group',name:'Persona di prova',email:'group@example.invalid',subject:'Matematica',consent:true,website:'',assessment:null,details:{studentType:'',institution:'',year:'',teacher:'',program:'',goal:'Preparare la verifica',deadline:'',availability:'Lunedì pomeriggio',mode:'Online',level:'',groupSize:'Coppia',companion:false,phone:'',groupRequest:'matching',participants:[],sharedProgram:'',groupNotes:''}});
const post=value=>POST(new Request('https://example.invalid/api/requests',{method:'POST',headers:{origin:'https://example.invalid','content-type':'application/json'},body:JSON.stringify(value)}));
test('matching needs no full program or named companions, and identical retries are idempotent',async()=>{
 const value=body();assert.equal((await post(value)).status,201);assert.equal((await post(value)).status,200);
 const details=JSON.parse(saved.get(value.id).details);assert.equal(details.program,'');assert.equal(details.studentType,'');assert.deepEqual(details.participants,[]);
});
test('an already formed group can contact the tutor before supplying names',async()=>{
 const value=body();value.details.groupRequest='existing';value.details.companion=true;
 assert.equal((await post(value)).status,201);assert.equal(JSON.parse(saved.get(value.id).details).groupRequest,'existing');
});
test('optional information stays in the saved request',async()=>{
 const value=body();Object.assign(value.details,{studentType:'Università',institution:'Ateneo di prova',deadline:'2026-12-12',program:'Integrali',teacher:'Docente di prova',participants:[{name:'',level:'Stesso corso'}]});
 assert.equal((await post(value)).status,201);assert.deepEqual(JSON.parse(saved.get(value.id).details),value.details);
});
test('goal and availability remain necessary; other request kinds retain program validation',async()=>{
 const value=body();value.details.goal='';value.details.availability='';
 const response=await post(value),result=await response.json();assert.equal(response.status,400);assert.ok(result.fieldErrors.goal);assert.ok(result.fieldErrors.availability);assert.equal(saved.has(value.id),false);
 const lesson=body();lesson.kind='lesson';const invalid=await post(lesson);assert.equal(invalid.status,400);assert.ok((await invalid.json()).fieldErrors.program);
});
