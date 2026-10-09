'use client';
import {useState} from 'react';
import {meetUrl} from '@/lib/lesson-calendar-export';
import type {AgendaEvent} from './lesson-calendar';

export default function VideoLink({appointment,onSaved,onBusyChange}:{appointment:AgendaEvent;onSaved:()=>Promise<void>;onBusyChange:(value:boolean)=>void}){
 const [value,setValue]=useState(appointment.video_url||''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const current=meetUrl(appointment.video_url);
 async function save(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');onBusyChange(true);try{
  const r=await fetch('/api/gestione/video',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({entity:appointment.kind,id:appointment.id,version:appointment.version,url:value})});const d=await r.json() as {error?:string};if(!r.ok)throw Error(d.error||'Link non salvato.');await onSaved();
 }catch(e){setError(e instanceof Error?e.message:'Link non salvato. Riprova.');}finally{setBusy(false);onBusyChange(false);}}
 return <section className="appointment-video"><h4>Google Meet</h4><p>Crea l’incontro in Google Meet e incolla qui il link. Comparirà nell’area dei partecipanti assegnati alla lezione.</p><form onSubmit={e=>void save(e)}><fieldset disabled={busy}><label>Link Google Meet<input type="url" value={value} onChange={e=>setValue(e.target.value)} placeholder="https://meet.google.com/abc-defg-hij" maxLength={250}/></label><button className="button outline" type="submit">{busy?'Salvataggio…':!value.trim()&&current?'Rimuovi link':'Salva link'}</button></fieldset></form>{error&&<p className="error" role="alert">{error}</p>}{current&&<a className="text-link" href={current} target="_blank" rel="noreferrer">Apri Google Meet</a>}<p>Per rimuoverlo, svuota il campo e salva. Questo comando non invia email e non crea automaticamente una stanza.</p></section>;
}
