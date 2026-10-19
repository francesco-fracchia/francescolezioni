import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';

globalThis.__seoBindings={};
const cache=new Map();
async function compiled(path){
 if(cache.has(path))return cache.get(path);
 let source=await readFile(new URL('../'+path,import.meta.url),'utf8');
 source=source.replace("import { env } from './runtime-env';",'const env=globalThis.__seoBindings;');
 for(const match of [...source.matchAll(/from '(\.\/[^']+)'/g)]){
  if(match[1].endsWith('.mjs')){source=source.replaceAll("from '"+match[1]+"'",'from '+JSON.stringify(new URL('../'+path.slice(0,path.lastIndexOf('/')+1)+match[1].slice(2),import.meta.url).href));continue;}
  const dependency=path.slice(0,path.lastIndexOf('/')+1)+match[1].slice(2)+'.ts';
  source=source.replaceAll("from '"+match[1]+"'",'from '+JSON.stringify(await compiled(dependency)));
 }
 const result='data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText).toString('base64');cache.set(path,result);return result;
}
const seo=await import(await compiled('lib/site-seo.ts'));
const {publicPages}=await import(await compiled('lib/public-pages.ts'));
const {publicGraph,serializeJsonLd}=await import(await compiled('lib/public-schema.ts'));
const {faqEntries}=await import(await compiled('lib/public-faq.ts'));

test('private SEO stays closed; public sitemap contains only canonical public routes',()=>{
 assert.equal(seo.publicPageMetadata('/').robots.index,false);
 assert.deepEqual(seo.searchRobots().rules,{userAgent:'*',disallow:'/'});
 assert.deepEqual(seo.publicSitemap(),[]);
 globalThis.__seoBindings.SITE_ORIGIN='https://lezionifrancesco.app';
 globalThis.__seoBindings.SITE_VISIBILITY='public';
 globalThis.__seoBindings.PUBLIC_SITE_INDEXING='true';
 try{
  const pages=seo.publicSitemap();assert.equal(pages.length,Object.keys(publicPages).length-1);
  assert.equal(new Set(pages.map(p=>p.url)).size,pages.length);
  for(const path of Object.keys(publicPages)){
   const meta=seo.publicPageMetadata(path);assert.equal(meta.alternates.canonical,'https://lezionifrancesco.app'+path);
   assert.equal(meta.openGraph.url,meta.alternates.canonical);assert.equal(meta.robots.index,path!=='/acquista');assert.ok(meta.description.length>35);
  }
  for(const path of ['/gestione','/studente','/account','/accesso','/api/incontri','/pagamento','/unknown']){
   assert.equal(seo.publicPageMetadata(path).robots.index,false);
   assert.ok(!pages.some(p=>p.url==='https://lezionifrancesco.app'+path));
  }
  assert.ok(!pages.some(p=>p.url.endsWith('/acquista')));
  assert.ok(seo.searchRobots().rules.disallow.includes('/api'));
  globalThis.__seoBindings.SITE_ORIGIN='https://user:secret@evil.example';
  assert.ok(!seo.siteOrigin().includes('evil'));
 }finally{delete globalThis.__seoBindings.SITE_ORIGIN;delete globalThis.__seoBindings.PUBLIC_SITE_INDEXING;delete globalThis.__seoBindings.SITE_VISIBILITY;}
});
test('private visibility, missing origin and preview domains cannot enable indexing',()=>{
 const bindings=globalThis.__seoBindings;
 try{
  bindings.PUBLIC_SITE_INDEXING='true';bindings.SITE_VISIBILITY='private';bindings.SITE_ORIGIN='https://lezionifrancesco.app';
  assert.equal(seo.publicIndexingEnabled(),false);assert.deepEqual(seo.publicSitemap(),[]);
  bindings.SITE_VISIBILITY='public';
  for(const value of ['', 'https://francescolezioni.vercel.app','https://francesco-fracchia-lezioni.francescofracchia.chatgpt.site','https://evil.example','http://lezionifrancesco.app']){
   bindings.SITE_ORIGIN=value;assert.equal(seo.publicIndexingEnabled(),false);assert.deepEqual(seo.publicSitemap(),[]);
  }
  delete bindings.SITE_ORIGIN;assert.equal(seo.siteOrigin(),'https://lezionifrancesco.app');
 }finally{for(const key of ['PUBLIC_SITE_INDEXING','SITE_VISIBILITY','SITE_ORIGIN'])delete bindings[key];}
});
test('FAQ data matches rendered answers and structured content contains no invented ratings or scarcity',()=>{
 const graph=publicGraph('/domande','https://lessons.example')['@graph'];
 const faq=graph.find(item=>item['@type']==='FAQPage');
 assert.deepEqual(faq.mainEntity.map(item=>[item.name,item.acceptedAnswer.text]),faqEntries);
 const home=publicGraph('/','https://lessons.example');
 const prices=publicGraph('/prezzi','https://lessons.example');
 assert.deepEqual(prices['@graph'].filter(item=>item['@type']==='Service').map(item=>item.offers.price),[20,15]);
 assert.ok(home['@graph'].filter(item=>item['@type']==='Service').every(item=>!item.offers));
 assert.doesNotMatch(JSON.stringify(home),/aggregateRating|reviewCount|remaining|InStock/);
 const attack=serializeJsonLd({text:'</script><script>alert(1)</script>\u2028'});
 assert.ok(!attack.includes('<'));assert.equal(JSON.parse(attack).text,'</script><script>alert(1)</script>\u2028');
 assert.deepEqual(publicGraph('/gestione','https://lessons.example')['@graph'],[]);
});

test('public share cards use the canonical local 1200×630 image without opening private metadata',async()=>{
 const meta=seo.publicPageMetadata('/');
 assert.equal(meta.twitter.card,'summary_large_image');
 assert.deepEqual(meta.openGraph.images,[{url:'https://lezionifrancesco.app/images/lezioni-francesco-social.png',width:1200,height:630,alt:'Francesco Fracchia · Matematica e informatica, a Lodi e online'}]);
 assert.equal(meta.twitter.images[0],meta.openGraph.images[0].url);
 const png=await readFile(new URL('../public/images/lezioni-francesco-social.png',import.meta.url));
 assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),1200);assert.equal(png.readUInt32BE(20),630);
 assert.equal(seo.publicPageMetadata('/studente').openGraph,undefined);
 assert.equal(meta.robots.index,false);
});
