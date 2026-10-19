import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {privateAccessAllowed} from '../lib/node/private-access.mjs';
import {previewPathAllowed} from '../lib/site-preview.mjs';
const unavailable={prepare(){throw new Error('database unavailable');}};
test('optimized brand assets render during outages; other private files remain protected',async()=>{
 for(const width of [256,512,768]){
  const path=`/francesco-fracchia-logo-${width}.webp`;
  assert.equal(await privateAccessAllowed(new Request('https://lessons.example'+path),unavailable,'private'),true);
  const bytes=await readFile(new URL('../public'+path,import.meta.url));assert.equal(bytes.subarray(8,12).toString(),'WEBP');assert.ok(bytes.length<50000);
 }
 for(const path of ['/francesco-fracchia-logo-999.webp','/api/gestione/materiali/logo.webp','/images/francesco-ritratto-320.avif','/images/lezioni-francesco-social.png']){
  assert.equal(await privateAccessAllowed(new Request('https://lessons.example'+path),unavailable,'private'),false);
 }
 assert.equal(previewPathAllowed('/images/francesco-ritratto-320.avif'),true);
 assert.equal(previewPathAllowed('/gestione/allegati/file.avif'),false);
});
