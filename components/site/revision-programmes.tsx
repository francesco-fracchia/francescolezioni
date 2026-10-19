'use client';
import {useState} from 'react';
import {studyPaths} from '@/lib/paths';

const lessonLinks:Record<string,string>={
 matematica:'/lezioni/matematica',informatica:'/lezioni/informatica',
 'analisi-1':'/esami/analisi-1',programmazione:'/esami/programmazione-1',
};

export default function RevisionProgrammes({initialSlug}:{initialSlug?:string}){
 const [selected,setSelected]=useState(()=>studyPaths.find(path=>path.slug===initialSlug)?.slug??studyPaths[0].slug);
 const programme=studyPaths.find(path=>path.slug===selected)!;
 return <main className="wrap subject-page revision-page">
  <section className="subject-intro"><h1>Programmi di ripasso</h1><p>Consulta gli argomenti su cui lavorare a lezione. I corsi registrati sono ancora in preparazione.</p></section>
  <div className="path-tabs" role="group" aria-label="Scegli un programma di ripasso">
   {studyPaths.map(path=><button key={path.slug} type="button" aria-pressed={selected===path.slug} aria-controls="revision-outline" onClick={()=>setSelected(path.slug)}>{path.name}</button>)}
  </div>
  <section id="revision-outline" className="revision-outline" aria-labelledby="revision-title">
   <div className="revision-heading"><span className="revision-status">Programma consultabile</span><h2 id="revision-title">{programme.name}</h2><p>{programme.description}</p></div>
   <ol>{programme.modules.map(module=><li key={module}>{module}</li>)}</ol>
   <a className="button outline" href={lessonLinks[programme.slug]}>Lezioni e prezzi</a>
  </section>
  <aside className="revision-recordings" aria-labelledby="recordings-title"><h2 id="recordings-title">Corsi registrati in preparazione</h2><p>Video e materiali dei corsi non sono ancora disponibili né in vendita.</p></aside>
 </main>;
}
