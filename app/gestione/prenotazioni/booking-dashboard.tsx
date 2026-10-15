'use client';
import {startTransition,useCallback,useEffect,useRef,useState} from 'react';
import Calendar,{type AgendaEvent,type AgendaSlot} from './lesson-calendar';
import {agendaDay,weekDays,addDays} from '@/lib/agenda';
import type {Consultation} from '@/lib/consultations';
import type {Payment} from './lesson-saldos';
import CalendarConnections from './calendar-connections';
import AvailabilitySettings from './availability-settings';
type Booking=AgendaEvent&{email:string;created_at:string};
type Lesson=Booking&{series_id:string;notes:string;payment_method:string;payment_status:string;payments:Payment[]};
export default function Dashboard(){
 const [calendarRevision,setCalendarRevision]=useState(0),[range,setRange]=useState(()=>{const days=weekDays(agendaDay(new Date().toISOString()));return {from:days[0],to:addDays(days[6],1)};});
 const [events,setEvents]=useState<AgendaEvent[]>([]),[slots,setSlots]=useState<AgendaSlot[]>([]),[error,setError]=useState(''),[warning,setWarning]=useState(''),[loading,setLoading]=useState(true),[refreshing,setRefreshing]=useState(false),[truncated,setTruncated]=useState(false);
 const controller=useRef<AbortController|null>(null),fingerprint=useRef('');
 const load=useCallback(async()=>{
  controller.current?.abort();const request=new AbortController();controller.current=request;setRefreshing(true);
  try{
   const response=await fetch('/api/gestione/prenotazioni?'+new URLSearchParams(range),{cache:'no-store',signal:request.signal}),data=await response.json();
   if(!response.ok)throw Error(data.error||'Calendario non disponibile.');if(request.signal.aborted)return;
   const nextEvents=[...data.consultations.map((c:Consultation)=>({...c,kind:'consultation' as const})),...data.lessons.map((l:Lesson)=>({...l,kind:'lesson' as const})),...data.bookings.map((b:Booking)=>({...b,kind:'booking' as const}))];
   const nextSlots=[...data.slots.map((s:AgendaSlot)=>({...s,kind:'paid' as const})),...data.freeSlots.map((s:AgendaSlot)=>({...s,kind:'free' as const}))];
   const next=JSON.stringify([nextEvents,nextSlots]);startTransition(()=>{if(next!==fingerprint.current){fingerprint.current=next;setEvents(nextEvents);setSlots(nextSlots);}setWarning(data.warning||'');setTruncated(!!data.truncated);setError('');setLoading(false);});
  }catch(e){if(!request.signal.aborted){setError((e as Error).message);setLoading(false);throw e;}}finally{if(!request.signal.aborted)setRefreshing(false);}
 },[range]);
 useEffect(()=>{let active=true;void Promise.resolve().then(()=>{if(active)return load();}).catch(()=>{});const timer=setInterval(()=>{if(document.visibilityState==='visible')void load().catch(()=>{});},180000);return()=>{active=false;controller.current?.abort();clearInterval(timer);};},[load,calendarRevision]);
 const calendarChanged=useCallback(()=>setCalendarRevision(value=>value+1),[]);
 const rangeChanged=useCallback((from:string,to:string)=>setRange(current=>current.from===from&&current.to===to?current:{from,to}),[]);
 return <><div className="calendar-settings-row"><AvailabilitySettings onChanged={calendarChanged}/><CalendarConnections onChanged={calendarChanged}/></div>{error&&<p role="alert" className="error">{error} <button className="text-link" onClick={()=>void load().catch(()=>{})}>Riprova</button></p>}{warning&&<p role="alert" className="calendar-warning">{warning}</p>}{loading?<p role="status">Caricamento calendario…</p>:<Calendar events={events} slots={slots} onSaved={load} calendarRevision={calendarRevision} onRangeChange={rangeChanged} refreshing={refreshing}/>}<p className="agenda-footnote">Orari di Roma · Email in anteprima · Pagamenti di prova{truncated?' · Raggiunto il limite di risultati: restringi il periodo.':''}</p></>;
}
