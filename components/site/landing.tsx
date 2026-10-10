"use client";
import {MapPin,Monitor,CalendarDays,ArrowRight,NotebookPen} from 'lucide-react';
import StudyGraphic from './study-graphic';
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
    <div className="actions"><a className="button dark" href="/incontro"><CalendarDays aria-hidden="true" size={19}/>Prenota un incontro gratuito</a><a className="text-link hero-whatsapp" href="https://wa.me/393500316324" target="_blank" rel="noopener noreferrer"><WhatsAppIcon/>Scrivimi su WhatsApp</a></div>
   </div>
   <StudyGraphic/>
  </section>
  <LessonFormats open={open}/>
  <div className="wrap home-calendar"><AvailabilityPreview/></div>
  <div className="wrap home-guide"><StudyGuide/></div>
  <section className="wrap home-tutor" aria-labelledby="home-tutor-title">
   <div className="home-tutor-photo"><img src="/images/francesco-fracchia.jpg" alt="Francesco Fracchia" width={1179} height={1497} loading="lazy"/></div>
   <div>
    <h2 id="home-tutor-title">Ciao, sono Francesco</h2>
    <p>Sono laureato in Informatica e frequento la magistrale. Da diversi anni do ripetizioni a studenti delle superiori e dell’università, anche con DSA. A lezione puoi chiedermi di rispiegare un passaggio senza sentirti in imbarazzo.</p>

    <div className="actions"><a className="text-link" href="/francesco">Chi sono<ArrowRight size={18} aria-hidden="true"/></a><a className="text-link" href="/metodo">Come lavoro a lezione<ArrowRight size={18} aria-hidden="true"/></a><button className="text-link" onClick={()=>open('test')}>Prova il test gratuito</button></div>
   </div>
  </section>
  <section className="home-platform-band">
   <div className="wrap home-platform">
    <div className="home-platform-copy"><span className="public-icon-badge"><NotebookPen aria-hidden="true"/></span><h2>Esercizi e correzioni</h2><p>Nell’area studente puoi consegnare gli esercizi concordati e ritrovare materiali e correzioni.</p><a className="text-link" href="/piattaforma">Guarda l’area studente<ArrowRight size={18} aria-hidden="true"/></a></div>
    <PlatformExample/>
   </div>
  </section>
  <ParentQuestions/>
 </main>;
}
