"use client";
import {MapPin,Monitor,CalendarDays,ChevronDown,ArrowRight} from 'lucide-react';
import StudyGraphic from './study-graphic';
import ReferralHighlight from './referral-highlight';
import StudyGuide from './study-guide';
import AvailabilityPreview from './availability-preview';
import PlatformExample from './platform-example';
import {LessonFormats,ParentQuestions} from './home-information';
import WhatsAppIcon from './whatsapp-icon';
import {studio} from '@/lib/public-offer';
import type {OpenDialog} from './types';

export default function Landing({open}:{open:OpenDialog}){
 return <main className="home-compact home-editorial">
  <section className="hero wrap marketing-hero">
   <div className="hero-copy">
    <h1>Ripetizioni di matematica e informatica</h1>
    <p>Do ripetizioni a ragazzi delle superiori e studenti universitari, in studio a Lodi oppure online. Puoi contattarmi per recuperare un argomento, preparare una verifica o un esame.</p>
    <div className="hero-formats">
     <div><MapPin size={19} aria-hidden="true"/><span><strong>In presenza a Lodi</strong><small>{studio.address}</small></span></div>
     <div><Monitor size={19} aria-hidden="true"/><span><strong>In videochiamata</strong><small>Lavagna digitale e schermo condiviso</small></span></div>
    </div>
    <div className="actions"><a className="button dark" href="/incontro"><CalendarDays aria-hidden="true" size={19}/>Prenota un incontro gratuito</a><a className="text-link hero-whatsapp" href="https://wa.me/393500316324" target="_blank" rel="noopener noreferrer"><WhatsAppIcon/>Scrivimi su WhatsApp</a></div>
   </div>
   <figure className="hero-portrait"><img src="/images/francesco-fracchia.jpg" alt="Francesco Fracchia" width={1179} height={1497} fetchPriority="high"/><figcaption>Francesco Fracchia</figcaption></figure>
  </section>
  <section className="wrap home-tutor" aria-labelledby="home-tutor-title">
   <div><h2 id="home-tutor-title">Ciao, sono Francesco</h2><a className="text-link" href="/francesco">La mia formazione ed esperienza<ArrowRight size={18} aria-hidden="true"/></a></div>
   <div>
    <p>Sono laureato in Informatica e sto frequentando la magistrale. Da diversi anni do ripetizioni a ragazzi delle superiori e studenti universitari, e ho seguito anche molti ragazzi con DSA.</p>
    <p>Sono ancora studente anch’io e conosco la frustrazione di passare ore su un argomento che non torna. A lezione puoi farmi domande e chiedermi di rispiegare un passaggio, anche se l’abbiamo già visto.</p>
    <a className="text-link" href="/metodo">Come lavoro a lezione<ArrowRight size={18} aria-hidden="true"/></a>
   </div>
  </section>
  <div className="wrap home-guide"><StudyGuide/><details className="home-live-example"><summary>Prova un esercizio di matematica o informatica<ChevronDown size={19} aria-hidden="true"/></summary><div className="home-live-content"><p>Cambia il valore con il cursore e osserva il grafico o il risultato del codice.</p><StudyGraphic/></div></details><button className="text-link home-test-link" onClick={()=>open('test')}>Fai il test gratuito sulle basi<ArrowRight size={18} aria-hidden="true"/></button></div>
  <LessonFormats open={open}/>
  <div className="wrap home-calendar"><AvailabilityPreview/></div>
  <section className="home-platform-band">
   <div className="wrap home-platform">
    <div className="home-platform-copy"><h2>Esercizi e correzioni nell’area studente</h2><p>Nell’area studente trovi i materiali delle lezioni e puoi caricare gli esercizi da correggere. Il lavoro da fare a casa è facoltativo e ci accordiamo durante le lezioni su quali esercizi seguirò.</p><a className="text-link" href="/piattaforma">Come funziona la piattaforma<ArrowRight size={18} aria-hidden="true"/></a><p className="reading-note">Sto preparando gli accessi e i contenuti per l’apertura.</p></div>
    <PlatformExample/>
   </div>
  </section>
  <div className="wrap"><ReferralHighlight/></div>
  <ParentQuestions/>
 </main>;
}
