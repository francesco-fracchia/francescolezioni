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
    <div><p className="subject-audience">Vediamo cosa ti serve</p><h2 id="study-guide-title">Che cosa stai preparando?</h2><p>Scegli qui sotto. Puoi leggere gli argomenti prima di decidere se contattarmi.</p></div>
    <div className="guide-options" role="group" aria-label="Tipo di preparazione">{[['superiori','Verifica o recupero'],['universita','Esame universitario'],['maturita','Maturità']].map(([value,label])=><button type="button" key={value} aria-pressed={need===value} onClick={()=>setNeed(value)}>{value==='superiori'?<BookOpen aria-hidden="true" size={18}/>:value==='universita'?<GraduationCap aria-hidden="true" size={18}/>:<NotebookPen aria-hidden="true" size={18}/>} {label}</button>)}</div>
    <div className="guide-result"><div key={need} className="guide-result-body">
      {need==='superiori'&&<fieldset className="guide-subjects"><legend>Materia</legend><div>{subjects.map(({value,label,detail,icon:Icon})=><button type="button" key={value} aria-pressed={subject===value} aria-label={value==='informatica'?'Informatica e sistemi e reti':label} onClick={()=>setSubject(value)}><Icon size={22} aria-hidden="true"/><span><strong>{label}</strong><small>{detail}</small></span><span className="subject-choice-check" aria-hidden="true">{subject===value&&<Check size={16}/>}</span></button>)}</div></fieldset>}
      {need==='universita'&&<label className="guide-exam">Il tuo esame<select value={exam} onChange={e=>setExam(e.target.value)}>{examPlans.map(p=><option key={p.slug} value={p.slug}>{p.name}</option>)}</select></label>}
      <div aria-live="polite" aria-atomic="true">{need==='superiori'?<>
        <h3>{subject==='matematica'?'Riprendiamo gli esercizi che ti danno difficoltà':'Lavoriamo sul codice e sugli esercizi del tuo programma'}</h3>
        <p>{subject==='matematica'?'Equazioni, funzioni, geometria e gli argomenti della tua verifica. Porta un esercizio che non ti torna, anche se non sai da dove iniziare.':'Programmazione, database, sistemi e reti. Leggiamo la consegna e il tuo tentativo per capire dove fermarci.'}</p>
        <a className="button dark" href={'/lezioni/'+subject}>Argomenti e modalità<ArrowRight className="action-arrow" aria-hidden="true" size={18}/></a>
      </>:need==='universita'?<>
        <h3>{plan.name}: da {recommendedLessons(plan)} lezioni di ripasso</h3><p>È un punto di partenza per chi ha già seguito il corso. Nel programma puoi togliere ciò che sai già o aggiungere esercitazioni; confrontiamo poi il piano con quello del docente.</p><a className="button dark" href={'/esami/'+plan.slug}>Scegli gli argomenti<ArrowRight className="action-arrow" aria-hidden="true" size={18}/></a>
      </>:<>
        <h3>Un primo blocco di 5 lezioni individuali a 95 €</h3><p>Scegliamo gli argomenti da riprendere prima della prova. Puoi anche studiare con compagni che preparano lo stesso programma: 15 € a persona per lezione, da 2 a 4 studenti.</p><a className="button dark" href="/maturita">Il ripasso per la maturità<ArrowRight className="action-arrow" aria-hidden="true" size={18}/></a>
      </>}</div>
    </div></div>
  </section>;
}
