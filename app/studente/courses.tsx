'use client';

import {useState} from 'react';
import {BookOpen,Check,FileText,Play} from 'lucide-react';
import type {Course,Material,StudentData} from '@/lib/learning/types';

type StudentMaterial=Material&{completed_at:string|null};
type Props={data:StudentData;focusedId:string|null;busy:string;refreshing:boolean;onFocus:(id:string|null)=>void;onComplete:(material:StudentMaterial)=>Promise<void>;onRefresh:()=>void};
const kindLabel=(kind:string)=>kind==='video'?'Video':kind==='text'?'Spiegazione':'File';
const Icon=({kind}:{kind:string})=>kind==='video'?<Play size={18}/>:kind==='text'?<BookOpen size={18}/>:<FileText size={18}/>;

export default function StudentCourses({data,focusedId,busy,refreshing,onFocus,onComplete,onRefresh}:Props){
 const [courseId,setCourseId]=useState<string|null>(null);
 const [materialId,setMaterialId]=useState<string|null>(null);
 const [outlineOpen,setOutlineOpen]=useState(false);
 const focusedMaterial=data.materials.find(m=>'material-'+m.id===focusedId);
 const focusedCourse=data.modules.find(u=>u.id===focusedMaterial?.module_id)?.course_id;
 const course=data.courses.find(c=>c.id===(focusedCourse||courseId));
 const ordered=(c:Course)=>data.modules.filter(u=>u.course_id===c.id).flatMap(u=>data.materials.filter(m=>m.module_id===u.id));
 function url(id:string){const p=new URLSearchParams({studente:data.selected!,materiale:id});if(data.preview)p.set('anteprima',data.selected!);return '/api/studente/materiali?'+p;}
 function select(c:Course,m?:StudentMaterial){const items=ordered(c),next=m||items.find(i=>!i.completed_at)||items[0];setCourseId(c.id);setMaterialId(next?.id||null);setOutlineOpen(false);onFocus(next?'material-'+next.id:null);}
 function back(){setCourseId(null);setMaterialId(null);onFocus(null);}
 if(!data.courses.length)return <section className="booking-empty"><h2>Nessun corso assegnato</h2><p>I materiali compariranno qui quando Francesco li avrà preparati e assegnati alla tua scheda.</p></section>;
 if(!course)return <section aria-label="Corsi e materiali"><div className="course-list-heading"><h2>I tuoi corsi</h2><button className="text-link" disabled={refreshing} onClick={onRefresh}>{refreshing?'Aggiornamento…':'Aggiorna corsi'}</button></div><div className="course-library">{data.courses.map(c=>{const items=ordered(c),count=items.filter(m=>m.completed_at).length;return <article key={c.id} className="course-library-card"><span className="booking-badge">{c.subject}</span><h3>{c.title}</h3>{c.description&&<p className="learning-copy">{c.description}</p>}<div className="course-library-progress"><span>{count} / {items.length} materiali completati</span><progress value={count} max={items.length||1} aria-label={`Avanzamento ${c.title}`}/></div>{!items.length&&<p>Materiali in preparazione.</p>}<button className="button dark" onClick={()=>select(c)}>{!items.length?'Apri corso':count===items.length?'Rivedi il corso':count?'Riprendi':'Apri corso'}</button></article>;})}</div></section>;
 const modules=data.modules.filter(u=>u.course_id===course.id),items=ordered(course),count=items.filter(m=>m.completed_at).length;
 const material=focusedMaterial||items.find(m=>m.id===materialId)||items.find(m=>!m.completed_at)||items[0];
 const index=items.findIndex(m=>m.id===material?.id),module=modules.find(u=>u.id===material?.module_id);
 const attachments=items.filter(m=>m.module_id===material?.module_id&&m.kind==='file'&&m.id!==material?.id);
 return <section aria-label={`Corso ${course.title}`} className="course-reader">
  <div className="course-reader-heading"><button className="text-link" onClick={back}>Tutti i corsi</button><button className="text-link" disabled={refreshing} onClick={onRefresh}>{refreshing?'Aggiornamento…':'Aggiorna corso'}</button></div>
  <div className="learning-course-heading"><div><span className="booking-badge">{course.subject}</span><h2>{course.title}</h2>{course.description&&<p className="learning-copy">{course.description}</p>}</div><div className="learning-progress"><strong>{count} / {items.length}</strong><span>materiali completati</span><progress value={count} max={items.length||1} aria-label={`Avanzamento ${course.title}`}/></div></div>
  <button className="button outline course-index-toggle" aria-expanded={outlineOpen} aria-controls="course-outline" onClick={()=>setOutlineOpen(v=>!v)}>{outlineOpen?'Chiudi indice':'Mostra indice del corso'}</button>
  <div className="course-reader-layout"><nav id="course-outline" className="course-outline" data-open={outlineOpen} aria-label="Indice del corso"><h3>Contenuti del corso</h3>{!modules.length&&<p>Moduli in preparazione.</p>}{modules.map(u=><section key={u.id}><h4>{u.title}</h4>{!items.some(m=>m.module_id===u.id)&&<p>Materiali in preparazione.</p>}<ol>{items.filter(m=>m.module_id===u.id).map(m=><li key={m.id}><button type="button" aria-current={m.id===material?.id?'true':undefined} onClick={()=>select(course,m)}><Icon kind={m.kind}/><span><b>{m.title}</b><small>{kindLabel(m.kind)} · {m.completed_at?'Completato':'Da completare'}</small></span>{m.completed_at&&<Check size={17} aria-hidden="true"/>}</button></li>)}</ol></section>)}</nav>
   <div className="course-content">{material?<article id={'material-'+material.id} tabIndex={-1} className="course-lesson student-focus-target" key={material.id}><p className="course-lesson-position">{module?.title} · Materiale {index+1} di {items.length}</p><h3>{material.title}</h3><p className="course-lesson-meta">{kindLabel(material.kind)}{material.size?' · '+(material.size/1024/1024).toFixed(1)+' MB':''}{material.completed_at?' · Completato':''}</p>
    <LessonContent material={material} source={url(material.id)} onRefresh={onRefresh}/>
    {!!attachments.length&&<section className="course-attachments"><h4>File del modulo</h4><ul>{attachments.map(m=><li key={m.id}><a href={url(m.id)}><FileText size={17}/>{m.title}</a></li>)}</ul></section>}
    <div className="course-completion"><button className="button outline" disabled={!!busy||refreshing||data.preview} onClick={()=>void onComplete(material)}>{busy===material.id?'Salvataggio…':material.completed_at?'Segna da completare':'Segna come completato'}</button>{data.preview?<p>L’anteprima è in sola lettura.</p>:<p>Il completamento viene salvato nella tua scheda.</p>}</div>
    <div className="course-lesson-navigation"><button className="button outline" disabled={index<=0} onClick={()=>select(course,items[index-1])}>Precedente</button><span>{index+1} / {items.length}</span><button className="button dark" disabled={index>=items.length-1} onClick={()=>select(course,items[index+1])}>Successivo</button></div>
   </article>:<div className="booking-empty"><h3>Materiali in preparazione</h3><p>Il corso è assegnato alla tua scheda. I contenuti compariranno qui quando Francesco li condivide.</p></div>}</div>
  </div>
 </section>;
}

function LessonContent({material,source,onRefresh}:{material:StudentMaterial;source:string;onRefresh:()=>void}){
 const [failed,setFailed]=useState(false);
 const [retry,setRetry]=useState(0);
 if(material.kind==='text')return <div className="learning-copy course-lesson-text">{material.body}</div>;
 if(material.kind==='video')return <><video key={retry} controls playsInline preload="metadata" src={source} aria-label={material.title} onError={()=>setFailed(true)}/>{failed&&<div className="error" role="alert"><p>Il video non è disponibile o il browser non riesce a riprodurlo. Aggiorna il corso oppure prova ad aprire il file.</p><div className="registry-actions"><button className="text-link" onClick={()=>{setFailed(false);setRetry(v=>v+1);onRefresh();}}>Riprova video</button><a href={source} target="_blank" rel="noreferrer">Apri video</a></div></div>}</>;
 return <div className="course-file"><FileText size={30}/><p>{material.filename||material.title}</p><a className="button dark" href={source}>Scarica il file</a></div>;
}
