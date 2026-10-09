# Francesco · Lezioni

Piattaforma per lezioni di matematica e informatica, in presenza a Lodi e online.

Next.js App Router, React, TypeScript. Il codice comprende sito pubblico, account tutor/studenti/genitori, calendario, incontri gratuiti, corsi e materiali protetti, compiti, pacchetti e bonus inviti. Email e pagamenti reali restano disattivati.

## Hosting

- **Sites/Cloudflare**: runtime con binding D1 e R2 e migrazioni in `drizzle`. Il Site attuale rimane privato.
- **Hostinger/VPS**: runtime Node indipendente, SQLite e materiali su disco privato persistente. Istruzioni in `deploy/hostinger/README.md`.
- **Vercel**: build Next.js compatibile, adapter remoto per D1/R2 e pagina di preparazione finché i servizi non sono pronti. L’ambiente operativo resta chiuso. Provisioning, collaudo remoto e upload diretti dei file grandi sono ancora da completare: vedere `deploy/vercel/README.md`.

Questa repository contiene sorgenti e test, senza credenziali, dati degli studenti, materiali caricati o cronologia privata del workspace. Non contiene un database inizializzato né account amministrativi predefiniti.

## Verifica locale

Node 22.16+ della serie 22 oppure Node 24.

```sh
npm ci
npm test
npx tsc --noEmit
```

Per le istruzioni di esecuzione e le variabili necessarie consultare la guida del provider scelto. Non inserire password o chiavi API nella repository. Un nuovo ambiente non contiene automaticamente gli account e le prenotazioni del Site esistente.
