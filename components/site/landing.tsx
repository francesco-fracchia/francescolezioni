"use client";
import {MapPin,Monitor,CalendarDays,ArrowRight,NotebookPen} from 'lucide-react';
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
 return <main className="home-compact">
  <section className="hero wrap marketing-hero">
   <div className="hero-copy">
    <h1>Ripetizioni di matematica<br/><span>e informatica</span></h1>
    <p>Seguo ragazzi delle superiori e studenti universitari, a Lodi oppure online. Possiamo recuperare un argomento, preparare una verifica o lavorare sugli esercizi di un esame.</p>
    <div className="hero-formats">
     <div><MapPin size={19} aria-hidden="true"/><span><strong>Lezioni in presenza a Lodi</strong><small>Studio in {studio.address}</small></span></div>
     <div><Monitor size={19} aria-hidden="true"/><span><strong>Lezioni in videochiamata</strong><small>Lavagna digitale e schermo condiviso</small></span></div>
    </div>
    <div className="actions"><a className="button dark" href="/incontro"><CalendarDays aria-hidden="true" size={19}/>Prenota un incontro gratuito</a><a className="button outline" href="https://wa.me/393500316324" target="_blank" rel="noopener noreferrer"><WhatsAppIcon/>Scrivimi su WhatsApp</a></div>
   </div>
   <StudyGraphic/>
  </section>
  <div className="wrap home-guide"><StudyGuide/></div>
  <section className="wrap home-tutor" aria-labelledby="home-tutor-title">
   <div className="home-tutor-photo"><img src="/images/francesco-fracchia.jpg" alt="Francesco Fracchia" width={1179} height={1497} loading="lazy"/></div>
   <div>
    <h2 id="home-tutor-title">Ciao, sono Francesco</h2>
    <p>Sono laureato in Informatica e sto frequentando la magistrale. Da diversi anni do ripetizioni a ragazzi delle superiori e studenti universitari, e nel tempo ho seguito anche molti ragazzi con DSA.</p>
    <p>Essendo ancora studente, so cosa significa passare ore su un argomento e continuare ad avere dubbi. Per questo cerco di mettere i ragazzi a proprio agio, lasciando il tempo di fare domande e provare gli esercizi. Se una spiegazione non basta, la riprendiamo in un altro modo, senza dare per scontato che le basi siano già chiare.</p>

    <div className="actions"><a className="text-link" href="/francesco">Qualcosa in più su di me<ArrowRight size={18} aria-hidden="true"/></a><a className="text-link" href="/metodo">Come lavoro a lezione<ArrowRight size={18} aria-hidden="true"/></a><button className="text-link" onClick={()=>open('test')}>Prova il test gratuito</button></div>
   </div>
  </section>
  <LessonFormats open={open}/>
  <div className="wrap home-calendar"><AvailabilityPreview/></div>
  <section className="home-platform-band">
   <div className="wrap home-platform">
    <div className="home-platform-copy"><span className="public-icon-badge"><NotebookPen aria-hidden="true"/></span><p className="subject-audience">Anche tra una lezione e l’altra</p><h2>Esercizi e materiali nell’area studente</h2><p>Ho costruito una piattaforma per raccogliere il lavoro che facciamo insieme. Se durante le lezioni decidiamo di aggiungere qualche esercizio da svolgere a casa, potrai consegnarlo nella tua area e ritrovare lì i materiali e le mie correzioni.</p><p className="reading-note">L’uso della piattaforma e il lavoro da casa dipendono da quello che concordiamo. Sto preparando gli accessi e i contenuti per l’apertura.</p><a className="text-link" href="/piattaforma">Guarda l’area studente<ArrowRight size={18} aria-hidden="true"/></a></div>
    <PlatformExample/>
   </div>
  </section>
  <div className="wrap"><ReferralHighlight/></div>
  <ParentQuestions/>
 </main>;
}
