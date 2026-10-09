import {ArrowRight,CalendarDays,ChevronDown,ClipboardList,NotebookPen,UserRound,Users} from 'lucide-react';
import {faqEntries} from '@/lib/public-faq';
import WhatsAppIcon from './whatsapp-icon';
import type {OpenDialog} from './types';

const firstSteps = [
 {title:'Ci conosciamo',detail:'Scegli un orario per i 15 minuti gratuiti. Mi mostri il programma e mi racconti cosa devi preparare. Può partecipare anche un genitore.',icon:CalendarDays},
 {title:'Decidiamo da dove partire',detail:'Confrontiamo gli argomenti con quello che sai già. Concordiamo le lezioni e valutiamo se lavorare da solo o con compagni dello stesso livello.',icon:ClipboardList},
 {title:'Lavoriamo sugli esercizi',detail:'Ti mostro i passaggi, poi provi tu. Rivediamo gli errori e decidiamo cosa riprendere nella lezione successiva.',icon:NotebookPen},
];

export function FirstSteps(){
 return <section className="wrap home-first-steps" aria-labelledby="first-steps-title">
  <div className="home-section-heading"><div><p className="subject-audience">Prima di prenotare lezioni</p><h2 id="first-steps-title">Come cominciamo</h2></div><a className="text-link" href="/incontro">Il primo incontro<ArrowRight size={18} aria-hidden="true"/></a></div>
  <ol className="home-step-grid">{firstSteps.map(({title,detail,icon:Icon},index)=><li key={title}><div className="home-step-top"><span>0{index+1}</span><Icon size={24} aria-hidden="true"/></div><h3>{title}</h3><p>{detail}</p></li>)}</ol>
  <p className="reading-note">Il primo incontro serve a conoscerci e guardare il programma: non è una lezione di prova e non ti impegna ad acquistare.</p>
 </section>;
}

export function LessonFormats({open}:{open:OpenDialog}){
 return <section className="wrap home-lesson-formats" aria-labelledby="lesson-formats-title">
  <div className="home-section-heading"><div><p className="subject-audience">A Lodi oppure online · 55 minuti</p><h2 id="lesson-formats-title">Da solo o con i compagni</h2></div><a className="text-link" href="/prezzi">Prezzi e condizioni<ArrowRight size={18} aria-hidden="true"/></a></div>
  <div className="home-format-grid">
   <article className="home-format-individual"><span className="public-card-label"><UserRound size={20} aria-hidden="true"/>Individuale</span><p className="home-format-price"><strong>20 €</strong><span>per lezione</span></p><h3>Ci fermiamo dove ti serve.</h3><p>Una lezione solo per te: possiamo riprendere le basi, lavorare su un esercizio o preparare gli argomenti del tuo esame.</p><a className="button outline" href="/incontro">Parliamone nel primo incontro<ArrowRight size={18} aria-hidden="true"/></a></article>
   <article className="home-format-group"><span className="public-card-label"><Users size={20} aria-hidden="true"/>Gruppo · da 2 a 4 studenti</span><p className="home-format-price"><strong>15 €</strong><span>a persona, per lezione</span></p><h3>Stesso argomento, domande diverse.</h3><p>Puoi venire con i tuoi compagni o chiedermi di trovare un gruppo. Prima confronto programmi, preparazione e orari.</p><div className="actions"><button className="button dark" onClick={()=>open('group',undefined,true)}>Ho già un compagno</button><button className="text-link" onClick={()=>open('group')}>Cerco un gruppo<ArrowRight size={18} aria-hidden="true"/></button></div></article>
  </div>
  <div className="home-package-note"><p><strong>Preferisci organizzare più incontri?</strong> Il pacchetto di 5 individuali costa 95 €. Concordiamo prima programma e condizioni.</p><a className="text-link" href="/prezzi">Dettagli del pacchetto<ArrowRight size={18} aria-hidden="true"/></a></div>
  <p className="reading-note">La richiesta di gruppo è gratuita. Ricevi la proposta e decidi se partecipare; la formazione del gruppo dipende dai compagni e dagli orari disponibili.</p>
 </section>;
}

const parentQuestions = ['Posso contattarti per mio figlio?','Segui anche ragazzi con DSA?','Come si svolgono le lezioni online?','Materiali e correzioni sono compresi?'];

export function ParentQuestions(){
 return <section className="wrap home-parent-questions" aria-labelledby="parent-questions-title">
  <div><p className="subject-audience">Per studenti e genitori</p><h2 id="parent-questions-title">Prima di scrivermi</h2><p>Per cominciare mi bastano la classe, la materia e cosa c’è da preparare. Se non sai ancora quali argomenti riprendere, li guardiamo insieme.</p><a className="button dark" href="https://wa.me/393500316324" target="_blank" rel="noopener noreferrer"><WhatsAppIcon/>Scrivimi su WhatsApp</a><a className="text-link home-all-questions" href="/domande">Pagamenti, cancellazioni e altre informazioni<ArrowRight size={18} aria-hidden="true"/></a></div>
  <div className="home-parent-faq">{parentQuestions.map(question=>{
   const entry=faqEntries.find(([title])=>title===question);
   return entry?<details key={question}><summary>{entry[0]}<ChevronDown size={19} aria-hidden="true"/></summary><p>{entry[1]}</p></details>:null;
  })}</div>
 </section>;
}
