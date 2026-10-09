import test from 'node:test';
import assert from 'node:assert/strict';
import {createPreviewToken,localPreviewAllowed,previewAllowed,previewConfigured,previewCookie,previewLifetime,previewOriginAllowed,previewPathAllowed,validPreviewPassword} from '../lib/site-preview.mjs';
const config={APP_RUNTIME:'vercel',VERCEL:'1',SITE_PREVIEW_PASSWORD:'fixture-preview-key-used-only-in-tests'};
const now=Date.now();
const request=(cookie,url='https://preview.example/')=>new Request(url,{headers:{cookie:'ff_site_preview='+cookie}});
test('Private site preview expires, rejects tampering and revokes immediately on password rotation',()=>{
 assert.equal(previewConfigured({}),false);
 assert.equal(previewConfigured({SITE_PREVIEW_PASSWORD:'short'}),false);
 assert.equal(validPreviewPassword('wrong',config),false);
 assert.equal(validPreviewPassword(config.SITE_PREVIEW_PASSWORD,config),true);
 const token=createPreviewToken(config,now);
 assert.equal(previewAllowed(request(token),config,now),true);
 assert.equal(previewAllowed(request(token),config,now+previewLifetime*1000),false);
 assert.equal(previewAllowed(request(token),{...config,SITE_PREVIEW_PASSWORD:'another-test-preview-key-long-enough'},now),false);
 const chunks=token.split('.');chunks[2]='a'.repeat(22);
 assert.equal(previewAllowed(request(chunks.join('.')),config,now),false);
 assert.equal(previewAllowed(new Request('https://preview.example/',{headers:{cookie:'ff_site_preview='+token+'; ff_site_preview='+token}}),config,now),false);
 assert.equal(previewAllowed(request('local'),config,now),false);
 assert.equal(previewAllowed(request(token),{},now),false);
});
test('Password-free preview is limited to a loopback Vercel build outside the provider',()=>{
 const local={APP_RUNTIME:'vercel'};
 assert.equal(localPreviewAllowed(request('local','http://127.0.0.1:5186'),local),true);
 assert.equal(previewAllowed(request('local','http://127.0.0.1:5186'),local),true);
 for(const remote of [{...local,VERCEL:'1'},{...local,VERCEL_ENV:'production'},{APP_RUNTIME:'node'}])assert.equal(localPreviewAllowed(request('local','http://127.0.0.1:5186'),remote),false);
 assert.equal(localPreviewAllowed(request('local','https://preview.example'),local),false);
 assert.equal(previewAllowed(request('local','https://preview.example'),local),false);
});
test('Preview is restricted to marketing pages; CSRF and cookies retain independent protection',()=>{
 for(const path of ['/','/francesco','/prezzi','/esami/analisi-1','/lezioni/informatica','/images/francesco-fracchia.jpg'])assert.equal(previewPathAllowed(path),true,path);
 for(const path of ['/gestione','/studente','/account','/api/incontri','/api/materiali/file.pdf','/gestione/file.jpg','/esami/../studente','/images/private.pdf'])assert.equal(previewPathAllowed(path),false,path);
 assert.equal(previewOriginAllowed(new Request('https://preview.example/api/anteprima',{headers:{origin:'https://other.example'}})),false);
 assert.equal(previewOriginAllowed(new Request('https://preview.example/api/anteprima',{headers:{origin:'https://preview.example','sec-fetch-site':'cross-site'}})),false);
 assert.equal(previewOriginAllowed(new Request('https://preview.example/api/anteprima',{headers:{origin:'https://preview.example'}})),true);
 assert.match(previewCookie(request(''),null),/HttpOnly; SameSite=Strict; Max-Age=0; Secure/);
});
