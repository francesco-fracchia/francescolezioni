import {ChevronDown} from 'lucide-react';

const steps = [
  {title:'Guardiamo da dove partire', text:'Mi mostri il programma e gli esercizi che ti creano difficoltà. Scegliamo insieme cosa riprendere.'},
  {title:'Ti mostro i passaggi, poi provi tu', text:'Lavoriamo su un esercizio o sul codice. Puoi fermarmi quando qualcosa non è chiaro: lo rispieghiamo prima di andare avanti.'},
  {title:'Rivediamo gli errori', text:'Correggiamo il lavoro e decidiamo quali argomenti affrontare nella lezione successiva.'},
];

export default function LessonPreview(){
  return <div className="lesson-preview">{steps.map((step,i)=><details suppressHydrationWarning key={step.title} open={i===0}>
    <summary><span className="lesson-preview-number" aria-hidden="true">0{i+1}</span><span>{step.title}</span><ChevronDown size={18} aria-hidden="true"/></summary>
    <p>{step.text}</p>
  </details>)}</div>;
}
