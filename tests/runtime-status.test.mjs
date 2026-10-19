import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
async function compiled(file,replace=s=>s){return 'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(replace(await readFile(new URL('../'+file,import.meta.url),'utf8')),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText).toString('base64');}
const pure=await compiled('lib/runtime-status.ts');
const {paymentMode,runtimeLabel}=await import(pure);
const values={};
globalThis.__r03={env:values};
const payment=await compiled('lib/booking/runtime.ts',s=>s.replace("import { env } from '@/lib/runtime-env';",'const env=globalThis.__r03.env;'));
const {paymentConfig}=await import(payment);
globalThis.__r03.paymentConfig=paymentConfig;
globalThis.__r03.emailConfig=()=>({ready:values.NOTIFICATIONS_MODE==='live'&&!!values.RESEND_API_KEY&&!!values.EMAIL_FROM});
const {currentRuntimeStatus}=await import(await compiled('lib/current-runtime-status.ts',s=>s.replace("import {env} from '@/lib/runtime-env';",'const env=globalThis.__r03.env;').replace("import {paymentConfig} from '@/lib/booking/runtime';",'const paymentConfig=globalThis.__r03.paymentConfig;').replace("import {emailConfig} from '@/lib/notifications/runtime';",'const emailConfig=globalThis.__r03.emailConfig;').replace("from './runtime-status'",'from '+JSON.stringify(pure))));

test('Runtime labels distinguish disabled, test and explicitly enabled live payments, without disclosing configuration',()=>{
 assert.equal(paymentMode(false,true),'disabled');
 assert.equal(paymentMode(true,false),'test');
 assert.equal(paymentMode(true,true),'live');
 assert.equal(currentRuntimeStatus().paymentMode,'disabled');
 Object.assign(values,{SITE_VISIBILITY:'private',SITE_ORIGIN:'https://site.example',STRIPE_SECRET_KEY:'sk_test_synthetic',NOTIFICATIONS_MODE:'preview'});
 assert.equal(currentRuntimeStatus().paymentMode,'test');assert.match(runtimeLabel(currentRuntimeStatus()),/Sito privato.*Email in anteprima.*prova/);
 values.STRIPE_SECRET_KEY='sk_live_synthetic';assert.equal(currentRuntimeStatus().paymentMode,'disabled');
 values.PAYMENT_LIVE_ENABLED='1';assert.equal(currentRuntimeStatus().paymentMode,'disabled');
 values.STRIPE_WEBHOOK_SECRET='whsec_synthetic';values.SITE_VISIBILITY='public';values.NOTIFICATIONS_MODE='live';values.RESEND_API_KEY='re_synthetic';values.EMAIL_FROM='Fixture <fixture@example.invalid>';
 const live=currentRuntimeStatus();assert.deepEqual(live,{visibility:'public',emailMode:'live',paymentMode:'live'});assert.doesNotMatch(runtimeLabel(live),/privato|prova|anteprima/);
 assert.deepEqual(Object.keys(live).sort(),['emailMode','paymentMode','visibility']);assert.doesNotMatch(JSON.stringify(live),/sk_|whsec_|re_synthetic|example.invalid/);
 values.SITE_ORIGIN='http://site.example';assert.equal(currentRuntimeStatus().paymentMode,'disabled');
 values.SITE_VISIBILITY=undefined;assert.doesNotMatch(runtimeLabel(currentRuntimeStatus()),/Sito privato|Sito pubblico/);
 for(const key of Object.keys(values))delete values[key];
});
