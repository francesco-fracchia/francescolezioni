import {publicBusiness} from '@/lib/public-business';
import {privacyContact,privacyRetention} from '@/lib/privacy-policy.mjs';

export default function Privacy({dialog=false}:{dialog?:boolean}) {
  return <article className="privacy-policy">
    {dialog&&<h2 id="dialog-title">Informativa privacy</h2>}
    <p className="reading-note">Informativa ai sensi dell’art. 13 del GDPR</p>
    <p>Questa informativa riguarda il sito delle lezioni di Francesco Fracchia, i moduli di contatto e prenotazione e le aree riservate a studenti e genitori.</p>

    <section aria-labelledby="privacy-titolare"><h2 id="privacy-titolare">Chi gestisce i dati</h2>
      <p>Il titolare del trattamento è {publicBusiness.name}, partita IVA {publicBusiness.vatNumber}, con sede legale in {publicBusiness.legalAddress.street}, {publicBusiness.legalAddress.postalCode} {publicBusiness.legalAddress.city}. Per domande sulla privacy o per esercitare i tuoi diritti puoi scrivere a <a href={`mailto:${privacyContact}`}>{privacyContact}</a>.</p>
    </section>

    <section aria-labelledby="privacy-dati"><h2 id="privacy-dati">Quali dati raccolgo e perché</h2>
      <ul>
        <li><strong>Contatti e richieste.</strong> Nome, email, eventuale telefono e informazioni che scegli di dare su materia, programma, scuola o università, obiettivi e disponibilità. Servono per risponderti, organizzare le lezioni e valutare eventuali gruppi. Se indichi dei compagni, condividi solo le informazioni necessarie e avvisali.</li>
        <li><strong>Incontri e lezioni.</strong> Data, orario, modalità, partecipanti e stato di prenotazioni, spostamenti e cancellazioni.</li>
        <li><strong>Account e attività didattica.</strong> Credenziali di accesso, collegamento tra studente e genitore autorizzato, corsi assegnati, avanzamento, piani di studio, riepiloghi, risposte ai test, compiti, consegne, allegati e correzioni. I test sono orientativi; le scelte didattiche e gli abbinamenti vengono valutati da me.</li>
        <li><strong>Acquisti e inviti.</strong> Lezioni e pacchetti acquistati, importi, identificativi ed esito dei pagamenti, eventuali rimborsi, codice invito e crediti maturati o utilizzati. Non conservo il numero completo della carta né il codice di sicurezza.</li>
        <li><strong>Funzionamento e sicurezza.</strong> Cookie di accesso, dati tecnici della connessione e contatori per contrastare invii ripetuti e accessi abusivi.</li>
      </ul>
      <p>I campi obbligatori sono quelli necessari a gestire la richiesta o il servizio scelto. Puoi lasciare vuoti gli altri. Senza un recapito non posso risponderti; senza account e dati di prenotazione non posso erogare le relative funzioni.</p>
      <p>Nei messaggi e negli allegati non inserire diagnosi, certificazioni DSA, documenti sanitari o altri dati non necessari. Per indicarmi come preferisci studiare bastano le difficoltà negli esercizi e le modalità di spiegazione che trovi utili. Un eventuale trattamento di documentazione sanitaria richiede una valutazione e un’informativa specifiche.</p>
    </section>

    <section aria-labelledby="privacy-basi"><h2 id="privacy-basi">Su quali basi uso i dati</h2>
      <p>Per rispondere a una richiesta, fissare un incontro, gestire account, lezioni e materiali uso i dati necessari alle misure precontrattuali che mi chiedi e all’esecuzione del servizio (art. 6.1.b GDPR). Per gli adempimenti contabili e fiscali la base è l’obbligo di legge (art. 6.1.c). Per la sicurezza e la gestione di eventuali contestazioni mi baso sul legittimo interesse a proteggere il servizio e tutelare i diritti, nei limiti necessari (art. 6.1.f).</p>
      <p>La casella nei moduli registra la presa visione di questa informativa. Non è un consenso pubblicitario. Non invio newsletter o messaggi promozionali automatici e non vendo i dati.</p>
    </section>

    <section aria-labelledby="privacy-accessi"><h2 id="privacy-accessi">Chi può accedere ai dati</h2>
      <p>Accedo ai dati per seguire le richieste e le lezioni. Nell’area riservata, lo studente e gli eventuali genitori collegati al suo account vedono i contenuti per i quali sono autorizzati. Compiti e allegati non sono pubblicati sul sito. Per organizzare una lezione di gruppo condivido con i partecipanti solo le informazioni necessarie all’incontro.</p>
      <p>Per il funzionamento del sito utilizzo questi servizi:</p>
      <ul>
        <li><strong>Vercel</strong> per ospitare il sito e conservare i file nell’archivio privato Blob; <strong>Turso</strong> per il database di account, richieste e attività. <a href="https://vercel.com/legal/privacy-notice" target="_blank" rel="noopener noreferrer">Privacy Vercel</a> · <a href="https://turso.tech/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Turso</a>.</li>
        <li><strong>Stripe</strong> per il pagamento quando il checkout è disponibile. Riceve i dati necessari alla transazione e restituisce al sito il suo esito. I dati della carta si inseriscono nel checkout di Stripe. Se scegli PayPal, Apple Pay o Google Pay, interviene anche il servizio di pagamento selezionato, secondo i suoi termini. Le transazioni di prova non addebitano denaro reale. <a href="https://stripe.com/it/privacy" target="_blank" rel="noopener noreferrer">Privacy Stripe</a> · <a href="https://www.paypal.com/it/legalhub/paypal/privacy-full" target="_blank" rel="noopener noreferrer">Privacy PayPal</a>.</li>
        <li><strong>Google, per la casella Gmail di contatto</strong>, quando ci scriviamo via email. <a href="https://policies.google.com/privacy?hl=it" target="_blank" rel="noopener noreferrer">Privacy Google</a>.</li>
      </ul>
      <p>La sincronizzazione dell’agenda con iCloud serve a evitare sovrapposizioni. Il calendario esportato per il tutor contiene materia, orario e modalità; non include nomi o recapiti degli studenti.</p>
      <p>WhatsApp e gli strumenti esterni per le videolezioni si aprono quando scegli il relativo collegamento. Il logo WhatsApp non incorpora una chat né carica un tracciatore. Per le conversazioni su WhatsApp si applica anche <a href="https://www.whatsapp.com/legal/privacy-policy-eea" target="_blank" rel="noopener noreferrer">l’informativa WhatsApp</a>. Il sito non registra automaticamente le videolezioni e non invia compiti o allegati a servizi di intelligenza artificiale per correggerli.</p>
      <p>Possono inoltre ricevere i dati necessari i professionisti incaricati degli adempimenti contabili e le autorità nei casi previsti dalla legge. I fornitori tecnici possono trattare dati anche fuori dallo Spazio economico europeo, secondo i loro accordi sul trattamento e le garanzie previste dal GDPR, come decisioni di adeguatezza o clausole contrattuali standard. Puoi chiedermi informazioni sui fornitori e sulle garanzie applicabili al tuo trattamento.</p>
    </section>

    <section aria-labelledby="privacy-conservazione"><h2 id="privacy-conservazione">Per quanto tempo conservo i dati</h2>
      <dl className="privacy-retention">
        <div><dt>Richieste senza seguito e incontri che non portano a lezioni</dt><dd>Fino a {privacyRetention.unansweredRequestMonths} mesi dall’ultimo contatto, inclusi eventuali test orientativi collegati.</dd></div>
        <div><dt>Account e attività didattica</dt><dd>Per la durata del rapporto e fino a {privacyRetention.learningMonths} mesi dalla sua conclusione: anagrafica, piani, avanzamento, compiti, consegne, allegati, correzioni, inviti e comunicazioni di servizio.</dd></div>
        <div><dt>Documenti amministrativi e fiscali</dt><dd>Per il periodo richiesto dalla legge, ordinariamente 10 anni per la documentazione contabile. Questo termine non si estende automaticamente ai compiti e agli allegati didattici.</dd></div>
        <div><dt>Sicurezza e accessi</dt><dd>Il cookie di accesso dura al massimo 12 ore; quello dell’anteprima del sito 4 ore. I contatori dei moduli scadono a fine ora e vengono rimossi durante gli invii successivi. I log dell’infrastruttura seguono i tempi e le finalità di sicurezza del fornitore, senza essere usati per pubblicità.</dd></div>
      </dl>
      <p>Alla scadenza elimino o rendo anonimi i dati che non servono più, comprese le copie degli allegati sotto il mio controllo. Un obbligo di legge o una contestazione possono richiedere di conservare più a lungo solo le informazioni pertinenti. Le copie di sicurezza dei fornitori seguono i loro cicli di sovrascrittura e non vengono usate per l’attività ordinaria.</p>
    </section>

    <section aria-labelledby="privacy-cookie"><h2 id="privacy-cookie">Cookie e dati tecnici</h2>
      <p>Il sito utilizza cookie tecnici per mantenere l’accesso all’account e all’anteprima riservata. Non integra cookie pubblicitari o strumenti di analisi del comportamento. I contatori contro gli invii ripetuti usano impronte dell’email e, quando disponibile, dell’indirizzo di rete; non salvano questi indirizzi in chiaro nei contatori. I servizi di hosting ricevono comunque i dati tecnici necessari a fornire e proteggere il sito.</p>
    </section>

    <section aria-labelledby="privacy-minori"><h2 id="privacy-minori">Studenti minorenni</h2>
      <p>Se sei minorenne, compila la richiesta insieme a un genitore o a chi esercita la responsabilità genitoriale e usa il suo recapito. Il genitore può avere un proprio accesso collegato allo studente. Questa indicazione non autorizza a caricare diagnosi o altri documenti sanitari.</p>
    </section>

    <section aria-labelledby="privacy-diritti"><h2 id="privacy-diritti">I tuoi diritti e come contattarmi</h2>
      <p>Puoi chiedere accesso, rettifica, cancellazione, limitazione e, quando applicabile, portabilità dei dati o opporti al trattamento basato sul legittimo interesse. Se un trattamento si basa sul consenso, puoi revocarlo senza pregiudicare quanto svolto prima della revoca. La cancellazione può essere limitata dai dati che devo conservare per legge o per tutelare un diritto.</p>
      <p>Scrivi a <a href={`mailto:${privacyContact}`}>{privacyContact}</a>, indicando la richiesta e il servizio che hai usato. Rispondo di norma entro un mese; se la richiesta è complessa ti comunico nei termini l’eventuale proroga. Verifico l’identità solo nella misura necessaria per proteggere i dati.</p>
      <p>Puoi inoltre rivolgerti al <a href="https://www.garanteprivacy.it/home/diritti" target="_blank" rel="noopener noreferrer">Garante per la protezione dei dati personali</a> e presentare un reclamo.</p>
    </section>
  </article>;
}
