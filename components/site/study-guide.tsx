"use client";
import {useState} from 'react';
import {BookOpen,GraduationCap,NotebookPen,ArrowRight,Sigma,Code2,Check} from 'lucide-react';
import {examPlans,recommendedLessons} from '@/lib/exam-preparation';

const subjects = [
  {value:'matematica',label:'Matematica',detail:'Equazioni, funzioni e geometria',icon:Sigma},
  {value:'informatica',label:'Informatica',detail:'Programmazione, sistemi e reti',icon:Code2},
];
export default function StudyGuide(){
  const [need,setNeed]=useState('superiori'),[subject,setSubject]=useState('matematica'),[exam,setExam]=useState('analisi-1');
  const plan=examPlans.find(p=>p.slug===exam)!;
  return <section className="study-guide public-panel" aria-labelledby="study-guide-title">
    <div><p className="subject-audience">Vediamo cosa ti serve</p><h2 id="study-guide-title">Che cosa stai preparando?</h2><p>Qui puoi trovare gli argomenti su cui possiamo lavorare, a seconda che tu debba preparare una verifica, la maturità o un esame universitario.</p></div>
    <div className="guide-options" role="group" aria-label="Tipo di preparazione">{[['superiori','Verifica o recupero'],['universita','Esame universitario'],['maturita','Maturità']].map(([value,label])=><button type="button" key={value} aria-pressed={need===value} onClick={()=>setNeed(value)}>{value==='superiori'?<BookOpen aria-hidden="true" size={18}/>:value==='universita'?<GraduationCap aria-hidden="true" size={18}/>:<NotebookPen aria-hidden="true" size={18}/>} {label}</button>)}</div>
    <div className="guide-result"><div key={need} className="guide-result-body">
      {need==='superiori'&&<fieldset className="guide-subjects"><legend>Materia</legend><div>{subjects.map(({value,label,detail,icon:Icon})=><button type="button" key={value} aria-pressed={subject===value} aria-label={value==='informatica'?'Informatica e sistemi e reti':label} onClick={()=>setSubject(value)}><Icon size={22} aria-hidden="true"/><span><strong>{label}</strong><small>{detail}</small></span><span className="subject-choice-check" aria-hidden="true">{subject===value&&<Check size={16}/>}</span></button>)}</div></fieldset>}
      {need==='universita'&&<label className="guide-exam">Il tuo esame<select value={exam} onChange={e=>setExam(e.target.value)}>{examPlans.map(p=><option key={p.slug} value={p.slug}>{p.name}</option>)}</select></label>}
      <div aria-live="polite" aria-atomic="true">{need==='superiori'?<>
        <h3>{subject==='matematica'?'Riprendiamo gli esercizi che ti danno difficoltà':'Lavoriamo sul codice e sugli esercizi del tuo programma'}</h3>
        <p>{subject==='matematica'?'Possiamo riprendere equazioni, funzioni e geometria seguendo il tuo programma. Mi puoi portare anche un esercizio che non riesci a iniziare, così vediamo insieme quali passaggi ti mancano.':'Lavoriamo su programmazione, database, sistemi e reti partendo dalle consegne e dal codice che hai scritto. Leggere insieme il tuo tentativo ci permette di capire dove nasce l’errore e cosa bisogna riprendere.'}</p>
        <a className="button dark" href={'/lezioni/'+subject}>Argomenti e modalità<ArrowRight className="action-arrow" aria-hidden="true" size={18}/></a>
      </>:need==='universita'?<>
        <h3>{plan.name} · da {recommendedLessons(plan)} lezioni di ripasso</h3><p>Il numero indicato è una proposta iniziale per chi ha già seguito il corso. Guardando il programma del tuo docente e quello che sai già, possiamo saltare alcuni argomenti oppure aggiungere lezioni dedicate agli esercizi.</p><a className="button dark" href={'/esami/'+plan.slug}>Scegli gli argomenti<ArrowRight className="action-arrow" aria-hidden="true" size={18}/></a>
      </>:<>
        <h3>Un primo blocco di 5 lezioni individuali a 95 €</h3><p>Per preparare la prova scegliamo gli argomenti che hai bisogno di riprendere. Puoi anche fare lezione con compagni che seguono lo stesso programma, in gruppi da 2 a 4 studenti a 15 € a persona.</p><a className="button dark" href="/maturita">Il ripasso per la maturità<ArrowRight className="action-arrow" aria-hidden="true" size={18}/></a>
      </>}</div>
    </div></div>
  </section>;
}
