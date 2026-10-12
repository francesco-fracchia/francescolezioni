import test from 'node:test';
import assert from 'node:assert/strict';
import { createBlobBucket } from '../lib/vercel/blob.mjs';
import { vercelResourcesConfigured, vercelRuntimeReady } from '../lib/vercel/runtime.mjs';
import { signUploadClaim, readUploadClaim } from '../lib/uploads/claims.mjs';
const secret='test-only-private-upload-signing-secret',storeId='store_test_private';
test('Turso plus connected Blob uses remote resources but remains closed until explicitly ready',()=>{
 const config={TURSO_DATABASE_URL:'libsql://fixture.turso.io',TURSO_AUTH_TOKEN:'fixture',BLOB_STORE_ID:storeId};
 assert.equal(vercelResourcesConfigured(config),true);assert.equal(vercelRuntimeReady(config),false);
 assert.equal(vercelResourcesConfigured({...config,TURSO_AUTH_TOKEN:''}),false);
 assert.equal(vercelRuntimeReady({...config,VERCEL_RUNTIME_READY:'1'}),true);
});
test('Upload authorization rejects tampering, expiry and absent server secret',()=>{
 const claim={actor:'actor',version:1,key:'learning/private',kind:'material',target:'module',expires:Date.now()+1000};
 const proof=signUploadClaim(claim,secret);assert.deepEqual(readUploadClaim(proof,secret),claim);
 assert.throws(()=>readUploadClaim(proof,secret,claim.expires+1),/expired/);
 assert.throws(()=>readUploadClaim(proof+'x',secret),/Invalid/);
 const altered=Buffer.from(JSON.stringify({...claim,target:'another-module'})).toString('base64url')+'.'+proof.split('.')[1];
 assert.throws(()=>readUploadClaim(altered,secret),/Invalid/);
 assert.throws(()=>signUploadClaim(claim,''),/unavailable/);
});
test('Private Blob pins the selected object version and verifies partial responses without exposing URLs',async()=>{
 const calls=[],bytes=new TextEncoder().encode('0123456789');
 const bucket=createBlobBucket({storeId,sdk:{async head(key,o){calls.push('head');assert.equal(o.storeId,storeId);return {size:10,etag:'"v1"',uploadedAt:new Date(0)};},async get(key,o){calls.push('get');assert.equal(o.access,'private');assert.equal(o.headers['If-Match'],'"v1"');assert.equal(o.headers.Range,'bytes=2-5');return {stream:new Blob([bytes.slice(2,6)]).stream(),blob:{etag:'"v1"'},headers:new Headers({'content-range':'bytes 2-5/10'})};}}});
 const file=await bucket.get('learning/private',{range:new Headers({range:'bytes=2-5'})});assert.equal(file.size,10);assert.equal(await new Response(file.body).text(),'2345');assert.deepEqual(file.range,{offset:2,length:4});assert.equal(file.url,undefined);
 const before=calls.length;await assert.rejects(bucket.get('learning/private',{range:new Headers({range:'bytes=20-'})}),e=>e.code==='RANGE_NOT_SATISFIABLE');assert.equal(calls.length,before+1);
 await assert.rejects(bucket.get('https://another-store.example/file'),/Invalid/);
});
test('Blob uploads stay private, bounded and cannot overwrite an object',async()=>{
 let calls=0;const bucket=createBlobBucket({storeId,sdk:{async put(key,bytes,options){calls++;assert.equal(options.access,'private');assert.equal(options.allowOverwrite,false);assert.equal(options.addRandomSuffix,false);assert.equal(options.contentType,'application/pdf');return {etag:'"v1"'};}}});
 assert.equal((await bucket.put('learning/private',new Blob(['%PDF-1.7']).stream(),{httpMetadata:{contentType:'application/pdf'}})).size,8);
 await assert.rejects(bucket.put('learning/too-big',new Uint8Array(51*1024*1024)),/exceeds 50 MB/);assert.equal(calls,1);
});
test('Direct upload authorization permits only PUT of one exact file within five minutes',async()=>{
 let ceiling;const bucket=createBlobBucket({storeId,sdk:{async issueSignedToken(options){ceiling=options;assert.deepEqual(options.operations,['put']);assert.equal(options.pathname,'homework/tasks/private');assert.deepEqual(options.allowedContentTypes,['application/pdf']);assert.equal(options.maximumSizeInBytes,100);assert.ok(options.validUntil<=Date.now()+300000);return {test:true};},async presignUrl(token,options){assert.equal(token.test,true);assert.equal(options.access,'private');assert.equal(options.validUntil,ceiling.validUntil);assert.equal(options.allowOverwrite,false);assert.equal(options.addRandomSuffix,false);return {presignedUrl:'https://blob.example/scoped-put'};}}});
 assert.equal(await bucket.presignUpload('homework/tasks/private','application/pdf',100),'https://blob.example/scoped-put');
});
