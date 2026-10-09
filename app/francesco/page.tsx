import {publicPageMetadata} from '@/lib/site-seo';
import {tutorProfile} from '@/lib/tutor-profile';
import {MessagesSquare} from 'lucide-react';
import WhatsAppIcon from '@/components/site/whatsapp-icon';

export function generateMetadata(){return publicPageMetadata('/francesco');}
export default function Page(){return <main className="wrap subject-page profile-page">
  <section className="subject-intro profile-intro">
    <img className="profile-portrait" src="/images/francesco-fracchia.jpg" alt="Francesco Fracchia" width={1179} height={1497}/>
    <div><p className="subject-audience">Chi sono</p><h1>Ciao, sono Francesco.</h1>
      <p>Sono laureato in Informatica e sto frequentando la magistrale. Mi sono diplomato in Informatica e Telecomunicazioni al Volta di Lodi, poi ho proseguito con la laurea triennale.</p><p>Da diversi anni affianco agli studi le ripetizioni di matematica e informatica per ragazzi delle superiori e studenti universitari. Ho anche una certificazione di inglese di livello B2.</p>
    </div>
  </section>
  <section className="reading-split profile-story"><div><h2>L’esperienza con le lezioni private</h2></div><div><p>Negli anni ho seguito ragazzi delle superiori e studenti universitari che avevano bisogno di recuperare le basi, preparare una verifica o affrontare un esame. In matematica ci soffermiamo sugli esercizi e sul ragionamento che porta alla soluzione, mentre in informatica lavoriamo anche sul codice per capire perché funziona o da dove arriva un errore.</p><p>Per organizzare le lezioni parto da quello che stai studiando e dal tempo che hai a disposizione, così possiamo decidere insieme quali argomenti affrontare prima.</p></div></section>
  <section className="reading-split"><div><span className="public-icon-badge"><MessagesSquare aria-hidden="true"/></span><h2>Il rapporto con gli studenti</h2></div><div><p>{tutorProfile[1]}</p></div></section>
  <section className="reading-split"><div><h2>Le lezioni con ragazzi con DSA</h2></div><div><p>{tutorProfile[2]}</p><p>Parto dalle abitudini dello studente e dagli strumenti che usa già a scuola. Ci accordiamo su schemi, tempi e lavoro tra un incontro e l’altro, senza dare per scontato che lo stesso modo di spiegare vada bene per tutti.</p></div></section>
  <section className="conversation-panel"><h2>Possiamo parlarne anche prima di prenotare</h2><p>Non serve arrivare con tutte le idee chiare. Dimmi la materia, la classe o l’esame e cosa ti sta dando difficoltà. Se mi scrivi per tuo figlio, possiamo guardare insieme il programma e capire da dove partire.</p>
    <div className="actions"><a className="button dark" href="https://wa.me/393500316324" target="_blank" rel="noopener noreferrer"><WhatsAppIcon/>Scrivimi su WhatsApp</a><a className="button outline" href="/incontro">Prenota un incontro gratuito</a></div>
    <a className="text-link" href="/metodo">Come lavoro durante le lezioni</a>
  </section>
</main>;}
