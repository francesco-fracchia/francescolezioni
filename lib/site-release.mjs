export const canonicalSiteOrigin = 'https://lezionifrancesco.app';
export const indexingExcludedPaths = [
  '/gestione', '/studente', '/account', '/accesso', '/api', '/acquista',
  '/prenota', '/pagamento', '/anteprima', '/preparazione', '/indisponibile',
  '/signin-with-chatgpt', '/callback', '/signout-with-chatgpt',
];
export function httpsOrigin(value) {
  if (typeof value !== 'string' || value !== value.trim()) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password &&
      url.pathname === '/' && !url.search && !url.hash && !url.port ? url.origin : null;
  } catch { return null; }
}
export function indexingExcluded(path) {
  return indexingExcludedPaths.some(prefix => path === prefix || path.startsWith(prefix + '/'));
}
// Indexing requires explicit public access and the owner-chosen final domain.
export function releaseIndexingAllowed({visibility, indexing, origin}) {
  return visibility === 'public' && indexing === 'true' && httpsOrigin(origin) === canonicalSiteOrigin;
}
