import test from 'node:test';
import assert from 'node:assert/strict';
import {auditRelease, auditTarget, inspectPublicPage} from '../lib/release-audit.mjs';
import {canonicalSiteOrigin as origin, indexingExcludedPaths} from '../lib/site-release.mjs';

const paths=['/', '/catalogo', '/prezzi', '/metodo', '/francesco', '/lodi', '/domande', '/privacy', '/piattaforma', '/percorsi', '/esami', '/maturita', '/contatti', '/incontro', '/invita', '/lezioni/matematica', '/lezioni/informatica'];
function html(path, {canonical=origin+path, robots='index, follow', graphOrigin=origin, description='Lezioni a Lodi e online su appuntamento.'}={}) {
  const graph={'@graph':[{'@type':'WebPage',url:origin+path},{'@type':'EducationalOrganization',url:graphOrigin,description,address:{streetAddress:'Via San Colombano 43',addressLocality:'Lodi'}}]};
  return `<html><head><meta content='${description}' name='description'><link href='${canonical}' rel='canonical'><meta name='robots' content='${robots}'><meta property='og:url' content='${origin+path}'><title>Lezioni</title><script type="application/ld+json">${JSON.stringify(graph)}</script></head><body><h1>Lezioni</h1></body></html>`;
}
const robots = 'User-agent: *\nAllow: /\n'+indexingExcludedPaths.map(p=>'Disallow: '+p).join('\n')+'\nSitemap: '+origin+'/sitemap.xml\n';
const sitemap = values => '<urlset>'+values.map(p=>'<url><loc>'+origin+p+'</loc></url>').join('')+'</urlset>';
const noindex={'Content-Type':'text/html','X-Robots-Tag':'noindex, nofollow'};
function fixture(overrides={}) {
  const calls=[];
  const fetcher=async (url, options)=>{
    calls.push({url, options});
    const path=new URL(url).pathname;
    if(overrides[path])return overrides[path](url,options);
    if(path==='/robots.txt')return new Response(robots);
    if(path==='/sitemap.xml')return new Response(sitemap(paths));
    if(paths.includes(path))return new Response(html(path),{headers:{'Content-Type':'text/html'}});
    if(path.startsWith('/api/'))return Response.json({error:'Accesso richiesto'},{status:403,headers:noindex});
    return new Response('<a href="/accesso">Accedi</a>',{headers:noindex});
  };
  return {fetcher,calls};
}
test('release audit checks all sitemap pages and protected paths without cookies or writes',async()=>{
 const {fetcher,calls}=fixture({'/sitemap.xml':()=>new Response(sitemap([...paths,'/esami/analisi-1']))});
 const wrapped=async(url,options)=>new URL(url).pathname==='/esami/analisi-1'?new Response(html('/esami/analisi-1'),{headers:{'Content-Type':'text/html'}}):fetcher(url,options);
 const result=await auditRelease({fetcher:wrapped});
 assert.equal(result.passed,true,JSON.stringify(result.checks.filter(c=>!c.passed)));
 assert.ok(result.checks.some(c=>c.path==='/esami/analisi-1'));
 assert.ok(calls.every(c=>c.options.method==='GET'&&c.options.credentials==='omit'&&c.options.redirect==='manual'&&!Object.keys(c.options.headers).some(k=>/cookie|authorization/i.test(k))));
});
test('release audit rejects private landing, robots blockade, wrong canonical and stale schema',async()=>{
 const {fetcher}=fixture({
  '/':()=>new Response('',{status:307,headers:{Location:'/preparazione'}}),
  '/robots.txt':()=>new Response('User-agent: *\nDisallow: /\n'),
  '/prezzi':()=>new Response(html('/prezzi',{canonical:'https://old.example/prezzi',robots:'noindex',graphOrigin:'https://old.example',description:'Sede confermata, apertura in preparazione.'}),{headers:{'Content-Type':'text/html'}}),
 });
 const result=await auditRelease({fetcher});
 assert.equal(result.passed,false);
 assert.ok(result.checks.filter(c=>!c.passed).length>=3);
 assert.ok(result.checks.find(c=>c.path==='/prezzi').failures.some(f=>/canonical/i.test(f)));
});
test('sitemap cannot make the audit fetch private or external addresses',async()=>{
 const {fetcher,calls}=fixture({'/sitemap.xml':()=>new Response(sitemap([...paths,'/studente'])+'<loc>https://evil.example/secret</loc>')});
 const result=await auditRelease({fetcher});
 assert.equal(result.passed,false);assert.ok(calls.every(c=>new URL(c.url).origin===origin));
 assert.equal(calls.filter(c=>new URL(c.url).pathname==='/studente').length,1);
});
test('public noindex in HTTP headers and invalid JSON-LD fail even with valid canonical',()=>{
 assert.deepEqual(inspectPublicPage(html('/',{canonical:origin}),new Headers(),'/'),[]);
 assert.ok(inspectPublicPage(html('/'),new Headers({'X-Robots-Tag':'googlebot: noindex'}),'/').some(f=>f.includes('noindex')));
 assert.ok(inspectPublicPage(html('/').replace('application/ld+json','text/javascript'),new Headers(),'/').some(f=>f.includes('strutturati')));
 assert.ok(inspectPublicPage(html('/').replace('"@graph"','INVALID'),new Headers(),'/').some(f=>f.includes('non validi')));
});
test('audit recovers from network failures with a failing report and no sensitive error detail',async()=>{
 const {fetcher}=fixture({'/prezzi':()=>{throw Error('PRIVATE_TOKEN_MUST_NOT_LEAK');}});
 const result=await auditRelease({fetcher});assert.equal(result.passed,false);
 assert.ok(result.checks.find(c=>c.path==='/prezzi').failures.length);
 assert.ok(!JSON.stringify(result).includes('PRIVATE_TOKEN'));
});
test('local audit cannot certify an external host or silently replace the final domain',()=>{
 assert.equal(auditTarget('http://127.0.0.1:5187',true),'http://127.0.0.1:5187');
 for(const [url,local] of [['https://evil.example',true],['https://francescolezioni.vercel.app',false],['https://user:secret@lezionifrancesco.app',false],['https://lezionifrancesco.app/?token=x',false]])assert.throws(()=>auditTarget(url,local));
});
