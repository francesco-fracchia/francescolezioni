# Passaggio a Vercel

Stato: sorgenti preparati per GitHub; **adattamento Vercel ancora da completare**, nessun progetto distribuito e nessun servizio acquistato.

L'app usa Next.js App Router. Gli account sono propri, con email/password; le regole di calendario, corsi, pacchetti e inviti sono già implementate. La presenza di Next.js non rende automaticamente compatibili il database e l'archivio dei file con ogni hosting.

## Prima di importare e distribuire

1. Verificare il piano: Hobby è riservato all'uso personale non commerciale; per il sito delle lezioni serve un piano adatto all'attività. Pro parte da 20 USD/mese, oltre a imposte ed eventuali consumi aggiuntivi. Nessun abbonamento è stato attivato.
2. Scegliere il database remoto e l'archivio privato dei materiali. Una possibilità da valutare è D1 e R2 in un account Cloudflare del titolare: le migrazioni e i trigger esistenti sono già per D1. Le risorse del Site privato non appartengono automaticamente a questo account e non vanno considerate trasferite.
3. Implementare e verificare l'adapter remoto: transazioni atomiche per prenotazioni/saldi, sessioni, accesso ai file e gestione degli errori. Non sostituire `batch` con richieste separate non atomiche.
4. Adeguare gli upload: le funzioni Vercel hanno un limite di 4,5 MB al corpo delle richieste. I file più grandi devono essere caricati direttamente nell'archivio privato tramite autorizzazione temporanea, poi verificati dal server prima di essere associati a un corso o a un compito. Servono controlli su ruolo, destinatario, dimensione, contenuto e scadenza; niente bucket pubblico.
5. Collaudare build Vercel, login, isolamento tra studenti, calendario concorrente, upload/download e persistenza dopo un nuovo deploy. Solo dopo trasferire dati operativi e collegare il dominio.

La build attuale si interrompe esplicitamente su Vercel: evita di distribuire per errore la configurazione Sites, priva dei binding, oppure il runtime Hostinger che conserva SQLite sul disco. Non usare `build:hostinger`, `APP_DATA_DIR` o `/tmp` come database di produzione Vercel.

## GitHub e impostazioni finali

Repository indicata: https://github.com/francesco-fracchia/francescolezioni

I sorgenti per la repository pubblica devono escludere `.env*`, `.dev.vars*`, database, backup, materiali privati, `.openai`, `.vercel`, stato locale e `PASSAGGIO_CHAT.md`. La copia iniziale conserva il codice e i test senza pubblicare la cronologia del workspace o gli appunti interni.

Una volta completato l'adattamento: importare la repository, scegliere Next.js, configurare le variabili segrete solo nel pannello Vercel e separare database/archivi di anteprima e produzione. Non collegare gli stessi dati operativi alle anteprime di ogni branch.

Il dominio può essere registrato su Hostinger e collegato a Vercel tramite i record mostrati dal progetto Vercel. Il dominio definitivo non è ancora confermato. Il Site esistente resta privato; email e pagamenti reali restano disattivati. La pubblicazione del codice su GitHub non pubblica la piattaforma o i suoi dati.

Fonti: [Next.js su Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs), [Hobby](https://vercel.com/docs/plans/hobby), [Pro](https://vercel.com/docs/plans/pro-plan), [limiti delle funzioni](https://vercel.com/docs/functions/limitations), [API D1](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/query/), [R2 S3](https://developers.cloudflare.com/r2/get-started/s3/).
