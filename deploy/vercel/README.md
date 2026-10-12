# Passaggio a Vercel

La build Next.js ora è compatibile con Vercel. **Il primo deploy mostra “Sito in preparazione”**: non accetta prenotazioni, non apre gli account e non crea un database sul disco effimero delle funzioni. Il Site esistente rimane privato e separato.

## Importazione e build

Repository: https://github.com/francesco-fracchia/francescolezioni

- Framework: **Next.js**. Root directory: radice della repository.
- Installazione: `npm ci`. Build: `npm run build`. Output directory: predefinita Next.js.
- Node: serie **24** oppure **22.16+** della serie 22.
- Non usare i comandi `build:sites` o `build:hostinger` su Vercel.

`VERCEL=1` seleziona automaticamente il runtime remoto. Per verificare la sola build fuori da Vercel: `npm run build:vercel`. La build non richiede credenziali e non applica migrazioni, crea account o trasferisce dati.

## Servizi dati

Il runtime remoto mantiene il contratto D1 già usato dalle migrazioni e dai trigger della piattaforma:

- **Cloudflare D1**, via API HTTPS con query parametrizzate e batch inviati in una sola richiesta. Nessuna ripetizione automatica delle scritture dal risultato incerto.
- **Turso**, alternativa a D1 già supportata, con client libSQL ufficiale e transazioni atomiche. Impostare entrambi i segreti `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN` su un database dedicato; una configurazione parziale non ripiega su D1. Il provider conserva query parametrizzate, risultati RETURNING, conteggio delle modifiche e codici di conflitto, senza divulgare dettagli SQL o ripetere scritture incerte.
- **Cloudflare R2**, tramite SDK S3, bucket privato, download autorizzati dal server e intervalli per PDF/video. Nessun URL pubblico ai materiali.

Configurazione di esempio: `deploy/vercel/runtime.env.example`. Le sei variabili dei servizi vanno aggiunte nel pannello Vercel: `CF_ACCOUNT_ID`, `CF_D1_DATABASE_ID`, `CF_D1_API_TOKEN`, `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`. Token e chiavi sono segreti server, senza prefisso `NEXT_PUBLIC_`; limitarli al database e al bucket necessari. Usare risorse distinte per Production e Preview. Non collegare i dati operativi alle anteprime dei branch.

Le risorse del Site privato non vengono trasferite né diventano accessibili aggiungendo la repository. Occorre predisporre D1/R2 nell'account del titolare, applicare in ordine le migrazioni in `drizzle`, trasferire dati e oggetti mantenendo gli identificativi e predisporre il tutor con password propria. Non esistono account amministrativi o password predefiniti.

### Configurazione scelta per il lancio

Dominio scelto: **lezionifrancesco.app**. Impostare `SITE_ORIGIN=https://lezionifrancesco.app` senza slash finale in Production; collegare il dominio nel progetto Vercel e usare i record DNS restituiti dal pannello, senza copiare record generici. La registrazione, l'associazione e il certificato HTTPS non sono ancora verificati. Un aggiornamento della repository non collega il dominio da solo.

Il titolare dispone di Turso e Stripe, ma non di D1/R2. Il database Turso è adattato e verificato con il client ufficiale su un database libSQL locale isolato. **Non è stato collegato un database Turso remoto**. Creare un database dedicato alla piattaforma, distinto dalle altre applicazioni e dai dati di prova, e inserire URL/token come segreti nel progetto Vercel. Non inviarli in chat.

Per i file è stato proposto **Vercel Blob Private**, ancora da creare e integrare. Il runtime attuale supporta R2: Turso senza un archivio supportato non rende il runtime operativo. Non indicare il sito come pronto cambiando `VERCEL_RUNTIME_READY` prima di questa integrazione e del collaudo. Il database non sostituisce l'archivio dei materiali.

### Manutenzione del database Turso

La build non esegue questi comandi. Creare un file locale ignorato `.env.turso.local`, con permessi riservati, contenente solo `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN`. Lavorare dalla radice del progetto, con Node 22.16+ o 24:

```sh
node --env-file=.env.turso.local scripts/vercel-database.mjs migrate
node --env-file=.env.turso.local scripts/vercel-database.mjs tutor EMAIL_DEL_TUTOR
node --env-file=.env.turso.local scripts/vercel-database.mjs check
```

La password tutor viene chiesta due volte senza mostrarla. Non passare password come argomento o variabile nella cronologia del terminale. Il comando non sostituisce un tutor già presente.

Le 26 migrazioni esistenti vengono applicate nell'ordine del journal, ciascuna in una transazione insieme alla propria impronta SHA-256. I riavvii riprendono solo dalle migrazioni mancanti. Database con tabelle estranee senza registro della piattaforma, migrazioni sconosciute e file già applicati ma modificati vengono rifiutati. Un SQL non valido annulla anche le modifiche allo schema di quella migrazione. Il comando `check` è in sola lettura, controlla impronte, vincoli e presenza del tutor; non certifica disponibilità, accessi o pagamenti sul deploy. Questi comandi inizializzano un database vuoto e **non importano automaticamente i dati del Site o del Mac**.

### Stripe

Account disponibile, collegamento al progetto ancora da verificare. Inserire `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` come segreti server. Endpoint sul dominio definitivo: `https://lezionifrancesco.app/api/stripe/webhook`; eventi attualmente gestiti: `checkout.session.completed` e `checkout.session.expired`. Il server verifica firma, modalità test/live, importo, valuta e metadati prima di accreditare lezioni. `PAYMENT_LIVE_ENABLED=0` mantiene chiusi i checkout live; le prove non assegnano bonus reali. Non aprire i pagamenti prima del collaudo su database dedicato.

Il checkout attuale richiede il metodo carta; Apple Pay e Google Pay dipendono dall'idoneità del dispositivo/browser e dalle impostazioni Stripe. **PayPal è elencato nei testi ma il suo collegamento non è ancora implementato né verificato**: completare prima dell'apertura o rendere esplicito il metodo effettivamente concordato. Le condizioni di cancellazione e le informazioni privacy definitive sono ancora da completare.

## Stato e apertura del runtime

Anche con le credenziali presenti, `VERCEL_RUNTIME_READY` resta **0**. Portarlo a `1` solo dopo il collaudo remoto delle migrazioni, degli accessi e dei file. Senza questa conferma le pagine operative mostrano la preparazione, le API restituiscono 503, robots e sitemap escludono l'indicizzazione. La pagina di preparazione e le sue risorse sono accessibili per verificare il deploy.

Dopo il collaudo mantenere `SITE_VISIBILITY=private`: l'accesso alle pagine operative richiede una sessione tutor valida. Le identità e gli header ChatGPT non autorizzano questo ambiente. `PUBLIC_SITE_INDEXING=false`, `NOTIFICATIONS_MODE=preview` e `PAYMENT_LIVE_ENABLED=0` mantengono indicizzazione, invio email e pagamenti reali disattivati. Nei deploy non Production invio reale e Stripe sono esclusi anche dal runtime. L'apertura pubblica è un passaggio separato dal deploy di prova.

## Pagina di attesa e anteprima per il proprietario

I visitatori vedono `/preparazione`, con la presentazione dell’attività, un collegamento WhatsApp e **Accesso riservato** nel footer. Da lì si apre `/anteprima`.

Per vedere il sito completo su Vercel durante i preparativi, aggiungere **`SITE_PREVIEW_PASSWORD`** nelle variabili del progetto, come segreto, con una password riservata di almeno **20 caratteri** (massimo 256). Non inviarla in chat o inserirla nel repository. Impostarla nell’ambiente interessato e avviare un nuovo deploy. Production e Preview devono usare valori distinti. L’accesso resta indisponibile quando la password non è configurata; non esiste una password predefinita.

La sessione di anteprima dura quattro ore, usa un cookie HttpOnly/SameSite Strict/Secure firmato e si revoca cambiando la password. **Esci dall’anteprima** cancella il cookie. La sessione permette soltanto le pagine commerciali e le immagini pubbliche: non abilita area tutor/studente, account, richieste, prenotazioni, pagamenti o file protetti. Le API operative rimangono chiuse anche quando i servizi sono configurati. Nessun dato dimostrativo viene scritto al database. Il calendario mostra uno stato di preparazione, anziché simulare disponibilità o produrre errori di caricamento.

Sul Mac, con `npm run start:vercel -- --hostname 127.0.0.1 --port 5186`, `/anteprima` offre **Apri anteprima locale**. Questa scorciatoia funziona solo su loopback, fuori dall’ambiente Vercel; non accetta cookie locali nei deploy Vercel. Tenere il server locale vincolato a `127.0.0.1`. Il sito pubblico conserva la sua navigazione e mostra una barra che segnala l’anteprima. Noindex e no-store si applicano anche all’anteprima autenticata.

## Da completare prima dell'uso operativo

1. Provisioning del database e dell'archivio privato; migrazioni e importazione controllata; primo account tutor indipendente.
2. **Upload diretti autorizzati**: Vercel limita il corpo delle richieste a 4,5 MB. Gli upload attuali passano dal server (materiali fino a 50 MB, compiti fino a 10 MB) e i file grandi non sono ancora utilizzabili su Vercel. Il supporto agli stream nell'adapter non elimina il limite della piattaforma. Servono autorizzazioni temporanee, verifica di ruolo/destinatario/dimensione/contenuto e finalizzazione server; il bucket deve rimanere privato.
3. Verifiche sul provider remoto: concorrenza e rollback delle prenotazioni/saldi, login e isolamento tra studenti, upload/download, range video, errori di rete e persistenza dopo un nuovo deploy. I test Cloudflare usano un trasporto simulato; i test Turso usano il client ufficiale su libSQL locale, inclusa l'API di prenotazione con due richieste concorrenti e un solo appuntamento/richiesta salvato. **Nessuno di questi test certifica il collegamento al servizio remoto del titolare**.
4. Verifica del piano Vercel adatto all'attività, dominio definitivo e successiva apertura autorizzata. Nessun servizio, piano o dominio è stato acquistato da questi script.

## Verifica locale

```sh
npm ci
npm test
npm run build:vercel
npx tsc --noEmit
```

Eseguire il controllo TypeScript dopo la build, non contemporaneamente: Next rigenera `.next/types`. Per il controllo HTTP della preparazione, `npm run start:vercel -- --hostname 127.0.0.1 --port 5186`, senza configurazione dei servizi. Le pagine operative devono mostrare la preparazione, le API 503 e robots `Disallow: /`.

La copia GitHub esclude `.env*`, `.dev.vars*`, database, backup, materiali privati, `.openai`, `.vercel`, stato locale e `PASSAGGIO_CHAT.md`. Non pubblicare la cronologia privata del workspace. Il dominio può rimanere registrato su Hostinger e puntare ai record indicati da Vercel, dopo la scelta del nome e il collaudo.

Fonti: [Next.js su Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs), [Hobby](https://vercel.com/docs/plans/hobby), [limiti delle funzioni](https://vercel.com/docs/functions/limitations), [API D1](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/query/), [R2 S3](https://developers.cloudflare.com/r2/get-started/s3/).
