import {ArrowRight,ChevronDown} from 'lucide-react';
import {faqEntries} from '@/lib/public-faq';
import type {OpenDialog} from './types';

export function LessonFormats({open}:{open:OpenDialog}){
 return <section className="wrap home-lesson-formats" aria-labelledby="lesson-formats-title">
  <div className="home-section-heading"><h2 id="lesson-formats-title">Lezioni individuali e di gruppo</h2><a className="text-link" href="/prezzi">Prezzi e condizioni<ArrowRight size={18} aria-hidden="true"/></a></div>
  <p className="home-format-duration">A Lodi oppure online. Ogni lezione dura 55 minuti.</p>
  <div className="home-format-grid">
   <article className="home-format-individual"><h3>Individuali</h3><p className="home-format-price"><strong>20 €</strong><span>per lezione</span></p><p>Seguiamo il tuo programma e ci fermiamo sugli esercizi che richiedono più tempo. Puoi fare una sola lezione oppure continuare con altri incontri.</p></article>
   <article className="home-format-group"><h3>In gruppo</h3><p className="home-format-price"><strong>15 €</strong><span>a persona, per lezione</span></p><p>Da 2 a 4 studenti con programma e preparazione compatibili. Puoi venire con i tuoi compagni oppure lasciarmi argomenti e disponibilità per cercare un gruppo.</p><div className="actions"><button className="text-link" onClick={()=>open('group')}>Cerco un gruppo<ArrowRight size={18} aria-hidden="true"/></button><button className="text-link" onClick={()=>open('group',undefined,true)}>Ho già un compagno<ArrowRight size={18} aria-hidden="true"/></button></div></article>
  </div>
  <div className="home-package-note"><p><strong>5 lezioni individuali a 95 €</strong>, dopo aver concordato programma e condizioni.</p><a className="text-link" href="/prezzi">Dettagli del pacchetto<ArrowRight size={18} aria-hidden="true"/></a></div>
  <p className="reading-note">La richiesta di un gruppo è gratuita. Decidi se partecipare quando ricevi la proposta; può servire tempo per trovare compagni e orari compatibili.</p>
 </section>;
}

const parentQuestions = ['Posso contattarti per mio figlio?','Segui anche ragazzi con DSA?','Come si svolgono le lezioni online?','Materiali e correzioni sono compresi?'];

export function ParentQuestions(){
 return <section className="wrap home-parent-questions" aria-labelledby="parent-questions-title">
  <div><h2 id="parent-questions-title">Domande frequenti</h2><a className="text-link home-all-questions" href="/domande">Anche pagamenti e cancellazioni<ArrowRight size={18} aria-hidden="true"/></a></div>
  <div className="home-parent-faq">{parentQuestions.map(question=>{
   const entry=faqEntries.find(([title])=>title===question);
   return entry?<details key={question}><summary>{entry[0]}<ChevronDown size={19} aria-hidden="true"/></summary><p>{entry[1]}</p></details>:null;
  })}</div>
 </section>;
}
