"use client";
import {MapPin,Monitor,CalendarDays,ArrowRight,GraduationCap,NotebookPen} from 'lucide-react';
import StudyGraphic from './study-graphic';
import ReferralHighlight from './referral-highlight';
import StudyGuide from './study-guide';
import AvailabilityPreview from './availability-preview';
import PlatformExample from './platform-example';
import {FirstSteps,LessonFormats,ParentQuestions} from './home-information';
import WhatsAppIcon from './whatsapp-icon';
import {studio} from '@/lib/public-offer';
import type {OpenDialog} from './types';

export default function Landing({open}:{open:OpenDialog}){
 return <main className="home-compact">
  <section className="hero wrap marketing-hero">
   <div className="hero-copy">
    <h1>Ripetizioni di matematica<br/><span>e informatica</span></h1>
    <p>Se un esercizio non ti torna o il codice non funziona, partiamo da lì. Ti spiego i passaggi, poi provi tu. E quando c’è un dubbio ci fermiamo.</p>
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
   <div className="home-tutor-photo"><img src="/images/francesco-fracchia.jpg" alt="Francesco Fracchia" width={1179} height={1497} loading="lazy"/><span>Il tuo insegnante, dal primo incontro.</span></div>
   <div>
    <p className="subject-audience">Ciao, sono Francesco.</p><h2 id="home-tutor-title">Puoi chiedermi di rispiegare.</h2>
    <p>Sono laureato in Informatica e frequento la magistrale. Seguo ragazzi delle superiori e universitari da diversi anni; ho lavorato anche con molti ragazzi con DSA.</p>
    <p>Puoi farmi domande o interrompermi. Cerchiamo il passaggio che crea difficoltà, senza dare per scontato che le basi siano già chiare.</p>
    <ul className="home-tutor-facts"><li><GraduationCap size={20} aria-hidden="true"/>Superiori e università</li><li><NotebookPen size={20} aria-hidden="true"/>Esercizi del tuo programma</li></ul>
    <div className="actions"><a className="text-link" href="/francesco">Qualcosa in più su di me<ArrowRight size={18} aria-hidden="true"/></a><a className="text-link" href="/metodo">Come lavoro a lezione<ArrowRight size={18} aria-hidden="true"/></a><button className="text-link" onClick={()=>open('test')}>Prova il test gratuito</button></div>
   </div>
  </section>
  <FirstSteps/>
  <LessonFormats open={open}/>
  <section className="home-platform-band">
   <div className="wrap home-platform">
    <div className="home-platform-copy"><span className="public-icon-badge"><NotebookPen aria-hidden="true"/></span><p className="subject-audience">Anche tra una lezione e l’altra</p><h2>Gli esercizi, con i miei commenti.</h2><p>Ho costruito un’area studente in cui ritrovare materiali, consegne e correzioni. Se concordiamo del lavoro da casa, puoi consegnarlo qui e rileggere i passaggi da riprendere.</p><p className="reading-note">Il lavoro tra le lezioni si decide insieme. Accessi e contenuti sono in preparazione per l’apertura.</p><a className="text-link" href="/piattaforma">Guarda l’area studente<ArrowRight size={18} aria-hidden="true"/></a></div>
    <PlatformExample/>
   </div>
  </section>
  <div className="wrap home-calendar"><AvailabilityPreview/></div>
  <div className="wrap"><ReferralHighlight/></div>
  <ParentQuestions/>
 </main>;
}
