import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
async function compile(file,replace=s=>s){return 'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(replace(await readFile(new URL('../'+file,import.meta.url),'utf8')),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText).toString('base64');}
const policy=await compile('lib/booking/cancellation-policy.ts');
const {cancellationOutcome}=await import(await compile('lib/booking/cancellation-outcome.ts',s=>s.replace("from './cancellation-policy'",'from '+JSON.stringify(policy))));
const paid={status:'cancelled',amount:1900,payment_status:'paid',package_status:'applied',cancelled_by:'student',cancellation_requested_at:'2026-10-17T09:00:00Z'};

test('Recorded percentages use only this participant’s paid quota and never imply a completed refund',()=>{
 for(const [percent,expected] of [[100,'19,00'],[50,'9,50'],[0,'0,00'],[35,'6,65']]){
  const result=cancellationOutcome({...paid,cancellation_refund_percent:percent});
  assert.equal(result.kind,'refund');assert.ok(result.title.includes(expected));assert.ok(result.title.includes(percent+'%'));
  assert.ok(result.details.some(s=>s.includes('non è stata restituita')));
  assert.ok(result.details.some(s=>s.includes('non conferma un trasferimento')));
 }
 const group=cancellationOutcome({...paid,package_status:null,amount:1500,cancellation_refund_percent:50});assert.ok(group.title.includes('7,50'));assert.ok(!JSON.stringify(group).includes('19,00'));
 const single=cancellationOutcome({...paid,amount:2000,cancellation_refund_percent:50});assert.ok(single.title.includes('10,00'));
});
test('Returned units, old cancellations, unknown balances and rescheduling retain distinct outcomes',()=>{
 const returned=cancellationOutcome({...paid,package_status:'returned',cancellation_refund_percent:null});assert.equal(returned.kind,'returned');assert.ok(returned.title.includes('1 lezione restituita'));assert.ok(!returned.title.includes('€'));
 assert.equal(cancellationOutcome({...paid,status:'planned'}),null);
 assert.equal(cancellationOutcome({...paid,status:'planned',package_status:'returned'}).kind,'returned');
 assert.equal(cancellationOutcome({...paid,cancellation_refund_percent:null}).kind,'review');
 assert.equal(cancellationOutcome({...paid,status:'expired',cancellation_refund_percent:100}).kind,'review');
 for(const changes of [{payment_status:'payment_review'},{payment_status:'awaiting'},{amount:null},{amount:-1},{amount:19.5},{cancellation_refund_percent:101}]){
  const result=cancellationOutcome({...paid,cancellation_refund_percent:50,...changes});assert.equal(result.kind,'review');assert.ok(!result.title.includes('€'));
 }
 assert.equal(cancellationOutcome({...paid,package_status:'returned',cancellation_refund_percent:100}).kind,'review');
});
