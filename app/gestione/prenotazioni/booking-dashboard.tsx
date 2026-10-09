'use client';
import {useCallback,useEffect,useState} from 'react';
import Calendar,{type AgendaEvent,type AgendaSlot} from './lesson-calendar';
import type {Consultation,ConsultationSlot} from '@/lib/consultations';
import type {Payment} from './lesson-saldos';
type Booking=AgendaEvent & {email:string;created_at:string};
type Lesson=Booking & {series_id:string;notes:string;payment_method:string;payment_status:string;payments:Payment[]};
export default function Dashboard(){
 const [events,setEvents]=useState<AgendaEvent[]>([]),[slots,setSlots]=useState<AgendaSlot[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[truncated,setTruncated]=useState(false);
 const load=useCallback(async()=>{
  try{
   const responses=await Promise.all([fetch('/api/gestione/prenotazioni'),fetch('/api/gestione/incontri')]);
   const data=await Promise.all(responses.map(r=>r.json()));
   for(let i=0;i<responses.length;i++)if(!responses[i].ok)throw Error((data[i] as {error?:string}).error||'Calendario non disponibile.');
   const paid=data[0] as {bookings:Booking[];slots:AgendaSlot[];lessons:Lesson[];consultations:Consultation[]};
   const free=data[1] as {slots:ConsultationSlot[];appointments:Consultation[];truncated?:boolean};
   setEvents([...free.appointments.map(c=>({...c,kind:'consultation' as const})),...paid.lessons.map(l=>({...l,kind:'lesson' as const})),...paid.bookings.map(b=>({...b,kind:'booking' as const}))]);
   setSlots([...paid.slots.map(s=>({...s,kind:'paid' as const})),...free.slots.map(s=>({...s,status:s.status||'available',kind:'free' as const}))]);
   setTruncated(!!free.truncated);setError('');
  }catch(e){setError((e as Error).message);throw e;}finally{setLoading(false);}
 },[]);
 useEffect(()=>{void Promise.resolve().then(load).catch(()=>{});},[load]);
 return <>{error&&<p role="alert" className="error">{error} <button className="text-link" onClick={()=>void load().catch(()=>{})}>Riprova</button></p>}{loading?<p role="status">Caricamento calendario…</p>:<Calendar events={events} slots={slots} onSaved={load}/>}<p className="agenda-footnote">Orari di Roma · Email in anteprima · Pagamenti di prova{truncated?' · Sono mostrati i primi 1500 orari e gli ultimi 200 incontri gratuiti.':''}</p></>;
}
