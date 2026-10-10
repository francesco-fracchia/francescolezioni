import {ArrowRight,ChevronDown,UserRound,Users} from 'lucide-react';
import {faqEntries} from '@/lib/public-faq';
import type {OpenDialog} from './types';

export function LessonFormats({open}:{open:OpenDialog}){
 return <section className="wrap home-lesson-formats" aria-labelledby="lesson-formats-title">
  <div className="home-section-heading"><div><p className="subject-audience">A Lodi oppure online · 55 minuti</p><h2 id="lesson-formats-title">Da solo o con i compagni</h2></div><a className="text-link" href="/prezzi">Prezzi e condizioni<ArrowRight size={18} aria-hidden="true"/></a></div>
  <div className="home-format-grid">
   <article className="home-format-individual">
    <h3 className="home-format-heading"><UserRound size={22} aria-hidden="true"/>Lezioni individuali</h3>
    <p className="home-format-price"><strong>20 €</strong><span>per lezione · 55 minuti</span></p>
    <p className="home-format-package"><strong>5 lezioni · 95 €</strong></p>
    <a className="button outline" href="/incontro">Incontro gratuito<ArrowRight size={18} aria-hidden="true"/></a>
   </article>
   <article className="home-format-group">
    <h3 className="home-format-heading"><Users size={22} aria-hidden="true"/>Lezioni di gruppo</h3>
    <p className="home-format-price"><strong>15 €</strong><span>a persona, per lezione · 55 minuti</span></p>
    <p className="home-format-group-size">Da 2 a 4 studenti</p>
    <div className="actions"><button className="button dark" onClick={()=>open('group',undefined,true)}>Ho già un compagno</button><button className="text-link" onClick={()=>open('group')}>Cerco un gruppo<ArrowRight size={18} aria-hidden="true"/></button></div>
   </article>
  </div>
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
