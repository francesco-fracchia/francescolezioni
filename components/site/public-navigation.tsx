'use client';
import {useEffect,useId,useRef} from 'react';
import {ChevronDown} from 'lucide-react';
import {activePublicNavigation,publicLessonNavigation,publicNavigation} from '@/lib/public-navigation';

export default function PublicNavigation({path,mobile=false,lessonsOpen=false,onLessonsChange,onNavigate}:{path:string;mobile?:boolean;lessonsOpen?:boolean;onLessonsChange?:(open:boolean)=>void;onNavigate?:()=>void}){
 const lessonsRef=useRef<HTMLDivElement>(null),lessonsToggle=useRef<HTMLButtonElement>(null);
 const lessonLinksId=useId();
 useEffect(()=>{
  if(!lessonsOpen)return;
  function escape(event:KeyboardEvent){if(event.key==='Escape'){onLessonsChange?.(false);lessonsToggle.current?.focus();}}
  function outside(event:PointerEvent){if(!lessonsRef.current?.contains(event.target as Node))onLessonsChange?.(false);}
  document.addEventListener('keydown',escape);document.addEventListener('pointerdown',outside);
  return()=>{document.removeEventListener('keydown',escape);document.removeEventListener('pointerdown',outside);};
 },[lessonsOpen,onLessonsChange]);
 function navigate(){onLessonsChange?.(false);onNavigate?.();}
 return <nav id={mobile?'public-mobile-navigation':'public-navigation'} className="public-navigation" aria-label="Menu principale">
  {publicNavigation.map(item=>item.href==='/catalogo'?<div key={item.href} ref={lessonsRef} className="public-lessons-menu">
   <div className="public-lessons-trigger">
    <a href={item.href} aria-current={activePublicNavigation(path)===item.href?'page':undefined} onClick={navigate}>{mobile?'Tutte le lezioni':item.label}</a>
    {!mobile&&<button ref={lessonsToggle} type="button" aria-label="Mostra le categorie di lezioni" aria-expanded={lessonsOpen} aria-controls={lessonLinksId} onClick={()=>onLessonsChange?.(!lessonsOpen)}><ChevronDown size={16} aria-hidden="true"/></button>}
   </div>
   <div id={lessonLinksId} className={'public-lesson-links'+(mobile||lessonsOpen?' is-open':'')}>{publicLessonNavigation.map(lesson=><a key={lesson.href} href={lesson.href} aria-current={path===lesson.href?'page':undefined} onClick={navigate}><strong>{lesson.label}</strong><small>{lesson.description}</small></a>)}</div>
  </div>:<a key={item.href} href={item.href} aria-current={activePublicNavigation(path)===item.href?'page':undefined} onClick={navigate}>{item.label}</a>)}
  {mobile&&<a className="public-mobile-book button dark" href="/incontro" onClick={navigate}>Incontro gratuito · 15 minuti</a>}
  <a className="public-student" href="/studente" onClick={navigate}>Area studente</a>
 </nav>;
}
