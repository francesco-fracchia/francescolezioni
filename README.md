# Lezioni Francesco

Sito pubblico e piattaforma riservata per lezioni di matematica e informatica.

## Tecnologie

Next.js App Router, React e TypeScript. Su Vercel, i dati applicativi risiedono in Turso e i materiali in un archivio Blob privato. Le aree tutor e studente richiedono autenticazione; il checkout usa Stripe quando configurato e abilitato.

## Sviluppo e verifica

Usare Node.js 22 o 24 e installare le dipendenze con `npm ci`. `npm test` esegue le verifiche automatiche; `npm run build:vercel` prepara la versione per Vercel.

Le credenziali vanno configurate nell’ambiente del servizio e non devono essere aggiunte al repository. Le configurazioni di prova e i database locali restano esclusi dal controllo versione.

Il sito pubblico richiede `SITE_VISIBILITY=public` e `SITE_ORIGIN=https://lezionifrancesco.app`. L’indicizzazione si abilita separatamente con `PUBLIC_SITE_INDEXING=true`; le aree riservate restano escluse.

`npm run check:release` verifica in sola lettura accesso anonimo, metadati, robots, sitemap e protezione degli endpoint privati sul dominio definitivo. Il controllo non invia moduli, pagamenti o notifiche.
