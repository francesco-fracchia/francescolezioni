'use client';
import {startTransition,useCallback,useEffect,useState} from 'react';
import type {ICloudCalendar,ICloudEvent} from '@/lib/calendar/types';
type Snapshot={events:ICloudEvent[];calendars:ICloudCalendar[];connected:boolean;checkedAt:string|null};
export default function useICloudEvents(from:string,to:string,revision:number){
 const [snapshot,setSnapshot]=useState<Snapshot>({events:[],calendars:[],connected:false,checkedAt:null}),[error,setError]=useState(''),[loading,setLoading]=useState(false),[retry,setRetry]=useState(0);
 const refresh=useCallback(()=>setRetry(value=>value+1),[]);
 useEffect(()=>{
  let alive=true,controller:AbortController|null=null,pending=false;
  async function load(){
   if(pending||!alive)return;pending=true;controller=new AbortController();setLoading(true);
   try{
    const response=await fetch('/api/gestione/calendari/eventi?'+new URLSearchParams({from,to}),{cache:'no-store',signal:controller.signal});
    const data=await response.json();if(!response.ok)throw Error(data.error||'iCloud non disponibile.');
    if(alive)startTransition(()=>{setSnapshot(current=>({...data,events:JSON.stringify(current.events)===JSON.stringify(data.events)?current.events:data.events}));setError('');});
   }catch(error){if(alive&&!(error instanceof DOMException&&error.name==='AbortError'))setError(error instanceof Error?error.message:'iCloud non disponibile.');}
   finally{pending=false;if(alive)setLoading(false);}
  }
  void load();const timer=setInterval(()=>{if(document.visibilityState==='visible')void load();},180000);
  function visible(){if(document.visibilityState==='visible')void load();}
  document.addEventListener('visibilitychange',visible);
  return()=>{alive=false;controller?.abort();clearInterval(timer);document.removeEventListener('visibilitychange',visible);};
 },[from,to,revision,retry]);
 return {...snapshot,error,loading,refresh};
}
