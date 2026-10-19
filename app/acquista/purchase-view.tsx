'use client';
import {safeFormMessage} from '@/components/forms/form-feedback';
import {paymentCopy} from '@/lib/booking/payment-copy';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {LessonPackage} from '@/lib/packages/types';
import WhatsAppIcon from '@/components/site/whatsapp-icon';
import {loadPurchaseResource} from './load-resource';
import {createLatestRead,type ReadTicket} from './latest-read';

type Slot={id:string;starts_at:string;ends_at:string;mode:string};
type Data={students:{id:string;name:string}[];studentId:string;packages:LessonPackage[];ready:boolean;live:boolean;preview:boolean;checkoutMode:'disabled'|'test'|'live';warning?:string};
type PurchasesState={status:'loading';data:Data|null}|{status:'success';data:Data}|{status:'error';data:Data|null;message:string};
type SlotsState={status:'idle'|'loading'|'empty'}|{status:'success';slots:Slot[]}|{status:'error';message:string};
const date=(s:string)=>new Intl.DateTimeFormat('it-IT',{dateStyle:'full',timeZone:'Europe/Rome'}).format(new Date(s));
const time=(s:string)=>new Intl.DateTimeFormat('it-IT',{timeStyle:'short',timeZone:'Europe/Rome'}).format(new Date(s));
const purchasesError='Non riesco a caricare i tuoi acquisti. Riprova tra poco.';
const slotsError='Non riesco a caricare gli orari. Le lezioni acquistate restano disponibili: riprova tra poco.';
function ContactLink(){return <a className="whatsapp-link" href="https://wa.me/393500316324" target="_blank" rel="noopener noreferrer"><WhatsAppIcon/>Scrivi a Francesco su WhatsApp</a>;}
function LoadError({message,label,retry}:{message:string;label:string;retry:()=>void}){
 return <div className="reading-callout"><p className="error" role="alert">{message}</p><div className="actions"><button className="button outline" aria-label={label} onClick={retry}>Riprova</button><ContactLink/></div></div>;
}
export default function PurchaseView(){
 const [purchases,setPurchases]=useState<PurchasesState>({status:'loading',data:null});
 const [slotState,setSlotState]=useState<SlotsState>({status:'idle'});
 const [confirmed,setConfirmed]=useState(false),[studentId,setStudentId]=useState('');
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),[mode,setMode]=useState<'Online'|'Lodi'>('Online'),[booking,setBooking]=useState(''),[selected,setSelected]=useState(''),[subject,setSubject]=useState('Matematica'),[day,setDay]=useState(''),[message,setMessage]=useState('');
 const purchaseAttempt=useRef<{id:string;studentId:string;units:1|5}|null>(null),bookingAttempt=useRef<{id:string;packageId:string;slotId:string;subject:string;mode:'Online'|'Lodi'}|null>(null);
 const purchaseRead=useRef(createLatestRead()),slotRead=useRef(createLatestRead()),bookingSelection=useRef('');
 const acceptedRead=useRef<{studentId:string;ticket:ReadTicket}|null>(null),writing=useRef(false);
 const purchaseTarget=useRef<{studentId?:string;resume:boolean}>({resume:true});
 const data=purchases.data,reading=purchases.status==='loading';
 const currentStudentId=studentId||data?.studentId||'',studentName=data?.students.find(s=>s.id===currentStudentId)?.name||'';
 const sameStudent=!!data&&data.studentId===currentStudentId;
 const available=purchases.status==='success'&&sameStudent&&!!studentName&&!busy;
 const slots=slotState.status==='success'?slotState.slots:[];

 const loadSlots=useCallback(async(packageId:string)=>{
  const request=slotRead.current.start();
  bookingSelection.current=packageId;setBooking(packageId);setSelected('');setDay('');setSlotState({status:'loading'});
  try{
   const result=await loadPurchaseResource<{slots:Slot[]}>('/api/acquisti/prenota',request.signal,slotsError);
   if(!request.isCurrent())return;
   if(!Array.isArray(result?.slots))throw Error(slotsError);
   setSlotState(result.slots.length?{status:'success',slots:result.slots}:{status:'empty'});
   setDay(result.slots[0]?date(result.slots[0].starts_at):'');
  }catch(e){if(request.isCurrent())setSlotState({status:'error',message:e instanceof Error?e.message:slotsError});}
 },[]);
 const refresh=useCallback(async(studentId?:string,resume=false)=>{
  const request=purchaseRead.current.start();acceptedRead.current=null;
  const params=new URLSearchParams(window.location.search);
  const expectedStudent=studentId||params.get('studente')||undefined;
  purchaseTarget.current={studentId:expectedStudent,resume};
  if(expectedStudent)setStudentId(expectedStudent);
  setPurchases(previous=>({status:'loading',data:previous.data}));
  try{
   if(studentId){if(params.get('studente')!==studentId)params.delete('acquisto');params.set('studente',studentId);}
   const result=await loadPurchaseResource<Data>('/api/acquisti?'+params,request.signal,purchasesError);
   if(!request.isCurrent())return null;
   if(!result||!Array.isArray(result.students)||!Array.isArray(result.packages)||typeof result.studentId!=='string'||!result.students.some(s=>s.id===result.studentId))throw Error(purchasesError);
   if(expectedStudent&&result.studentId!==expectedStudent)throw Error('I dati ricevuti non corrispondono allo studente scelto. Riprova.');
   acceptedRead.current={studentId:result.studentId,ticket:request};
   purchaseTarget.current={studentId:result.studentId,resume};setStudentId(result.studentId);
   setPurchases({status:'success',data:result});
   if(bookingSelection.current&&!result.packages.some(p=>p.id===bookingSelection.current&&p.status==='active'&&p.remaining>0&&(p.payment_method!=='online'||!!p.live_mode===result.live))){slotRead.current.cancel();bookingSelection.current='';setBooking('');setSelected('');setSlotState({status:'idle'});}
   if(resume&&!result.warning){
    const id=params.get('acquisto'),paid=result.packages.find(p=>p.id===id&&p.status==='active'&&p.remaining>0&&(p.payment_method!=='online'||!!p.live_mode===result.live));
    if(paid){setMessage('Pagamento confermato. Ora puoi scegliere gli appuntamenti, oppure prenotare più avanti.');void loadSlots(paid.id);}
   }
   return result;
  }catch(e){
   if(request.isCurrent())setPurchases(previous=>({status:'error',data:previous.data,message:e instanceof Error?e.message:purchasesError}));
   return null;
  }
 },[loadSlots]);
 useEffect(()=>{
  const purchaseRequests=purchaseRead.current,slotRequests=slotRead.current;
  let active=true;Promise.resolve().then(()=>{if(active)void refresh(undefined,true);});
  return()=>{active=false;purchaseRequests.cancel();slotRequests.cancel();};
 },[refresh]);
 async function buy(units:1|5){if(!data||!available||!data.ready||data.preview||!!data.warning||writing.current||acceptedRead.current?.studentId!==data.studentId||!acceptedRead.current.ticket.isCurrent())return;writing.current=true;setBusy(true);setError('');try{let a=purchaseAttempt.current;if(!a||a.units!==units||a.studentId!==data.studentId)a=purchaseAttempt.current={id:crypto.randomUUID(),studentId:data.studentId,units};const r=await fetch('/api/acquisti',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(a)}),d=await r.json();if(!r.ok)throw Error(d.error);if(!d.url?.startsWith('https://checkout.stripe.com/'))throw Error('Pagamento non disponibile.');window.location.assign(d.url);}catch(e){setError(safeFormMessage(e));writing.current=false;setBusy(false);}}
 async function reserve(){
  if(!data||!selected||!available||slotState.status!=='success'||writing.current||acceptedRead.current?.studentId!==data.studentId||!acceptedRead.current.ticket.isCurrent())return;
  writing.current=true;
  setBusy(true);setError('');setMessage('');setConfirmed(false);
  try{
   let attempt=bookingAttempt.current;
   if(!attempt||attempt.packageId!==booking||attempt.slotId!==selected||attempt.subject!==subject||attempt.mode!==mode)attempt=bookingAttempt.current={id:crypto.randomUUID(),packageId:booking,slotId:selected,subject,mode};
   const response=await fetch('/api/acquisti/prenota',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...attempt,studentId:data.studentId})});
   if(!response.ok){const result=await response.json();throw Error(result.error||'Prenotazione non confermata. Controlla Lezioni e saldi prima di riprovare.');}
  }catch(e){
   setError(e instanceof TypeError?'Non ho ricevuto la conferma della prenotazione. Controlla Lezioni e saldi prima di riprovare.':e instanceof Error?e.message:'Conferma non ricevuta. Controlla Lezioni e saldi.');writing.current=false;setBusy(false);return;
  }
  // The server has acknowledged the reservation: no subsequent read can undo it.
  const packageId=booking;
  bookingAttempt.current=null;slotRead.current.cancel();bookingSelection.current='';setBooking('');setSlotState({status:'idle'});setSelected('');setConfirmed(true);
  setMessage('Lezione prenotata. La trovi nell’area studente, in Lezioni e saldi.');
  try{
   const updated=await refresh(data.studentId);
   if(updated?.packages.some(p=>p.id===packageId&&p.status==='active'&&p.remaining>0))await loadSlots(packageId);
  }catch{
   setPurchases(previous=>({status:'error',data:previous.data,message:'Non riesco ad aggiornare l’elenco. Riprova.'}));
  }finally{writing.current=false;setBusy(false);}
 }

 return <section className="purchase-workspace public-spaced">
  {error&&<p className="error" role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
  {reading&&<p role="status">{studentName?`Aggiornamento degli acquisti di ${studentName}…`:'Caricamento dei tuoi acquisti…'}</p>}
  {purchases.status==='error'&&<LoadError message={confirmed?'Non riesco ad aggiornare l’elenco. Riprova.':purchases.message} label="Riprova a caricare gli acquisti" retry={()=>{const target=purchaseTarget.current;void refresh(target.studentId,target.resume);}}/>}
  {data&&<>
   {purchases.status==='error'&&sameStudent&&<p>Gli importi visualizzati sono quelli dell’ultimo caricamento riuscito. Aggiorna gli acquisti prima di continuare.</p>}
   {data.warning&&<p role="alert">{data.warning}</p>}
   <label>Studente<select value={currentStudentId} disabled={busy} onChange={e=>{if(writing.current)return;slotRead.current.cancel();bookingSelection.current='';purchaseAttempt.current=null;bookingAttempt.current=null;setBooking('');setSlotState({status:'idle'});setSelected('');setMessage('');setConfirmed(false);setError('');const params=new URLSearchParams(window.location.search);params.set('studente',e.target.value);params.delete('acquisto');window.history.replaceState(null,'',window.location.pathname+'?'+params);void refresh(e.target.value);}}>{data.students.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
   {data.preview?<p className="reading-callout">Stai consultando l’anteprima del tutor: qui non puoi effettuare acquisti.</p>:data.checkoutMode==='disabled'?<p className="reading-callout">Il pagamento online non è disponibile. Per acquistare puoi concordare contanti o POS con Francesco.</p>:data.checkoutMode==='test'?<p className="reading-callout">Modalità prova: non vengono addebitati soldi reali.</p>:<p className="reading-callout">Il pagamento online è attivo: confermando nel checkout viene effettuato un addebito reale.</p>}
   <p className="form-privacy">{paymentCopy.checkout} <a className="text-link" href="/privacy" target="_blank" rel="noopener noreferrer">Come vengono trattati i dati dell’acquisto (nuova scheda)</a>.</p>
   <div className="public-card-grid public-spaced">
    <article className="public-panel"><h2>Una lezione</h2><p className="catalog-price">20 € <small>55 minuti · individuale</small></p><p id="purchase-single-recipient">Stai acquistando per: <strong>{studentName}</strong></p><button className="button dark" aria-describedby="purchase-single-recipient" disabled={!available||!data.ready||!!data.warning} onClick={()=>buy(1)}>Acquista una lezione</button></article>
    <article className="public-panel"><h2>5 lezioni</h2><p className="catalog-price">95 € <small>55 minuti ciascuno</small></p><p id="purchase-package-recipient">Stai acquistando per: <strong>{studentName}</strong></p><button className="button dark" aria-describedby="purchase-package-recipient" disabled={!available||!data.ready||!!data.warning} onClick={()=>buy(5)}>Acquista 5 lezioni</button></article>
   </div>
   {sameStudent&&<section className="public-spaced"><h2>Le tue lezioni acquistate</h2><button className="button outline" disabled={busy||reading} onClick={()=>void refresh(data.studentId)}>{reading?'Verifica…':'Verifica pagamento'}</button>
    {data.packages.length===0&&<p>Non ci sono ancora lezioni acquistate per questo studente.</p>}
    {data.packages.map(p=><article key={p.id} className="registry-card"><h3>{p.units===1?'Lezione individuale':`${p.units} lezioni individuali`} · {(p.amount/100).toLocaleString('it-IT')} €</h3>{p.status==='active'&&(p.payment_method!=='online'||!!p.live_mode===data.live)?<><p>{p.remaining} lezioni ancora da prenotare.</p>{p.remaining>0&&<button className="button dark" disabled={!available||slotState.status==='loading'} onClick={()=>void loadSlots(p.id)}>Scegli gli orari · consigliato</button>}</>:<><p>{p.payment_method==='online'&&!!p.live_mode!==data.live?'Acquisto di un altro ambiente Stripe: contatta Francesco per la verifica.':p.status==='awaiting'?'Pagamento da completare o verificare.':'Acquisto chiuso: contatta Francesco per il saldo.'}</p>{p.status==='awaiting'&&p.payment_method==='online'&&!!p.live_mode===data.live&&data.ready&&<><p id={'purchase-resume-'+p.id}>Stai acquistando per: <strong>{studentName}</strong></p><button aria-describedby={'purchase-resume-'+p.id} className="button outline" disabled={!available||!!data.warning} onClick={()=>{purchaseAttempt.current={id:p.id,units:p.units===5?5:1,studentId:data.studentId};void buy(p.units===5?5:1);}}>Riprendi pagamento</button></>}</>}</article>)}
   </section>}
   {sameStudent&&booking&&<section className="public-panel public-spaced"><h2>Prenota dalle lezioni acquistate</h2><p>Scegli un giorno, l’orario e la materia. Puoi fissare gli altri incontri più avanti.</p>
    <label>Materia<select value={subject} disabled={!available} onChange={e=>setSubject(e.target.value)}>{['Matematica','Informatica','Sistemi e Reti'].map(s=><option key={s}>{s}</option>)}</select></label>
    {slotState.status==='loading'&&<p role="status">Caricamento orari…</p>}
    {slotState.status==='error'&&<LoadError message={slotState.message} label="Riprova a caricare gli orari" retry={()=>void loadSlots(booking)}/>}
    {slotState.status==='empty'&&<><p>Non ci sono orari aperti per le lezioni a pagamento. Le lezioni acquistate restano disponibili: possiamo concordare un appuntamento.</p><div className="actions"><button className="button outline" disabled={!available} onClick={()=>void loadSlots(booking)}>Aggiorna orari</button><ContactLink/></div></>}
    {slotState.status==='success'&&<>
     <div className="purchase-days" role="group" aria-label="Giorno della lezione">{[...new Set(slots.map(s=>date(s.starts_at)))].map(d=><button key={d} className="button outline" disabled={!available} aria-pressed={day===d} onClick={()=>{setDay(d);setSelected('');}}>{d}</button>)}</div>
     <fieldset><legend>Orari · {day}</legend><div className="purchase-slots">{slots.filter(s=>date(s.starts_at)===day).map(s=><label key={s.id}><input type="radio" name="paid-slot" checked={selected===s.id} disabled={!available} onChange={()=>setSelected(s.id)}/><span><strong>{time(s.starts_at)}–{time(s.ends_at)}</strong><small>{s.mode==='Entrambe'?'Online o a Lodi':s.mode==='Lodi'?'In presenza a Lodi':'Online'}</small></span></label>)}</div></fieldset>
     {slots.find(s=>s.id===selected)?.mode==='Entrambe'&&<label>Modalità<select value={mode} disabled={!available} onChange={e=>setMode(e.target.value as 'Online'|'Lodi')}><option>Online</option><option value="Lodi">In presenza a Lodi</option></select></label>}
     <p id="purchase-booking-recipient">Stai prenotando per: <strong>{studentName}</strong></p><div className="actions"><button className="button dark" aria-describedby="purchase-booking-recipient" disabled={!available||data.preview||!selected||!data.packages.some(p=>p.id===booking&&p.status==='active'&&p.remaining>0)} onClick={reserve}>{busy?'Attendi…':'Conferma la lezione'}</button><a className="button outline" href="/studente?vista=pacchetti">Prenoto più avanti</a></div>
    </>}
    {slotState.status!=='success'&&<p><a className="text-link" href="/studente?vista=pacchetti">Prenoto più avanti</a></p>}
   </section>}
  </>}
 </section>;
}
