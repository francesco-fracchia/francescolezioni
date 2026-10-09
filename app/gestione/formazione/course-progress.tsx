'use client';
import { useEffect,useState } from 'react';
type Progress={course:{id:string;title:string;status:string};materials:{id:string;title:string;module_title:string}[];students:{id:string;name:string;student_status:string;enrollment_status:string;completed:{material_id:string;completed_at:string}[];last_completed_at:string|null}[]};
const date=(s:string)=>new Intl.DateTimeFormat('it-IT',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Rome'}).format(new Date(s));
export default function CourseProgress({courseId}:{courseId:string}){
  const [data,setData]=useState<Progress|null>(null);const [error,setError]=useState('');const [loading,setLoading]=useState(false);
  async function load(){setLoading(true);setError('');try{
    const r=await fetch('/api/gestione/formazione/avanzamento?corso='+courseId,{cache:'no-store'});const d=await r.json() as Progress&{error?:string};
    if(!r.ok)throw Error(d.error||'Avanzamento non disponibile.');setData(d);
  }catch(e){setError((e as Error).message);}finally{setLoading(false);}}
  useEffect(()=>{void load();},[courseId]);
  return <section className="learning-course-progress"><div className="learning-toolbar"><h3>Avanzamento degli iscritti</h3><button className="button outline" disabled={loading} onClick={load}>{loading?'Caricamento…':'Aggiorna avanzamento'}</button></div>{error&&<p className="error" role="alert">{error}</p>}
    {data&&<><p>Lo studente o il referente segna i materiali completati. Il conteggio include soltanto quelli disponibili, senza bozze e materiali archiviati.</p>{data.course.status!=='published'&&<p>Il corso è in bozza o archiviato: gli iscritti non possono accedere ai materiali.</p>}
      {!data.students.length&&<p>Nessuno studente assegnato a questo corso.</p>}{data.students.map(s=><article key={s.id} className="registry-card"><div className="learning-toolbar"><h4>{s.name}</h4><span>{s.completed.length} / {data.materials.length} completati</span></div><progress max={data.materials.length||1} value={s.completed.length} aria-label={'Avanzamento di '+s.name}/>
        <p>{s.enrollment_status==='revoked'?'Iscrizione revocata':'Iscrizione attiva'}{s.student_status==='archived'?' · Studente archiviato':''}{s.last_completed_at?' · Ultimo completamento '+date(s.last_completed_at):''}</p>
        <details><summary>Dettaglio dei materiali</summary><ul className="learning-progress-list">{data.materials.map(m=>{const completed=s.completed.find(p=>p.material_id===m.id);return <li key={m.id}><strong>{m.title}</strong><span>{m.module_title} · {completed?'Completato il '+date(completed.completed_at):'Da completare'}</span></li>;})}</ul>{!data.materials.length&&<p>Il corso non ha ancora materiali disponibili.</p>}</details>
        {s.student_status==='active'&&<p><a className="text-link" href={'/studente?anteprima='+s.id}>Apri anteprima studente</a></p>}</article>)}
    </>}
  </section>;
}
