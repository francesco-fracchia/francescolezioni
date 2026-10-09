import {ArrowRight,CalendarDays,ChevronDown,ClipboardList,NotebookPen,UserRound,Users} from 'lucide-react';
import {faqEntries} from '@/lib/public-faq';
import WhatsAppIcon from './whatsapp-icon';
import type {OpenDialog} from './types';

const firstSteps = [
 {title:'Il primo incontro',detail:'Puoi scegliere dal calendario un incontro gratuito di 15 minuti, durante il quale mi racconti cosa devi preparare e guardiamo il programma. Se mi contatti per tuo figlio, puoi partecipare anche tu.',icon:CalendarDays},
 {title:'Il programma delle lezioni',detail:'Dopo aver visto gli argomenti e la tua preparazione, ci accordiamo su come organizzare le lezioni e valutiamo se farle individualmente o con compagni che studiano le stesse cose.',icon:ClipboardList},
 {title:'Il lavoro a lezione',detail:'Affrontiamo gli esercizi insieme, lasciando anche a te il tempo di provare. Le difficoltà che emergono ci aiutano a capire cosa riprendere e come proseguire negli incontri successivi.',icon:NotebookPen},
];

export function FirstSteps(){
 return <section className="wrap home-first-steps" aria-labelledby="first-steps-title">
  <div className="home-section-heading"><div><p className="subject-audience">Prima di prenotare lezioni</p><h2 id="first-steps-title">Come cominciamo</h2></div><a className="text-link" href="/incontro">Il primo incontro<ArrowRight size={18} aria-hidden="true"/></a></div>
  <ol className="home-step-grid">{firstSteps.map(({title,detail,icon:Icon},index)=><li key={title}><div className="home-step-top"><span>0{index+1}</span><Icon size={24} aria-hidden="true"/></div><h3>{title}</h3><p>{detail}</p></li>)}</ol>
  <p className="reading-note">Questi 15 minuti servono a conoscerci e parlare del programma. Non sono una lezione di prova e puoi decidere liberamente se proseguire.</p>
 </section>;
}

export function LessonFormats({open}:{open:OpenDialog}){
 return <section className="wrap home-lesson-formats" aria-labelledby="lesson-formats-title">
  <div className="home-section-heading"><div><p className="subject-audience">A Lodi oppure online · 55 minuti</p><h2 id="lesson-formats-title">Da solo o con i compagni</h2></div><a className="text-link" href="/prezzi">Prezzi e condizioni<ArrowRight size={18} aria-hidden="true"/></a></div>
  <div className="home-format-grid">
   <article className="home-format-individual"><span className="public-card-label"><UserRound size={20} aria-hidden="true"/>Individuale</span><p className="home-format-price"><strong>20 €</strong><span>per lezione</span></p><h3>Lezioni individuali</h3><p>Nelle lezioni individuali possiamo dedicarci agli argomenti che ti servono, con il tempo necessario per riprendere le basi o soffermarci su un esercizio prima di andare avanti.</p><a className="button outline" href="/incontro">Parliamone nel primo incontro<ArrowRight size={18} aria-hidden="true"/></a></article>
   <article className="home-format-group"><span className="public-card-label"><Users size={20} aria-hidden="true"/>Gruppo · da 2 a 4 studenti</span><p className="home-format-price"><strong>15 €</strong><span>a persona, per lezione</span></p><h3>Lezioni con i compagni</h3><p>Se tu e i tuoi compagni state preparando gli stessi argomenti, possiamo lavorare insieme. Se invece cerchi un gruppo, puoi lasciarmi programma e disponibilità e vedrò se ci sono altri studenti con cui organizzarlo.</p><div className="actions"><button className="button dark" onClick={()=>open('group',undefined,true)}>Ho già un compagno</button><button className="text-link" onClick={()=>open('group')}>Cerco un gruppo<ArrowRight size={18} aria-hidden="true"/></button></div></article>
  </div>
  <div className="home-package-note"><p>Puoi anche concordare un pacchetto di <strong>5 lezioni individuali a 95 €</strong>, dopo aver parlato del programma e delle condizioni.</p><a className="text-link" href="/prezzi">Dettagli del pacchetto<ArrowRight size={18} aria-hidden="true"/></a></div>
  <p className="reading-note">Non paghi nulla per chiedere un gruppo e decidi se partecipare quando ti propongo i compagni e gli orari. Potrebbe volerci un po’ di tempo per trovare persone con programmi e preparazione compatibili.</p>
 </section>;
}

const parentQuestions = ['Posso contattarti per mio figlio?','Segui anche ragazzi con DSA?','Come si svolgono le lezioni online?','Materiali e correzioni sono compresi?'];

export function ParentQuestions(){
 return <section className="wrap home-parent-questions" aria-labelledby="parent-questions-title">
  <div><p className="subject-audience">Per studenti e genitori</p><h2 id="parent-questions-title">Prima di scrivermi</h2><p>Quando mi scrivi, dimmi la classe o l’esame e la materia su cui vorresti lavorare. Non serve avere già un elenco preciso degli argomenti da riprendere, possiamo capirlo insieme guardando il programma e gli esercizi.</p><a className="button dark" href="https://wa.me/393500316324" target="_blank" rel="noopener noreferrer"><WhatsAppIcon/>Scrivimi su WhatsApp</a><a className="text-link home-all-questions" href="/domande">Pagamenti, cancellazioni e altre informazioni<ArrowRight size={18} aria-hidden="true"/></a></div>
  <div className="home-parent-faq">{parentQuestions.map(question=>{
   const entry=faqEntries.find(([title])=>title===question);
   return entry?<details key={question}><summary>{entry[0]}<ChevronDown size={19} aria-hidden="true"/></summary><p>{entry[1]}</p></details>:null;
  })}</div>
 </section>;
}
