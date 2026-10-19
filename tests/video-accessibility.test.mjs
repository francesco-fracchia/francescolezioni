import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const code=await readFile(new URL('../lib/learning/video-accessibility.ts',import.meta.url),'utf8');
const {captionsIssue,captionsTranscript,encodeVideoAccessibility,readVideoAccessibility,videoReady}=await import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText).toString('base64'));
const vtt='WEBVTT\n\n00:00.000 --> 00:03.000\nRisolvi x &lt; 2.\n\nseconda\n00:00:04.000 --> 00:00:06.000\nControlla il risultato.';
test('bounded WebVTT accepts normalized cues and produces a text alternative',()=>{
 assert.equal(captionsIssue('\uFEFF'+vtt.replaceAll('\n','\r\n')),'');assert.equal(captionsTranscript(vtt),'Risolvi x < 2.\n\nControlla il risultato.');
 const stored=encodeVideoAccessibility(vtt,' Testo completo ');assert.equal(videoReady(stored),true);assert.equal(readVideoAccessibility(stored).transcript,'Testo completo');
 assert.equal(videoReady(''),false);assert.equal(videoReady(encodeVideoAccessibility(vtt,'')),false);assert.equal(videoReady(encodeVideoAccessibility('','Testo')),false);
});
test('malformed timings, empty cues, excessive input and resource/style blocks are rejected',()=>{
 for(const invalid of ['not WebVTT','WEBVTT',vtt.replace('00:03.000','00:00.000'),vtt.replace('00:03.000','00:99.000'),'WEBVTT\n\n00:00.000 --> 00:01.000\n','WEBVTT\n\nSTYLE\n::cue {background:url(https://other.invalid)}',vtt+'x'.repeat(30000)])assert.ok(captionsIssue(invalid),invalid.slice(0,50));
 assert.equal(readVideoAccessibility('Old unrelated material text'),null);assert.equal(readVideoAccessibility('{"version":1,"captions":[],"transcript":"test"}'),null);
});
