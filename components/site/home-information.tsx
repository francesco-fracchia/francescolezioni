import {ArrowRight,ChevronDown,UserRound,Users} from 'lucide-react';
import {faqEntries} from '@/lib/public-faq';
import type {OpenDialog} from './types';

export function LessonFormats({open}:{open:OpenDialog}){
 return <section className="wrap home-lesson-formats" aria-labelledby="lesson-formats-title">
  <div className="home-section-heading"><div><p className="subject-audience">A Lodi oppure online · 55 minuti</p><h2 id="lesson-formats-title">Da solo o con i compagni</h2></div><a className="text-link" href="/prezzi">Prezzi e condizioni<ArrowRight size={18} aria-hidden="true"/></a></div>
  <div className="home-format-grid">
   <article className="home-format-individual"><h3 className="home-format-heading"><UserRound size={22} aria-hidden="true"/>Lezioni individuali</h3><p className="home-format-price"><strong>20 €</strong><span>per lezione</span></p><p>Se hai bisogno di recuperare un argomento o preparare un esame, nelle lezioni individuali seguiamo il tuo programma e ci fermiamo sugli esercizi che richiedono più tempo. Puoi scegliere un solo incontro oppure continuare con altre lezioni, a seconda di quello che ti serve.</p><a className="button outline" href="/incontro">Parliamone nel primo incontro<ArrowRight size={18} aria-hidden="true"/></a></article>
   <article className="home-format-group"><h3 className="home-format-heading"><Users size={22} aria-hidden="true"/>Lezioni di gruppo</h3><p className="home-format-price"><strong>15 €</strong><span>a persona, per lezione</span></p><p>Le lezioni di gruppo sono per 2–4 studenti con un programma e una preparazione compatibili. Se hai già dei compagni, possiamo accordarci per studiare insieme; altrimenti lasciami i tuoi argomenti e gli orari in cui sei disponibile, così posso cercare un gruppo da proporti.</p><div className="actions"><button className="button dark" onClick={()=>open('group',undefined,true)}>Ho già un compagno</button><button className="text-link" onClick={()=>open('group')}>Cerco un gruppo<ArrowRight size={18} aria-hidden="true"/></button></div></article>
  </div>
  <div className="home-package-note"><p>Puoi anche concordare un pacchetto di <strong>5 lezioni individuali a 95 €</strong>, dopo aver parlato del programma e delle condizioni.</p><a className="text-link" href="/prezzi">Dettagli del pacchetto<ArrowRight size={18} aria-hidden="true"/></a></div>
  <p className="reading-note">Non paghi nulla per chiedere un gruppo e decidi se partecipare quando ti propongo i compagni e gli orari. Potrebbe volerci un po’ di tempo per trovare persone con programmi e preparazione compatibili.</p>
 </section>;
}

const parentQuestions = ['Posso contattarti per mio figlio?','Segui anche ragazzi con DSA?','Come si svolgono le lezioni online?','Materiali e correzioni sono compresi?'];

export function ParentQuestions(){
 return <section className="wrap home-parent-questions" aria-labelledby="parent-questions-title">
  <div><p className="subject-audience">Per studenti e genitori</p><h2 id="parent-questions-title">Domande sulle lezioni</h2><a className="text-link home-all-questions" href="/domande">Pagamenti, cancellazioni e altre informazioni<ArrowRight size={18} aria-hidden="true"/></a></div>
  <div className="home-parent-faq">{parentQuestions.map(question=>{
   const entry=faqEntries.find(([title])=>title===question);
   return entry?<details key={question}><summary>{entry[0]}<ChevronDown size={19} aria-hidden="true"/></summary><p>{entry[1]}</p></details>:null;
  })}</div>
 </section>;
}
