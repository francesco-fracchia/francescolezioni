'use client';
import { useEffect,useState } from 'react';
import { CalendarDays,FileText,BookOpen,RefreshCw } from 'lucide-react';
import { civilDate,lessonDate,type StudyData } from '@/lib/study/types';
import { pendingDue,reviewLabels,type HomeworkData } from '@/lib/homework/types';
import { homeworkOverview,materialsToStudy,nextAppointment,studyOverview } from '@/lib/student-home';
import { studio } from '@/lib/public-offer';
import type { StudentData } from '@/lib/learning/types';
import MeetingLink from './meeting-link';
import CalendarDownload from './calendar-download';

export type StudentView='home'|'courses'|'lessons'|'study'|'homework'|'referrals'|'packages';
type Remote<T>={status:'loading'}|{status:'error';message:string}|{status:'ready';data:T};
function useResource<T>(path:string,studentId:string,preview:boolean) {
  const [state,setState]=useState<Remote<T>>({status:'loading'}),[revision,setRevision]=useState(0);
  useEffect(()=>{
    const controller=new AbortController(),params=new URLSearchParams({studente:studentId});
    if(preview)params.set('anteprima',studentId);
    fetch(path+'?'+params,{cache:'no-store',signal:controller.signal}).then(async response=>{
      const result=await response.json() as T&{error?:string};
      if(!response.ok)throw Error(result.error||'Contenuti temporaneamente non disponibili.');
      return result;
    }).then(data=>{if(!controller.signal.aborted)setState({status:'ready',data});})
      .catch(e=>{if(!controller.signal.aborted)setState({status:'error',message:e.message});});
    return()=>controller.abort();
  },[path,studentId,preview,revision]);
  return {state,retry:()=>{setState({status:'loading'});setRevision(v=>v+1);}};
}
function Unavailable({state,retry}:{state:Remote<unknown>;retry:()=>void}) {
  return state.status==='loading'?<p role="status">Caricamento…</p>:state.status==='error'?<div role="alert"><p>{state.message}</p><button className="text-link" onClick={retry}>Riprova</button></div>:null;
}
function Brief({text}:{text:string}) { return text?<p className="student-home-brief">{text}</p>:null; }

export default function StudentHome({data,onNavigate,onRefresh,refreshing}:{data:StudentData;onNavigate:(view:StudentView,target?:string)=>void;onRefresh:()=>void;refreshing:boolean}) {
  const study=useResource<StudyData>('/api/studente/piano',data.selected!,data.preview);
  const homework=useResource<HomeworkData>('/api/studente/compiti',data.selected!,data.preview);
  const [now,setNow]=useState(()=>Date.now());
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(timer);},[]);
  const appointment=nextAppointment(data,now),tasks=homework.state.status==='ready'?homeworkOverview(homework.state.data):null;
  const path=study.state.status==='ready'?studyOverview(study.state.data):null,materials=materialsToStudy(data);
  const waitingBookings=data.bookings.filter(b=>Date.parse(b.ends_at)>now&&['pending','awaiting_payment','payment_review'].includes(b.status));
  return <section className="student-home" aria-label="Inizio">
    <div className="student-home-heading"><p>Lezioni, esercizi e materiali della scheda selezionata.</p><button className="text-link" disabled={refreshing} onClick={onRefresh}><RefreshCw size={16}/>{refreshing?'Aggiornamento…':'Aggiorna'}</button></div>
    <article className="student-next-lesson">
      <div><span className="student-home-label"><CalendarDays size={19}/>{appointment&&Date.parse(appointment.starts_at)<=now?'Lezione in corso':'Prossima lezione'}</span>
        {appointment?<><h2>{appointment.subject}</h2><p className="student-next-date">{lessonDate(appointment.starts_at)} · fino alle {new Intl.DateTimeFormat('it-IT',{timeStyle:'short',timeZone:'Europe/Rome'}).format(new Date(appointment.ends_at))}</p><p>{appointment.mode==='Lodi'?`${studio.address}, ${studio.city}`:'Online'}</p><span className="booking-badge">{appointment.kind==='lesson'?'Fissata':'Confermata'}</span></>:<><h2>Nessuna lezione confermata in programma</h2><p>Quando concordiamo un nuovo appuntamento, lo trovi qui.</p></>}
      </div>
      <div className="student-next-actions">{appointment&&<><MeetingLink appointment={appointment} now={now}/><CalendarDownload appointment={appointment}/></>}<button className="text-link" onClick={()=>onNavigate('lessons')}>Lezioni e saldi</button>{appointment&&<p>Scarichi un file .ics da aprire nel tuo calendario. Per gli spostamenti scarica di nuovo il file: non si aggiorna automaticamente.</p>}</div>
    </article>
    {waitingBookings.length>0&&<div className="student-booking-note"><p>{waitingBookings.length===1?'Hai una prenotazione ancora da confermare.':`Hai ${waitingBookings.length} prenotazioni ancora da confermare.`} Controlla lo stato in Lezioni e saldi.</p><button className="text-link" onClick={()=>onNavigate('lessons')}>Controlla prenotazioni</button></div>}
    {data.truncated&&<p className="student-home-limit">L’elenco mostra fino a 200 lezioni e 200 prenotazioni. La prossima lezione confermata viene cercata anche oltre questo limite.</p>}
    <div className="student-home-grid">
      <article className="student-home-card"><div className="student-home-card-title"><h2>Compiti da fare</h2><FileText size={21}/></div><Unavailable state={homework.state} retry={homework.retry}/>{tasks&&<>
        {!tasks.pending.length&&<p>{tasks.waiting?'Le consegne sono in attesa di correzione.':'Non ci sono compiti da consegnare o rivedere.'}</p>}
        <ul className="student-home-list">{tasks.pending.slice(0,3).map(({task,status,attempts})=><li key={task.id}><span className="booking-badge">{status==='revise'?'Da rivedere':'Da consegnare'}</span><h3>{task.title}</h3><p>{task.subject}{task.due_date?` · Entro ${civilDate(task.due_date)}`:''}</p>{task.due_date&&pendingDue(task.due_date)&&<p>Data superata, puoi ancora lavorarci.</p>}{attempts>=20&&<p>Hai raggiunto 20 tentativi: contatta Francesco.</p>}<button className="text-link" onClick={()=>onNavigate('homework','homework-'+task.id)}>Apri compito</button></li>)}</ul>
        {tasks.pending.length>3&&<p>Altri {tasks.pending.length-3} compiti nella sezione Compiti.</p>}{tasks.waiting>0&&<p>{tasks.waiting} {tasks.waiting===1?'consegna in attesa':'consegne in attesa'} di correzione.</p>}{homework.state.status==='ready'&&homework.state.data.truncated&&<p>Mostriamo gli ultimi 50 compiti condivisi.</p>}<button className="text-link student-home-all" onClick={()=>onNavigate('homework')}>Tutti i compiti</button>
      </>}</article>
      <article className="student-home-card"><div className="student-home-card-title"><h2>Ultima correzione</h2><FileText size={21}/></div><Unavailable state={homework.state} retry={homework.retry}/>{tasks&&(tasks.correction?<><span className="booking-badge">{reviewLabels[tasks.correction.submission.review_status]}</span><h3>{tasks.correction.task.title}</h3><p>Tentativo {tasks.correction.submission.attempt}{tasks.correction.submission.reviewed_at?' · '+lessonDate(tasks.correction.submission.reviewed_at):''}</p><Brief text={tasks.correction.submission.feedback}/><button className="text-link" onClick={()=>onNavigate('homework','homework-'+tasks.correction!.task.id)}>Leggi la correzione</button></>:<p>Le correzioni compaiono qui quando Francesco le condivide.</p>)}</article>
      <article className="student-home-card"><div className="student-home-card-title"><h2>Il tuo piano</h2><BookOpen size={21}/></div><Unavailable state={study.state} retry={study.retry}/>{path&&(path.plan?<><span className="booking-badge">{path.plan.subject}</span><h3>{path.plan.title}</h3>{path.plan.target_date&&<p>Obiettivo entro {civilDate(path.plan.target_date)}</p>}<Brief text={path.plan.next_steps||path.plan.objective}/><button className="text-link" onClick={()=>onNavigate('study','plan-'+path.plan!.id)}>Apri piano di studio</button></>:<p>Il piano comparirà qui quando Francesco lo condivide.</p>)}</article>
      <article className="student-home-card"><div className="student-home-card-title"><h2>Ultimo riepilogo</h2><FileText size={21}/></div><Unavailable state={study.state} retry={study.retry}/>{path&&(path.summary?<><p>{lessonDate(path.summary.starts_at)} · {path.summary.subject}</p><h3>{path.summary.title}</h3>{['cancelled','expired'].includes(path.summary.appointment_status)&&<p>La lezione è cancellata o scaduta. Il riepilogo già condiviso resta disponibile.</p>}<Brief text={path.summary.next_steps||path.summary.practice||path.summary.topics}/><button className="text-link" onClick={()=>onNavigate('study','summary-'+path.summary!.id)}>Leggi riepilogo</button></>:<p>I riepiloghi delle lezioni saranno raccolti qui.</p>)}</article>
      <article className="student-home-card student-home-materials"><div className="student-home-card-title"><h2>Materiali da studiare</h2><BookOpen size={21}/></div>{!materials.length&&<p>{data.materials.length?'Hai segnato come completati tutti i materiali disponibili. Puoi rileggerli in Corsi e materiali.':'Non ci sono ancora materiali assegnati alla tua scheda.'}</p>}<ul className="student-home-list">{materials.slice(0,3).map(m=><li key={m.id}><h3>{m.title}</h3><p>{m.kind==='text'?'Spiegazione':m.kind==='video'?'Video':'File'} · {data.courses.find(c=>c.id===data.modules.find(u=>u.id===m.module_id)?.course_id)?.title}</p><button className="text-link" onClick={()=>onNavigate('courses','material-'+m.id)}>Apri materiale</button></li>)}</ul><button className="text-link student-home-all" onClick={()=>onNavigate('courses')}>Tutti i corsi e materiali</button></article>
    </div>
  </section>;
}
