import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
async function moduleAt(path){const s=await readFile(new URL('../'+path,import.meta.url),'utf8');return import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText).toString('base64'));}
const {isPublicPage,activePublicNavigation,publicNavigation}=await moduleAt('lib/public-navigation.ts');
const {publicSlotSelection}=await moduleAt('lib/public-slot-selection.ts');
test('marketing shell excludes accounts, management, APIs and token-bearing payment flows',()=>{
 for(const path of ['/','/prezzi','/metodo','/lodi','/domande','/esami/java','/lezioni/matematica'])assert.equal(isPublicPage(path),true,path);
 for(const path of ['/gestione','/gestione/prenotazioni','/studente','/account','/accesso','/api/incontri','/prenota','/pagamento','/unrelated'])assert.equal(isPublicPage(path),false,path);
 assert.ok(publicNavigation.every(p=>p.href.startsWith('/')&&!p.href.includes('#')));
 assert.equal(activePublicNavigation('/esami/java'),'/catalogo');assert.equal(activePublicNavigation('/lezioni/matematica'),'/catalogo');assert.equal(activePublicNavigation('/piattaforma'),'/metodo');assert.equal(activePublicNavigation('/prezzi'),'/prezzi');
});
test('slot links accept one UUID and reject duplicated or arbitrary input',()=>{
 const id='cc495765-0a48-4c1b-84f6-671f0c76a7e3';assert.equal(publicSlotSelection(id),id);
 for(const value of [undefined,[id],['a','b'],'not-a-slot',id+'?redirect=x','<script>','',id+'\n'])assert.equal(publicSlotSelection(value),'');
});
