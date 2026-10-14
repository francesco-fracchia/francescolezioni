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
- **Vercel Blob Private**, tramite SDK ufficiale, autenticazione OIDC della Function e collegamento esclusivo a Production. Caricamenti diretti con autorizzazione temporanea; download autorizzati dal server e intervalli per PDF/video. Nessun URL pubblico o token permanente ai materiali.
- **Cloudflare R2**, alternativa a Blob tramite SDK S3, bucket privato e download autorizzati dal server.

Configurazione di esempio: `deploy/vercel/runtime.env.example`. Per Turso e Blob usare `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` e `BLOB_STORE_ID`; il collegamento Blob aggiunge anche `BLOB_WEBHOOK_PUBLIC_KEY` e Vercel fornisce OIDC al runtime. Per la configurazione alternativa D1/R2 aggiungere: `CF_ACCOUNT_ID`, `CF_D1_DATABASE_ID`, `CF_D1_API_TOKEN`, `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`. Token e chiavi sono segreti server, senza prefisso `NEXT_PUBLIC_`; limitarli al database e al bucket necessari. Usare risorse distinte per Production e Preview. Non collegare i dati operativi alle anteprime dei branch.

Le risorse del Site privato non vengono trasferite né diventano accessibili aggiungendo la repository. Occorre predisporre D1/R2 nell'account del titolare, applicare in ordine le migrazioni in `drizzle`, trasferire dati e oggetti mantenendo gli identificativi e predisporre il tutor con password propria. Non esistono account amministrativi o password predefiniti.

### Configurazione scelta per il lancio

Dominio scelto: **lezionifrancesco.app**. Impostare `SITE_ORIGIN=https://lezionifrancesco.app` senza slash finale in Production; collegare il dominio nel progetto Vercel e usare i record DNS restituiti dal pannello, senza copiare record generici. La registrazione, l'associazione e il certificato HTTPS non sono ancora verificati. Un aggiornamento della repository non collega il dominio da solo.

Il database Turso dedicato è stato inizializzato con le 27 migrazioni e verificato tramite l'adapter dell'app. L'account tutor indipendente è presente. URL/token sono stati salvati come segreti server esclusivamente in Production su Vercel. Non sono stati importati dati dal Site o dal Mac né creati studenti di prova nel database remoto.

L'archivio **francescolezioni-materiali** è stato creato come **Vercel Blob Private**, in Dublino (DUB1), e collegato esclusivamente a Production. Il codice usa OIDC, senza chiave read/write permanente. Il progetto usa il piano Pro; l'archivio è soggetto ai costi a consumo del provider, senza acquisti o cambi di piano eseguiti dagli script.

### Caricamento dei materiali su Vercel

I file passano direttamente dal browser al Blob privato, fuori dal limite di 4,5 MB delle Function: massimo 50 MB per materiali dei corsi, 10 MB per compiti e consegne. `/api/uploads` verifica account, ruolo, destinatario, tipo e dimensione. Il server genera una URL valida cinque minuti per una sola chiave, autorizzata solo al PUT, senza sovrascrittura. Non invia al browser credenziali del provider né autorizzazioni di lettura o cancellazione.

La finalizzazione deve avvenire entro trenta minuti e passa dalle API esistenti: ricontrolla account/versione di accesso, destinazione, dimensione effettiva e firma del formato; i vincoli SQL proteggono consegne e modifiche concorrenti. Il file di un corso nasce in bozza. I download passano dal server dopo il controllo degli accessi e non espongono le URL Blob. I caricamenti multipart esistenti rimangono disponibili negli ambienti Node/Workers.

Una consegna ripetuta con lo stesso identificativo e contenuto conserva un solo tentativo. In caso di esito incerto del database non viene cancellato un file già referenziato. Un upload interrotto prima della finalizzazione può lasciare un oggetto privato non referenziato: non è visibile agli studenti e richiede eventuale pulizia operativa, ancora non automatizzata. I test locali verificano il flusso di autorizzazione, finalizzazione e download con trasporto archivio simulato; il collaudo remoto del 12 ottobre ha verificato un PDF tecnico da 5.760.633 byte: caricamento diretto, finalizzazione in bozza, persistenza in Turso e download identico all'originale. Il download senza sessione viene rifiutato (403). Il corso tecnico senza iscritti è stato archiviato; le verifiche remote con account studenti distinti e video restano separate.

### Manutenzione del database Turso

La build non esegue questi comandi. Creare un file locale ignorato `.env.turso.local`, con permessi riservati, contenente solo `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN`. Lavorare dalla radice del progetto, con Node 22.16+ o 24:

```sh
node --env-file=.env.turso.local scripts/vercel-database.mjs migrate
node --env-file=.env.turso.local scripts/vercel-database.mjs tutor EMAIL_DEL_TUTOR
node --env-file=.env.turso.local scripts/vercel-database.mjs check
```

La password tutor viene chiesta due volte senza mostrarla. Non passare password come argomento o variabile nella cronologia del terminale. Il comando non sostituisce un tutor già presente.

Le 27 migrazioni esistenti vengono applicate nell'ordine del journal, ciascuna in una transazione insieme alla propria impronta SHA-256. I riavvii riprendono solo dalle migrazioni mancanti. Database con tabelle estranee senza registro della piattaforma, migrazioni sconosciute e file già applicati ma modificati vengono rifiutati. Un SQL non valido annulla anche le modifiche allo schema di quella migrazione. Il comando `check` è in sola lettura, controlla impronte, vincoli e presenza del tutor; non certifica disponibilità, accessi o pagamenti sul deploy. Questi comandi inizializzano un database vuoto e **non importano automaticamente i dati del Site o del Mac**.

### Stripe

Il 14 ottobre 2026 Stripe è stato collegato **esclusivamente in modalità TEST** al progetto Vercel. `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` sono salvati come Secret soltanto in Production (ambiente di hosting, non modalità di pagamento). Il webhook di prova è `https://francescolezioni.vercel.app/api/stripe/webhook`; `SITE_ORIGIN` usa temporaneamente `https://francescolezioni.vercel.app` per i ritorni dal checkout. Il dominio definitivo rimane `lezionifrancesco.app`: dopo DNS/HTTPS il webhook e l’origine andranno aggiornati e ricollaudati; eventi gestiti: `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded` e `checkout.session.async_payment_failed`. Il POST del webhook può raggiungere il server anche in modalità privata, ma firma e modalità vengono verificate prima di ogni scrittura; tutti gli altri accessi rimangono riservati. Il server verifica firma, modalità test/live, importo, valuta e metadati prima di accreditare lezioni. `PAYMENT_LIVE_ENABLED=0` mantiene chiusi i checkout live; le prove non assegnano bonus reali. Non aprire i pagamenti prima del collaudo su database dedicato.

Collaudo remoto: il deploy con le credenziali è Ready; un POST senza firma viene rifiutato (400). Un checkout TEST creato e immediatamente scaduto, senza carta, customer o PaymentIntent, ha generato un evento autentico `checkout.session.expired`. Stripe ne conferma la consegna riuscita (`pending_webhooks=0`). Il controllo non accredita lezioni né bonus e non certifica un acquisto pagato completo: il flusso checkout → saldo/pacchetto → prenotazione va ancora collaudato prima dell’attivazione live. L’API tutor senza sessione continua a restituire 403.

Il checkout richiede carta e, con `STRIPE_PAYPAL_ENABLED=1`, aggiunge PayPal alle singole lezioni, ai pacchetti e ai rinnovi del checkout. I metodi vengono salvati con ogni tentativo: cambiare la configurazione non modifica una richiesta idempotente già aperta. Non sono abilitati metodi con conferma differita. Apple Pay e Google Pay dipendono dall'idoneità del dispositivo/browser e dalle impostazioni Stripe.

Prima di impostare il flag PayPal, completare **Dashboard Stripe → Impostazioni → Metodi di pagamento → PayPal → Attiva** e collegare l'account PayPal. Attendere lo stato attivo e collaudare in ambiente di prova. Non servono credenziali PayPal nel codice: il checkout passa da Stripe. Riferimento: https://docs.stripe.com/payments/paypal/activate. In assenza di attivazione mantenere il flag a 0; il supporto nel codice non certifica che il conto sia operativo.

Condizioni confermate: cancellazione dello studente con almeno 24 ore di preavviso, rimborso 100%; con meno di 24 ore, 50%; cancellazione del tutor, percentuale scelta esplicitamente dal tutor caso per caso (0–100%), senza valore predefinito. La pagina pubblica indica recupero o rimborso da concordare. Il calendario registra chi annulla, l'istante della richiesta ricevuta e la percentuale, con controllo di versione nella stessa transazione. Il rimborso si calcola sul saldo effettivo di ogni partecipante, anche per quote del pacchetto; la quota non viene anche riaccreditata come lezione. Le cancellazioni storiche prive di questa registrazione mantengono il comportamento precedente. **La cancellazione non esegue un rimborso Stripe/PayPal:** controllare i saldi e rimborsare separatamente; il riepilogo amministrativo indica un importo previsto, non un trasferimento confermato. Nessuna nuova penale per spostamenti o assenze è stata definita. Le informazioni privacy definitive sono ancora da completare.

## Stato e apertura del runtime

Anche con le credenziali presenti, `VERCEL_RUNTIME_READY` resta **0** per impostazione predefinita. Dopo la verifica di configurazione, migrazioni e account, portarlo a `1` esclusivamente con `SITE_VISIBILITY=private` per collaudare accessi e file nel deploy riservato. Questo passaggio non apre il sito al pubblico. Senza questa conferma le pagine operative mostrano la preparazione, le API restituiscono 503, robots e sitemap escludono l'indicizzazione. La pagina di preparazione e le sue risorse sono accessibili per verificare il deploy.

Dopo il collaudo mantenere `SITE_VISIBILITY=private`: l'accesso alle pagine operative richiede una sessione tutor valida. Le identità e gli header ChatGPT non autorizzano questo ambiente. `PUBLIC_SITE_INDEXING=false`, `NOTIFICATIONS_MODE=preview` e `PAYMENT_LIVE_ENABLED=0` mantengono indicizzazione, invio email e pagamenti reali disattivati. Nei deploy non Production invio reale e Stripe sono esclusi anche dal runtime. L'apertura pubblica è un passaggio separato dal deploy di prova.

## Pagina di attesa e anteprima per il proprietario

I visitatori vedono `/preparazione`, con la presentazione dell’attività, un collegamento WhatsApp e **Accesso riservato** nel footer. Da lì si apre `/anteprima`.

Per vedere il sito completo su Vercel durante i preparativi, aggiungere **`SITE_PREVIEW_PASSWORD`** nelle variabili del progetto, come segreto, con una password riservata di almeno **20 caratteri** (massimo 256). Non inviarla in chat o inserirla nel repository. Impostarla nell’ambiente interessato e avviare un nuovo deploy. Production e Preview devono usare valori distinti. L’accesso resta indisponibile quando la password non è configurata; non esiste una password predefinita.

La sessione di anteprima dura quattro ore, usa un cookie HttpOnly/SameSite Strict/Secure firmato e si revoca cambiando la password. **Esci dall’anteprima** cancella il cookie. La sessione permette soltanto le pagine commerciali e le immagini pubbliche: non abilita area tutor/studente, account, richieste, prenotazioni, pagamenti o file protetti. Le API operative rimangono chiuse anche quando i servizi sono configurati. Nessun dato dimostrativo viene scritto al database. Il calendario mostra uno stato di preparazione, anziché simulare disponibilità o produrre errori di caricamento.

Sul Mac, con `npm run start:vercel -- --hostname 127.0.0.1 --port 5186`, `/anteprima` offre **Apri anteprima locale**. Questa scorciatoia funziona solo su loopback, fuori dall’ambiente Vercel; non accetta cookie locali nei deploy Vercel. Tenere il server locale vincolato a `127.0.0.1`. Il sito pubblico conserva la sua navigazione e mostra una barra che segnala l’anteprima. Noindex e no-store si applicano anche all’anteprima autenticata.

## Da completare prima dell'uso operativo

1. Collaudo remoto con la sessione tutor: upload sopra 4,5 MB, finalizzazione, download e intervalli video, isolamento e revoca degli accessi; verifica della persistenza dopo un nuovo deploy. Turso è raggiungibile e le migrazioni/account sono verificati; le prove locali non certificano tutti i flussi sul servizio remoto.
2. Stripe e webhook in ambiente di prova, metodi di pagamento effettivamente disponibili e successiva attivazione reale autorizzata. L'invio email rimane in anteprima.
3. Collegamento DNS/HTTPS del dominio definitivo, informazioni privacy finali e apertura pubblica dopo il collaudo. Il dominio non viene collegato da un aggiornamento della repository.

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
