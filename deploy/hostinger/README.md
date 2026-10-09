# Trasferimento su Hostinger

L’app ora ha un runtime Node.js indipendente da Sites: Next.js, SQLite e archivio dei materiali su disco privato. Account email/password, calendario, corsi, compiti, bonus e acquisti usano gli stessi dati e le stesse regole. Gli header degli account ChatGPT sono ignorati su questo runtime.

**Stato: adattamento locale verificabile, non installato su un account Hostinger.** Il Site esistente resta privato. Non sono stati acquistati hosting o domini, migrati dati operativi, attivate email o riscossi pagamenti.

## Piano e persistenza

Hostinger documenta Next.js/Node.js su Business e Cloud, oltre ai VPS. Usare Node **22.16 o successivo della serie 22** oppure **24**, con `node:sqlite` disponibile. L’hosting solo PHP/statico non basta.

Un VPS consente di tenere `/var/lib/ff-lessons` fuori dalle release dell’app ed è il profilo con persistenza controllabile. Business/Cloud possono eseguire il codice, ma **prima di scegliere questo profilo bisogna ottenere da Hostinger un percorso privato scrivibile e persistente, accessibile al processo Node e conservato nei backup**. La sua disponibilità non è stata verificata su un account reale. Non usare la cartella dell’app, `public_html`, `hbuilds`, `.next`, un volume effimero o un filesystem di rete incompatibile con i lock/WAL di SQLite. Se il piano non offre questo spazio, usare il VPS oppure cambiare il backend dei dati; questo adattamento non implementa MySQL o Supabase.

Il server rifiuta percorsi relativi o dentro l’app. Le migrazioni non vengono eseguite dalle richieste HTTP. Usare **una sola istanza dell’app**, senza cluster o repliche su host diversi; SQLite usa transazioni e un’attesa di 10 secondi sui lock. Non copiare solo il file `.sqlite` mentre l’app è in funzione: il WAL può contenere dati recenti.

Fonti ufficiali: [Node.js su Hostinger](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/), [variabili d’ambiente](https://www.hostinger.com/support/how-to-add-environment-variables-during-node-js-application-deployment/), [server Next personalizzato](https://nextjs.org/docs/app/guides/custom-server).

## Business / Cloud: caricamento

1. Creare una **Web App Node.js** in hPanel. È possibile usare un repository privato GitHub oppure `hostinger-release.zip`, generato con `npm run package:hostinger`. Lo ZIP contiene i sorgenti; Hostinger installa e compila. Non caricare la cartella `dist` del vecchio Site.
2. Selezionare il backend **Other**, in modo da usare il server personalizzato che normalizza l’origine HTTPS. Node 22 aggiornato o 24; installazione `npm ci` con dipendenze di sviluppo incluse; build `npm run build:hostinger`; output `.next`; entry file **`scripts/start-hostinger.mjs`**. Quando è disponibile il campo comando di avvio: `npm run start:hostinger`. Nel pacchetto ZIP anche i comandi standard `build` e `start` puntano a questi script. Non usare `next start` direttamente o l’entry standalone generata per Sites.
3. Inserire le variabili dell’esempio `runtime.env.example`. Impostare `SITE_ORIGIN` sull’esatto dominio HTTPS, senza slash finale; `APP_DATA_DIR` sul percorso confermato da Hostinger. Sostituire `HOSTINGER_BIND_ADDRESS` con `0.0.0.0` e usare la porta fornita dal servizio.
4. Per un database **nuovo**, primo avvio con `HOSTINGER_AUTO_MIGRATE=1`, email tutor e password di almeno 15 caratteri in `HOSTINGER_BOOTSTRAP_EMAIL` e `HOSTINGER_BOOTSTRAP_PASSWORD`. Non scrivere la password nel repository. Il server crea un solo tutor con hash scrypt; non sostituisce un tutor importato o già esistente.
5. Dopo il primo accesso, rimuovere le due variabili bootstrap e riportare `HOSTINGER_AUTO_MIGRATE=0`. Riavviare. Provare `/accesso`, `/gestione/oggi` e un download prima di usare dati reali. Le credenziali di test non vengono fornite nel pacchetto.
6. Ripetere un deploy di prova: una scheda e un file sintetici devono restare disponibili dopo la ricostruzione. Verificare il backup e il ripristino sul piano scelto. Solo allora trasferire i dati operativi.

Il collegamento GitHub non è stato configurato. I nomi dei campi del pannello possono cambiare; i comandi e l’entry sopra descrivono il contratto richiesto dall’app.

## VPS: installazione

Preparare un utente di servizio `ff-lessons`, Node aggiornato, Nginx, un certificato HTTPS e due cartelle:

- `/srv/ff-lessons/current`: sorgenti, dipendenze e build; può essere un link alla release attiva.
- `/var/lib/ff-lessons`: dati privati, proprietà di `ff-lessons`, permessi `700`. Non collegarla a Nginx e non metterla dentro la cartella del sito.

Nel progetto, installare con `npm ci`, poi `npm run build:hostinger`. Configurare `/etc/ff-lessons.env` dall’esempio, proprietario amministratore e permessi `600`; aggiornare il percorso di Node in `ff-lessons.service.example` se diverso. Creare `.next/cache` scrivibile dall’utente del servizio. Attivare HTTPS con la configurazione Nginx di esempio, quindi installare il servizio systemd. Tenere il processo Node su `127.0.0.1`.

Inizializzare il database e il tutor con le variabili del primo avvio descritte sopra, oppure da terminale, come utente del servizio:

```sh
APP_DATA_DIR=/var/lib/ff-lessons npm run db:hostinger -- migrate
APP_DATA_DIR=/var/lib/ff-lessons npm run db:hostinger -- tutor EMAIL-DEL-TUTOR
```

Il secondo comando chiede la password senza visualizzarla. Nessun utente/password predefinito. Non lanciare la produzione con l’account `root`.

## Trasferire i dati del Site esistente

Un’installazione nuova **non contiene** account, prenotazioni o materiali del Site attuale. Non inizializzarla vuota se si vogliono mantenere i dati.

Servono un’esportazione SQL completa e consistente del D1 corrente, inclusa la tabella `d1_migrations`, e tutti gli oggetti R2 referenziati da corsi e compiti. L’accesso a queste esportazioni va ottenuto dal provider originale; non sono stati estratti in questo turno. L’esportazione amministrativa `/gestione/esportazione` è un riepilogo operativo, **non** un backup completo di account/file adatto a questo trasferimento.

Su una cartella dati nuova, fuori dall’app, prima del bootstrap:

```sh
APP_DATA_DIR=/PERCORSO/DATI npm run db:hostinger -- import-d1 /PERCORSO/EXPORT/database.sql
APP_DATA_DIR=/PERCORSO/DATI npm run materials:hostinger -- /PERCORSO/EXPORT/materials.json
```

Il primo comando non sovrascrive database esistenti, verifica integrità e storia completa delle 26 migrazioni, mantiene account/hash e invalida le vecchie sessioni. Un dump senza `d1_migrations` viene rifiutato. Per l’importazione usare un dump SQL proveniente dal proprio database, verificato prima dell’esecuzione.

Il secondo usa un elenco come questo, con file nella stessa cartella dell’elenco o in sottocartelle:

```json
[{"key":"CHIAVE-ORIGINALE-R2","file":"files/materiale.pdf"}]
```

L’elenco deve contenere tutti e solo gli oggetti referenziati nel DB, inclusi i compiti; dimensioni e percorsi vengono verificati. I file mantengono le chiavi del DB, ma vengono conservati con nomi hash e scaricati soltanto dalle API autorizzate. Non renderli pubblici per semplificare la migrazione. Verificare corsi, compiti, saldi e calendario con account tutor, studente e genitore. Non esiste sincronizzazione tra vecchio Site e Hostinger: sospendere le modifiche durante il trasferimento finale ed evitare due agende operative.

## Backup e aggiornamenti

Su VPS, fermare il servizio, quindi eseguire come utente del servizio:

```sh
APP_DATA_DIR=/var/lib/ff-lessons npm run db:hostinger -- backup /PERCORSO/PRIVATO/NUOVO-BACKUP
```

Il comando crea una snapshot SQLite tramite `VACUUM INTO` e copia i materiali. La destinazione deve essere nuova, fuori da dati/app/cartelle pubbliche, con genitore esistente. **L’app deve essere ferma per mantenere DB e file coerenti**. Riavviarla al termine. Conservare copie anche fuori dal server, con accesso riservato.

Su Business/Cloud, usare il backup dell’intera cartella persistente a processo fermo oppure verificare con Hostinger una procedura equivalente; la documentazione non garantisce accesso a Node via SSH su questi piani. Provare il ripristino in una cartella separata. La snapshot contiene dati degli studenti e hash delle password, non va allegata al sito.

Per un aggiornamento: backup, build della nuova release, migrazioni esplicite, cambio della release, riavvio e verifica. Le migrazioni applicate non possono essere riscritte: il comando ne verifica il checksum. Un rollback del codice deve restare compatibile con il DB; non sostituire automaticamente i dati con un vecchio backup, perché perderesti le modifiche intervenute.

## Privacy, email, pagamenti e lancio

`SITE_VISIBILITY=private` è il valore predefinito: solo il tutor autenticato può vedere il sito e le API operative. Gli studenti non accedono ancora ai corsi. La pagina di accesso e il cambio password sono disponibili; gli header ChatGPT non concedono privilegi. Questo blocco funziona anche con il proxy Next, oltre al server personalizzato.

Tenere `PUBLIC_SITE_INDEXING=false`, `NOTIFICATIONS_MODE=preview`, `PAYMENT_LIVE_ENABLED=0`, senza chiavi email o Stripe reali. I flussi restano predisposti, non attivati. Il webhook Stripe non è raggiungibile durante la fase privata e quindi non si può collaudare un pagamento reale da fuori.

**Solo su richiesta di pubblicazione**: scegliere il dominio, validare condizioni/pagamenti/privacy, completare i test sul provider, impostare `SITE_VISIBILITY=public`; a quel punto le aree tutor e studente restano comunque protette dai rispettivi account. Attivare `PUBLIC_SITE_INDEXING=true` quando il dominio e i contenuti definitivi sono pubblici. Rimuovere il blocco del sito non attiva automaticamente email o pagamenti.

## Dominio senza cognome

Proposte da valutare, non verificate come libere o acquistate:

- `lezioniconfrancesco.it`: mantiene un riferimento personale senza usare il cognome.
- `spaziolezioni.it`: un nome utilizzabile anche per corsi e piccoli gruppi.
- `puntostudiolodi.it`: mette in evidenza il legame con Lodi.

Il dominio può avere questo nome mantenendo la presentazione di Francesco Fracchia nelle pagine. Inserire “lezioni” rende l’indirizzo comprensibile, ma non garantisce un vantaggio SEO. Nessun dominio proposto è stato impostato come canonical: finché non viene scelto, il Site conserva la sua origine attuale.
