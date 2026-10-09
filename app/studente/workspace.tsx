'use client';
import WhatsAppIcon from '@/components/site/whatsapp-icon';
import { useCallback,useEffect,useRef,useState } from 'react';
import StudentHome,{type StudentView} from './home';
import StudentPackages from './packages';
import StudentCourses from './courses';
import StudentReferrals from './referrals';
import MeetingLink from './meeting-link';
import CalendarDownload from './calendar-download';
import { activeAppointment } from '@/lib/student-home';
import StudentStudy from './study';
import StudentHomework from './homework';
import type { StudentData,Material } from '@/lib/learning/types';
const date=(s:string)=>new Intl.DateTimeFormat('it-IT',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Rome'}).format(new Date(s));
const statuses:Record<string,string>={planned:'Fissata',cancelled:'Cancellata',expired:'Scaduta',paid:'Saldo ricevuto',manual_paid:'Saldo ricevuto',awaiting:'Da pagare',pending:'Pagamento in corso',awaiting_payment:'In attesa di pagamento',payment_review:'Pagamento da verificare',confirmed:'Confermata',unverified:'Saldo da verificare'};
export default function StudentWorkspace(){
 const [data,setData]=useState<StudentData|null>(null);const [error,setError]=useState('');const [busy,setBusy]=useState('');const [tab,setTab]=useState<StudentView>('home');const [future,setFuture]=useState(true);const [focusTarget,setFocusTarget]=useState<string|null>(null);const [loading,setLoading]=useState(true);const [homeRevision,setHomeRevision]=useState(0);const pending=useRef<AbortController|null>(null);const selected=useRef('');const [now,setNow]=useState(()=>Date.now());
 const load=useCallback((student?:string,initial=false)=>{
  pending.current?.abort();const controller=new AbortController();pending.current=controller;
  selected.current=student||'';
  const params=new URLSearchParams(window.location.search);if(student)params.set('studente',student);
  return fetch('/api/studente?'+params,{cache:'no-store',signal:controller.signal}).then(async response=>{
   const result=await response.json() as StudentData&{error?:string};
   if(controller.signal.aborted)return;
   setError('');
   if(!response.ok){if([401,403,404].includes(response.status))setData(null);throw Error(result.error||'Area studente non disponibile.');}
   selected.current=result.selected||'';setData(result);setHomeRevision(v=>v+1);
   if(initial){const view=params.get('vista');setTab(view==='pacchetti'?'packages':view==='inviti'?'referrals':view==='lezioni'?'lessons':view==='piano'?'study':view==='compiti'?'homework':['corsi','materiali'].includes(view||'')?'courses':'home');}
  }).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Area studente non disponibile.');})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
 },[]);
 useEffect(()=>{void load(undefined,true);return()=>pending.current?.abort();},[load]);
 useEffect(()=>{if(!data?.nextAppointment)return;const end=Date.parse(data.nextAppointment.ends_at);if(!Number.isFinite(end))return;const timer=setTimeout(()=>void load(data.selected||undefined),Math.min(Math.max(end-Date.now()+1000,1000),2147483647));return()=>clearTimeout(timer);},[data,load]);
 function refresh(student?:string){setLoading(true);setError('');void load(student);}
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(timer);},[]);
 function navigate(view:StudentView,target?:string){setTab(view);setFocusTarget(target||null);}
 useEffect(()=>{
  if(!focusTarget)return;
  function reveal(){const element=document.getElementById(focusTarget!);if(!element)return false;element.focus({preventScroll:true});element.scrollIntoView({block:'start'});return true;}
  if(reveal())return;const observer=new MutationObserver(()=>{if(reveal())observer.disconnect();});observer.observe(document.body,{childList:true,subtree:true});return()=>observer.disconnect();
 },[focusTarget,tab,data?.selected]);
 async function complete(m:Material&{completed_at:string|null}){if(!data?.selected)return;setBusy(m.id);setError('');try{const r=await fetch('/api/studente',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({studentId:data.selected,materialId:m.id,completed:!m.completed_at})});const d=await r.json() as {error?:string};if(!r.ok)throw Error(d.error);if(selected.current===data.selected)await load(data.selected);}catch(e){setError((e as Error).message);}finally{setBusy('');}}
 function paymentUrl(kind:'lesson'|'booking',id:string){const p=new URLSearchParams({studentId:data!.selected!,kind,id});if(data?.preview)p.set('anteprima',data.selected!);return '/studente/pagamenti?'+p;}
 return <>{error&&<div role="alert" className="error"><p>{error}</p><button className="button outline" onClick={()=>refresh(data?.selected||undefined)}>Riprova</button></div>}{!data&&!error&&<p role="status">Caricamento…</p>}{data&&(data.students.length===0?<section className="booking-empty"><h2>Account da collegare</h2><p>Francesco deve ancora collegare il tuo account alla scheda dello studente. Se sei un genitore, può collegarlo alle schede dei tuoi figli.</p><a className="button dark" href="https://wa.me/393500316324" target="_blank" rel="noreferrer"><WhatsAppIcon/>Contatta Francesco</a></section>:<>

 <div className="learning-toolbar"><h2>{data.students.find(s=>s.id===data.selected)?.name}</h2>{data.students.length>1&&<label>Studente<select value={data.selected||''} onChange={e=>{setFocusTarget(null);setData(null);refresh(e.target.value);}}>{data.students.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>}<div role="group" className="student-tabs" aria-label="Sezioni area studente"><button className="button outline" aria-pressed={tab==='home'} onClick={()=>navigate('home')}>Inizio</button><button className="button outline" aria-pressed={tab==='homework'} onClick={()=>navigate('homework')}>Compiti</button><button className="button outline" aria-pressed={tab==='study'} onClick={()=>navigate('study')}>Il mio percorso</button><button className="button outline" aria-pressed={tab==='courses'} onClick={()=>navigate('courses')}>Corsi e materiali</button><button className="button outline" aria-pressed={tab==='lessons'} onClick={()=>navigate('lessons')}>Lezioni e saldi</button><button className="button outline" aria-pressed={tab==='packages'} onClick={()=>navigate('packages')}>Pacchetti</button><button className="button outline" aria-pressed={tab==='referrals'} onClick={()=>navigate('referrals')}>Invita un amico</button></div></div>
 {tab==='home'?<StudentHome key={`${data.selected}:${data.preview}:${homeRevision}`} data={data} onNavigate={navigate} onRefresh={()=>refresh(data.selected||undefined)} refreshing={loading}/>:tab==='packages'?<StudentPackages key={data.selected} studentId={data.selected!} preview={data.preview}/>:tab==='referrals'?<StudentReferrals key={data.selected} studentId={data.selected!} preview={data.preview}/>:tab==='homework'?<StudentHomework key={data.selected} studentId={data.selected!} preview={data.preview}/>:tab==='study'?<StudentStudy key={data.selected} studentId={data.selected!} preview={data.preview} focusedId={focusTarget}/>:tab==='courses'?<StudentCourses key={data.selected} data={data} focusedId={focusTarget} busy={busy} refreshing={loading} onFocus={setFocusTarget} onComplete={complete} onRefresh={()=>refresh(data.selected||undefined)}/>:<section><label className="checkbox"><input type="checkbox" checked={future} onChange={e=>setFuture(e.target.checked)}/>Solo lezioni future attive</label><p>Gli importi si riferiscono a ciascun partecipante. I pagamenti online sono ancora in prova.</p>{data.truncated&&<p>Mostriamo le ultime 200 lezioni e 200 prenotazioni. Per lo storico precedente contatta Francesco.</p>}
 {data.lessons.filter(l=>!future||(new Date(l.starts_at).getTime()>now&&l.status==='planned')).map(l=><article key={l.id} className="registry-card"><span className="booking-badge">{statuses[l.status]||l.status}</span><h3>{l.subject}</h3><p>{date(l.starts_at)} · {l.mode} · 55 minuti</p>{l.amount!==null?<p><strong>{l.amount/100} €</strong> · {statuses[l.payment_status||'unverified']||'Saldo da verificare'}{l.status!=='planned'&&!['paid','manual_paid','payment_review'].includes(l.payment_status||'')?' · Non richiesto':''}</p>:<p>Saldo da verificare con Francesco.</p>}{!!l.credit_amount&&<p>Credito invito applicato: {l.credit_amount/100} €. L’importo indicato include già il credito.</p>}{l.package_status&&<p>{l.package_status==='applied'?'Lezione coperta dal pacchetto: non devi pagare altro. Quota attribuita: 19 €.':'Associazione al pacchetto rimossa; la lezione è tornata disponibile.'}</p>}{l.paid_at&&<p>Saldo registrato il {date(l.paid_at)}</p>}{l.package_status!=='returned'&&l.status==='cancelled'&&['paid','manual_paid','payment_review'].includes(l.payment_status||'')&&<p>Contatta Francesco per verificare il saldo già ricevuto.</p>}{l.status==='planned'&&l.payment_method==='online'&&<p>Pagamento entro {date(new Date(new Date(l.starts_at).getTime()-3600000).toISOString())}.</p>}{l.package_status!=='applied'&&l.status==='planned'&&['cash','pos'].includes(l.payment_method)&&<p>{l.payment_method==='cash'?'Contanti':'POS'} su accordo, prima dell’inizio.</p>}{activeAppointment({...l,kind:'lesson'},now)&&<MeetingLink appointment={{...l,kind:'lesson'}} now={now}/>}
 {activeAppointment({...l,kind:'lesson'},now)&&<CalendarDownload appointment={{...l,kind:'lesson'}}/>}{l.payment_id&&<a className="button outline" href={paymentUrl('lesson',l.payment_id)}>Apri saldo personale · prova</a>}</article>)}
 {data.bookings.filter(b=>!future||(new Date(b.starts_at).getTime()>now&&['pending','awaiting_payment','confirmed','payment_review'].includes(b.status))).map(b=><article key={b.id} className="registry-card"><span className="booking-badge">{b.status==='pending'?'In attesa di conferma':statuses[b.status]||b.status}</span><h3>{b.subject}</h3><p>{date(b.starts_at)} · {b.mode}</p>{activeAppointment({...b,kind:'booking'},now)&&<MeetingLink appointment={{...b,kind:'booking'}} now={now}/>}
 {activeAppointment({...b,kind:'booking'},now)&&<CalendarDownload appointment={{...b,kind:'booking'}}/>}<a className="button outline" href={paymentUrl('booking',b.id)}>Apri saldo personale · prova</a></article>)}
 {!data.lessons.some(l=>!future||(new Date(l.starts_at).getTime()>now&&l.status==='planned'))&&!data.bookings.some(b=>!future||(new Date(b.starts_at).getTime()>now&&['pending','awaiting_payment','confirmed','payment_review'].includes(b.status)))&&<div className="booking-empty"><p>{future?'Nessuna lezione futura attiva.':'Nessuna lezione collegata alla scheda.'}</p></div>}</section>}
 </>)}</>;
}
