import {canonicalSiteOrigin, indexingExcluded, indexingExcludedPaths} from './site-release.mjs';

const requiredPages = ['/', '/catalogo', '/prezzi', '/metodo', '/francesco', '/lodi', '/domande', '/privacy', '/piattaforma', '/percorsi', '/esami', '/maturita', '/contatti', '/incontro', '/invita', '/lezioni/matematica', '/lezioni/informatica'];
const excludedPages = ['/gestione', '/studente', '/account', '/accesso', '/acquista', '/prenota', '/pagamento', '/anteprima'];
const legacyOpening = /apertura in preparazione|sto preparando (?:l[’']apertura|il nuovo sito)|sito (?:è |e[’'] )?in preparazione|pre-iscrizioni per novembre 2026/i;
const excludedDirective = value => /(?:^|[\s,;:])(?:noindex|none)(?:$|[\s,;])/i.test(value || '');
const decode = value => value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#(?:39|x27);/gi, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
function absoluteUrl(value) {
  try { return typeof value === 'string' && value.startsWith('https://') ? new URL(value).href : null; }
  catch { return null; }
}
function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([^\s=<>/]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)].map(m => [m[1].toLowerCase(), decode(m[2] ?? m[3] ?? m[4])]));
}
export function inspectPublicPage(html, headers, path, origin = canonicalSiteOrigin) {
  const failures = [], expected = origin + path;
  const tags = [...html.matchAll(/<(meta|link)\b[^>]*>/gi)].map(m => ({tag:m[1].toLowerCase(), ...attributes(m[0])}));
  const metas = tags.filter(t => t.tag === 'meta');
  if (excludedDirective(headers.get('x-robots-tag')) || metas.some(t => /^(robots|googlebot)$/i.test(t.name || '') && excludedDirective(t.content))) failures.push('Direttiva noindex/none presente sulla pagina pubblica.');
  const canonicals = tags.filter(t => t.tag === 'link' && (t.rel || '').toLowerCase().split(/\s+/).includes('canonical'));
  if (canonicals.length !== 1 || absoluteUrl(canonicals[0].href) !== absoluteUrl(expected)) failures.push('Canonical assente, duplicato o diverso dal dominio definitivo.');
  if (absoluteUrl(metas.find(t => t.property?.toLowerCase() === 'og:url')?.content) !== absoluteUrl(expected)) failures.push('Indirizzo Open Graph non allineato al canonical.');
  if (!/<title>\s*[^<]+<\/title>/i.test(html) || !metas.some(t => t.name?.toLowerCase() === 'description' && t.content?.trim())) failures.push('Titolo o descrizione mancanti.');
  const visible = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '').replace(/<[^>]*>/g, ' ');
  if (legacyOpening.test(decode(visible)) || metas.some(t => legacyOpening.test(t.content || ''))) failures.push('Testo di apertura provvisoria ancora presente.');
  const graphs = [];
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (attributes(match[1]).type?.toLowerCase() !== 'application/ld+json') continue;
    try { const value = JSON.parse(match[2]); graphs.push(...(Array.isArray(value) ? value : [value])); }
    catch { failures.push('Dati strutturati JSON-LD non validi.'); }
  }
  const nodes = graphs.flatMap(g => Array.isArray(g['@graph']) ? g['@graph'] : [g]);
  if (!nodes.some(n => ['WebPage','FAQPage'].includes(n['@type']) && absoluteUrl(n.url) === absoluteUrl(expected))) failures.push('Dati strutturati della pagina assenti o non allineati al canonical.');
  const organization = nodes.find(n => n['@type'] === 'EducationalOrganization');
  if (!organization || absoluteUrl(organization.url) !== absoluteUrl(origin) || organization.address?.streetAddress !== 'Via San Colombano 43' || organization.address?.addressLocality !== 'Lodi') failures.push('Attività o indirizzo mancanti/non aggiornati nei dati strutturati.');
  function walk(value) {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (['@id','url','item','serviceUrl'].includes(key) && typeof child === 'string') {
        try { if (new URL(child).origin !== origin) failures.push('Un riferimento JSON-LD usa un dominio diverso da quello definitivo.'); }
        catch { failures.push('Un riferimento JSON-LD non è un indirizzo assoluto valido.'); }
      }
      if (key === 'description' && typeof child === 'string' && legacyOpening.test(child)) failures.push('Dati strutturati con apertura ancora provvisoria.');
      walk(child);
    }
  }
  graphs.forEach(walk);
  return [...new Set(failures)];
}

export function auditTarget(value, local = false) {
  const url = new URL(value);
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw Error('Usa la sola origine del sito, senza percorso, credenziali o parametri.');
  if (local) {
    if (!['localhost','127.0.0.1','[::1]'].includes(url.hostname) || !['http:','https:'].includes(url.protocol)) throw Error('Il collaudo locale è limitato a un indirizzo loopback.');
  } else if (url.origin !== canonicalSiteOrigin) throw Error('Il controllo di rilascio deve essere eseguito su ' + canonicalSiteOrigin + '. Per una copia locale usa --local.');
  return url.origin;
}

export async function auditRelease({target = canonicalSiteOrigin, local = false, fetcher = fetch} = {}) {
  target = auditTarget(target, local);
  const checks = [], observations = new Map();
  const add = (path, failures) => checks.push({path, passed:failures.length === 0, ...(observations.get(path) || {}), failures});
  async function read(path) {
    try {
      const response = await fetcher(target + path, {method:'GET', redirect:'manual', credentials:'omit', cache:'no-store', headers:{Accept:'text/html,application/xml,application/json,text/plain'}, signal:AbortSignal.timeout(10000)});
      observations.set(path, {status:response.status, contentType:response.headers.get('content-type')});
      // No response bodies, account data or exception details enter the report.
      return {response, body:await response.text()};
    } catch { add(path, ['Richiesta non riuscita o scaduta.']); return null; }
  }
  const robots = await read('/robots.txt');
  if (robots) {
    const errors = [];
    if (robots.response.status !== 200) errors.push('robots.txt non risponde 200 senza reindirizzamenti.');
    let agents = [], afterRules = false;
    const directives = [];
    for (const line of robots.body.split(/\r?\n/)) {
      const match = line.replace(/#.*/, '').match(/^\s*([\w-]+)\s*:\s*(.*?)\s*$/);
      if (!match) continue;
      const [, rawKey, value] = match, key = rawKey.toLowerCase();
      if (key === 'user-agent') { if (afterRules) agents = []; agents.push(value.toLowerCase()); afterRules = false; }
      else if (['allow','disallow'].includes(key)) { directives.push({agents:[...agents], key, value}); afterRules = true; }
    }
    if (directives.some(d => d.key === 'disallow' && ['/', '/*'].includes(d.value) && d.agents.some(a => ['*','googlebot'].includes(a)))) errors.push('robots.txt blocca ancora tutto il sito.');
    for (const path of indexingExcludedPaths) if (!directives.some(d => d.agents.includes('*') && d.key === 'disallow' && (d.value === path || d.value === path + '/'))) errors.push('Esclusione robots mancante: ' + path);
    if (!robots.body.split(/\r?\n/).some(line => line.trim() === 'Sitemap: ' + canonicalSiteOrigin + '/sitemap.xml')) errors.push('Riferimento alla sitemap del dominio definitivo assente.');
    add('/robots.txt', errors);
  }
  const sitemap = await read('/sitemap.xml');
  const paths = new Set(requiredPages);
  if (sitemap) {
    const errors = [];
    if (sitemap.response.status !== 200 || !/<urlset\b/.test(sitemap.body)) errors.push('Sitemap assente, non valida o reindirizzata.');
    const urls = [...sitemap.body.matchAll(/<loc>\s*([^<]*)\s*<\/loc>/g)].map(m => decode(m[1].trim()));
    if (!urls.length || urls.length > 100) errors.push('Sitemap vuota o oltre il limite del controllo (100 pagine).');
    if (new Set(urls).size !== urls.length) errors.push('La sitemap contiene indirizzi duplicati.');
    for (const value of urls.slice(0, 100)) {
      try {
        const url = new URL(value);
        if (url.origin !== canonicalSiteOrigin || url.search || url.hash || url.username || url.password || indexingExcluded(url.pathname)) errors.push('Sitemap con indirizzo non canonico o riservato.');
        else paths.add(url.pathname);
      } catch { errors.push('Sitemap con indirizzo non valido.'); }
    }
    for (const path of requiredPages) if (!urls.includes(canonicalSiteOrigin + path)) errors.push('Pagina pubblica mancante nella sitemap: ' + path);
    add('/sitemap.xml', [...new Set(errors)]);
  }
  // Bounded concurrency; every check is an anonymous GET, never a checkout or write.
  const queue = [...paths];
  await Promise.all(Array.from({length:4}, async () => {
    while (queue.length) {
      const path = queue.shift(), result = await read(path);
      if (!result) continue;
      const errors = [];
      if (result.response.status !== 200) errors.push('Pagina non raggiungibile anonimamente con risposta 200.');
      if (!/text\/html/i.test(result.response.headers.get('content-type') || '')) errors.push('La risposta non è una pagina HTML.');
      errors.push(...inspectPublicPage(result.body, result.response.headers, path));
      add(path, errors);
    }
  }));
  for (const path of excludedPages) {
    const result = await read(path);
    if (!result) continue;
    const errors = [];
    if (!excludedDirective(result.response.headers.get('x-robots-tag'))) errors.push('Area esclusa senza intestazione noindex.');
    if (result.response.status >= 500) errors.push('Area esclusa non disponibile: impossibile collaudarne il comportamento.');
    if (['/gestione','/studente','/account','/acquista'].includes(path) && result.response.status === 200 && !/href=["']\/accesso(?:[?"'])/.test(result.body)) errors.push('Non è riconoscibile l’invito all’accesso anonimo.');
    add(path, errors);
  }
  for (const path of ['/api/studente', '/api/gestione/esportazione']) {
    const result = await read(path);
    if (!result) continue;
    add(path, [
      ...(![401,403].includes(result.response.status) ? ['L’API riservata non rifiuta la richiesta anonima con 401/403.'] : []),
      ...(!excludedDirective(result.response.headers.get('x-robots-tag')) ? ['Intestazione noindex assente sull’API.'] : []),
    ]);
  }
  checks.sort((a,b) => a.path.localeCompare(b.path));
  return {scope:'R12 — accesso anonimo e indicizzazione',mode:local?'local':'domain',target,canonical:canonicalSiteOrigin,checkedAt:new Date().toISOString(),passed:checks.every(c => c.passed),checks};
}
