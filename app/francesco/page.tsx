import {publicPageMetadata} from '@/lib/site-seo';
import {tutorProfile} from '@/lib/tutor-profile';
import {GraduationCap, MessagesSquare, NotebookPen} from 'lucide-react';
import WhatsAppIcon from '@/components/site/whatsapp-icon';

export function generateMetadata(){return publicPageMetadata('/francesco');}
export default function Page(){return <main className="wrap subject-page profile-page">
  <section className="subject-intro profile-intro">
    <img className="profile-portrait" src="/images/francesco-fracchia.jpg" alt="Francesco Fracchia" width={1179} height={1497}/>
    <div><p className="subject-audience">Il tuo insegnante</p><h1>Ciao, sono Francesco.</h1>
      <p className="reading-lead">Sono laureato in Informatica e sto frequentando la magistrale.</p>
      <dl className="profile-facts"><div><dt><GraduationCap size={20} aria-hidden="true"/>La mia formazione</dt><dd>Ho iniziato al Volta di Lodi, con il diploma in Informatica e Telecomunicazioni, poi ho proseguito con la laurea triennale in Informatica.</dd></div><div><dt><NotebookPen size={20} aria-hidden="true"/>Le ripetizioni</dt><dd>Da diversi anni seguo ragazzi delle superiori e studenti universitari in matematica e informatica.</dd></div><div><dt><GraduationCap size={20} aria-hidden="true"/>Inglese</dt><dd>Ho una certificazione di inglese di livello B2.</dd></div></dl>
    </div>
  </section>
  <section className="reading-split profile-story"><div><span className="subject-audience">La mia esperienza</span><h2>Da un esercizio che non torna alla preparazione di un esame.</h2></div><div><p>Negli anni ho seguito ragazzi delle superiori e studenti universitari: qualcuno aveva bisogno di recuperare le basi, altri di preparare una verifica o un esame. In matematica lavoriamo sugli esercizi e sui passaggi del ragionamento; in informatica mettiamo mano al codice, lo proviamo e cerchiamo di capire perché funziona, oppure perché dà un errore.</p><p>All’inizio guardiamo quello che stai studiando e il tempo che hai: da lì decidiamo come organizzare le lezioni.</p></div></section>
  <section className="reading-split"><div><span className="public-icon-badge"><MessagesSquare aria-hidden="true"/></span><h2>Puoi farmi domande, anche a metà spiegazione.</h2></div><div><p>{tutorProfile[1]}</p></div></section>
  <section className="reading-split"><div><span className="subject-audience">Esperienza con ragazzi con DSA</span><h2>Schemi e tempo per riprendere i passaggi.</h2></div><div><p>{tutorProfile[2]}</p><p>Parto dalle abitudini dello studente e dagli strumenti che usa già a scuola. Ci accordiamo su schemi, tempi e lavoro tra un incontro e l’altro, senza dare per scontato che lo stesso modo di spiegare vada bene per tutti.</p></div></section>
  <section className="conversation-panel"><h2>Possiamo parlarne anche prima di prenotare</h2><p>Non serve arrivare con tutte le idee chiare. Dimmi la materia, la classe o l’esame e cosa ti sta dando difficoltà. Se mi scrivi per tuo figlio, possiamo guardare insieme il programma e capire da dove partire.</p>
    <div className="actions"><a className="button dark" href="https://wa.me/393500316324" target="_blank" rel="noopener noreferrer"><WhatsAppIcon/>Scrivimi su WhatsApp</a><a className="button outline" href="/incontro">Conosciamoci: 15 minuti gratuiti</a></div>
    <a className="text-link" href="/metodo">Come lavoro durante le lezioni</a>
  </section>
</main>;}
