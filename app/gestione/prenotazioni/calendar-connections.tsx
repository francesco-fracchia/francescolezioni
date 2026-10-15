'use client';
import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import {CalendarDays,ChevronDown,Copy,RefreshCw} from 'lucide-react';
import type {ICloudCalendar} from '@/lib/calendar/types';
type Settings={ready:boolean;connected:boolean;selected:string[];version:number;subscriptionUrl:string|null;calendars?:ICloudCalendar[]};
export default function CalendarConnections({onChanged}:{onChanged:()=>void}){
 const [settings,setSettings]=useState<Settings|null>(null),[calendars,setCalendars]=useState<ICloudCalendar[]|null>(null),[chosen,setChosen]=useState<string[]>([]);
 const [appleId,setAppleId]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [confirm,setConfirm]=useState<'disconnect'|'rotate-feed'|'revoke-feed'|null>(null),[open,setOpen]=useState(false);
 const mounted=useRef(false),discoveryPending=useRef(false);
 const load=useCallback(async(discover=false)=>{
  if(discoveryPending.current)return;discoveryPending.current=true;
  try{
   const response=await fetch('/api/gestione/calendari'+(discover?'?discover=1':''),{cache:'no-store'}),data=await response.json();
   if(!response.ok)throw Error(data.error||'Impostazioni non disponibili.');
   if(mounted.current){setSettings(data);setChosen(data.selected);if(data.calendars)setCalendars(data.calendars);setError('');}
  }catch(error){if(mounted.current)setError(error instanceof Error?error.message:'Collegamento non disponibile.');}
  finally{discoveryPending.current=false;}
 },[]);
 useEffect(()=>{mounted.current=true;void Promise.resolve().then(()=>{if(mounted.current)return load();});return()=>{mounted.current=false;};},[load]);
 useEffect(()=>{if(open&&settings?.connected&&calendars===null)void Promise.resolve().then(()=>{if(mounted.current)return load(true);});},[open,settings?.connected,calendars,load]);
 async function change(kind:string,extra:Record<string,unknown>={}){
  if(!settings||busy)return;setBusy(true);setError('');setNotice('');
  try{
   const response=await fetch('/api/gestione/calendari',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind,version:settings.version,...extra})}),data=await response.json();
   if(!response.ok)throw Error(data.error||'Aggiornamento non riuscito. Ricarica le impostazioni prima di riprovare.');
   if(mounted.current){setSettings(data);setChosen(data.selected);setConfirm(null);if(kind==='connect'||kind==='disconnect')setCalendars(null);setNotice(kind==='connect'?'iCloud collegato. Scegli i calendari da vedere.':kind==='select'?'Calendari aggiornati.':kind==='disconnect'?'iCloud scollegato.':'Collegamento a Calendario Apple aggiornato.');onChanged();}
  }catch(error){if(mounted.current)setError(error instanceof Error?error.message:'Aggiornamento non riuscito.');}
  finally{if(mounted.current){setPassword('');setBusy(false);}}
 }
 function connect(event:FormEvent){event.preventDefault();void change('connect',{appleId,password});}
 async function copy(){try{await navigator.clipboard.writeText(settings?.subscriptionUrl||'');setNotice('Link copiato.');}catch{setNotice('Seleziona e copia il link dal campo.');}}
 return <details className="calendar-connections" onToggle={event=>setOpen(event.currentTarget.open)}><summary><CalendarDays size={19} aria-hidden="true"/><strong>Calendari collegati</strong><span>{settings?.connected?'iCloud collegato':'Apple e iCloud'}</span><ChevronDown size={18} aria-hidden="true"/></summary>
  <div className="calendar-connections-body">
   {error&&<p role="alert" className="error">{error} <button className="text-link" disabled={busy} onClick={()=>void load(!!settings?.connected)}>Ricarica impostazioni</button></p>}
   {notice&&<p role="status">{notice}</p>}
   {!settings&&!error&&<p role="status">Caricamento collegamenti…</p>}
   {settings&&!settings.ready&&<p>Il collegamento dei calendari deve ancora essere configurato sul server.</p>}
   {settings?.ready&&<div className="calendar-connection-grid"><section><h2>Lezioni in Calendario Apple</h2><p>Lezioni e incontri dell’app si aggiornano in un calendario separato. Gli appuntamenti si modificano qui nella piattaforma.</p>
    {settings.subscriptionUrl?<><label className="calendar-subscription-label">Link riservato<input aria-label="Link del calendario lezioni" readOnly value={settings.subscriptionUrl} autoComplete="off" spellCheck={false} onFocus={event=>event.currentTarget.select()}/></label><p className="calendar-connection-note">Chi possiede questo link può leggere orari e materie. Nomi, recapiti e pagamenti degli studenti sono esclusi.</p><div className="registry-actions"><button className="button outline" onClick={()=>void copy()}><Copy size={17} aria-hidden="true"/>Copia link</button><button className="text-link" disabled={busy} onClick={()=>setConfirm('rotate-feed')}>Rigenera link</button><button className="text-link" disabled={busy} onClick={()=>setConfirm('revoke-feed')}>Disattiva link</button></div><details className="calendar-instructions"><summary>Come aggiungerlo sul Mac e sull’iPhone</summary><p>Sul Mac apri Calendario → File → Nuova iscrizione calendario e incolla il link. Scegli iCloud come posizione per ritrovarlo sugli altri dispositivi. Puoi impostare la frequenza di aggiornamento nelle informazioni del calendario.</p><p>Su iPhone puoi anche aggiungere un calendario con iscrizione dalle impostazioni dell’app Calendario.</p></details></>:<button className="button outline" disabled={busy} onClick={()=>void change('create-feed')}>Crea collegamento a Calendario Apple</button>}
   </section><section><h2>Eventi iCloud nell’agenda</h2><p>Mostrali nella tua gestione, con il colore del calendario di origine. Si modificano da Apple. Gli impegni occupati escludono automaticamente gli orari di lezioni e incontri gratuiti.</p>
    {!settings.connected?<form onSubmit={connect}><fieldset disabled={busy}><label>Email dell’account Apple<input type="email" autoComplete="username" required maxLength={254} value={appleId} onChange={event=>setAppleId(event.target.value)}/></label><label>Password specifica per questa app<input type="password" autoComplete="new-password" required maxLength={64} value={password} onChange={event=>setPassword(event.target.value)} placeholder="xxxx-xxxx-xxxx-xxxx"/></label><p className="calendar-connection-note">Crea una password specifica su <a href="https://account.apple.com/" target="_blank" rel="noopener noreferrer">account.apple.com</a>, in Accesso e sicurezza. Il collegamento usa solo operazioni di lettura.</p><button className="button dark" type="submit">{busy?'Collegamento…':'Collega iCloud in sola lettura'}</button></fieldset></form>:<>
     {calendars===null?<p role="status">{error?'Elenco calendari non disponibile.':'Leggo i calendari iCloud…'}</p>:<fieldset disabled={busy} className="calendar-choice-list"><legend>Calendari da mostrare (massimo 10)</legend>{calendars.length?calendars.map(calendar=><label key={calendar.id}><input type="checkbox" checked={chosen.includes(calendar.id)} disabled={!chosen.includes(calendar.id)&&chosen.length>=10} onChange={event=>setChosen(values=>event.target.checked?[...values,calendar.id]:values.filter(id=>id!==calendar.id))}/><i style={{backgroundColor:calendar.color}} aria-hidden="true"/>{calendar.name}</label>):<p>Nessun calendario disponibile in questo account.</p>}<button className="button dark" disabled={busy} onClick={()=>void change('select',{calendars:chosen})}>Salva selezione</button></fieldset>}
     <div className="registry-actions"><button className="text-link" disabled={busy} onClick={()=>void load(true)}><RefreshCw size={16} aria-hidden="true"/>Aggiorna elenco</button><button className="text-link" disabled={busy} onClick={()=>setConfirm('disconnect')}>Scollega iCloud</button></div>
    </>}
   </section></div>}
   {confirm&&<div className="calendar-action-confirm"><p>{confirm==='disconnect'?'Rimuovere il collegamento iCloud? Gli eventi originali restano nei tuoi calendari Apple.':confirm==='rotate-feed'?'Il vecchio link smetterà di funzionare. Dovrai aggiornare l’iscrizione in Calendario Apple.':'Il link smetterà di aggiornare Calendario Apple. Le lezioni nell’app restano intatte.'}</p><div className="registry-actions"><button className="button outline" disabled={busy} onClick={()=>setConfirm(null)}>Annulla</button><button className="button dark" disabled={busy} onClick={()=>void change(confirm)}>{busy?'Aggiornamento…':'Conferma'}</button></div></div>}
  </div>
 </details>;
}
