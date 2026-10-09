"use client";
import {useState} from 'react';
import {ArrowRight,Check} from 'lucide-react';
import {examPlans,recommendedLessons} from '@/lib/exam-preparation';

const subjects = [
  {value:'matematica',label:'Matematica',detail:'Equazioni, funzioni e geometria'},
  {value:'informatica',label:'Informatica',detail:'Programmazione, sistemi e reti'},
];
export default function StudyGuide(){
  const [need,setNeed]=useState('superiori'),[subject,setSubject]=useState('matematica'),[exam,setExam]=useState('analisi-1');
  const plan=examPlans.find(p=>p.slug===exam)!;
  return <section className="study-guide" aria-labelledby="study-guide-title">
    <div><h2 id="study-guide-title">Che cosa stai preparando?</h2></div>
    <div className="guide-options" role="group" aria-label="Tipo di preparazione">{[['superiori','Verifica o recupero'],['universita','Esame universitario'],['maturita','Maturità']].map(([value,label])=><button type="button" key={value} aria-pressed={need===value} onClick={()=>setNeed(value)}>{label}</button>)}</div>
    <div className="guide-result"><div key={need} className="guide-result-body">
      {need==='superiori'&&<fieldset className="guide-subjects"><legend>Materia</legend><div>{subjects.map(({value,label,detail})=><button type="button" key={value} aria-pressed={subject===value} aria-label={value==='informatica'?'Informatica e sistemi e reti':label} onClick={()=>setSubject(value)}><span><strong>{label}</strong><small>{detail}</small></span><span className="subject-choice-check" aria-hidden="true">{subject===value&&<Check size={16}/>}</span></button>)}</div></fieldset>}
      {need==='universita'&&<label className="guide-exam">Il tuo esame<select value={exam} onChange={e=>setExam(e.target.value)}>{examPlans.map(p=><option key={p.slug} value={p.slug}>{p.name}</option>)}</select></label>}
      <div aria-live="polite" aria-atomic="true">{need==='superiori'?<>
        <h3>{subject==='matematica'?'Matematica':'Informatica'}</h3>
        <p>{subject==='matematica'?'Equazioni, funzioni e geometria, seguendo il programma della tua classe. Puoi portarmi gli esercizi assegnati e le verifiche da rivedere.':'Programmazione, database, sistemi e reti. Lavoriamo sulle consegne e sul codice che hai scritto per capire gli errori e come risolverli.'}</p>
        <a className="text-link" href={'/lezioni/'+subject}>Argomenti e modalità<ArrowRight className="action-arrow" aria-hidden="true" size={18}/></a>
      </>:need==='universita'?<>
        <h3>{plan.name} · da {recommendedLessons(plan)} lezioni di ripasso</h3><p>Il numero indicato è una proposta iniziale per chi ha già seguito il corso. Guardando il programma del tuo docente e quello che sai già, possiamo saltare alcuni argomenti oppure aggiungere lezioni dedicate agli esercizi.</p><a className="text-link" href={'/esami/'+plan.slug}>Scegli gli argomenti<ArrowRight className="action-arrow" aria-hidden="true" size={18}/></a>
      </>:<>
        <h3>Un primo blocco di 5 lezioni individuali a 95 €</h3><p>Per preparare la prova scegliamo gli argomenti che hai bisogno di riprendere. Puoi anche fare lezione con compagni che seguono lo stesso programma, in gruppi da 2 a 4 studenti a 15 € a persona.</p><a className="text-link" href="/maturita">Il ripasso per la maturità<ArrowRight className="action-arrow" aria-hidden="true" size={18}/></a>
      </>}</div>
    </div></div>
  </section>;
}
