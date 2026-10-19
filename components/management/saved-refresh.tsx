'use client';
import {useCallback,useEffect,useRef,useState} from 'react';

// A confirmed write must not be repeated when its subsequent read fails.
export function useRefreshAfterSave(){
 const [state,setState]=useState<'idle'|'loading'|'error'>('idle');
 const read=useRef<(()=>Promise<unknown>)|null>(null),version=useRef(0),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 const refresh=useCallback(async(operation:()=>Promise<unknown>)=>{
  read.current=operation;const current=++version.current;
  if(mounted.current)setState('loading');
  try{await operation();if(mounted.current&&version.current===current)setState('idle');return true;}
  catch{if(mounted.current&&version.current===current)setState('error');return false;}
 },[]);
 const retry=useCallback(()=>read.current?refresh(read.current):Promise.resolve(false),[refresh]);
 return {state,refresh,retry,blocked:state!=='idle'};
}
export function SavedRefreshNotice({value}:{value:ReturnType<typeof useRefreshAfterSave>}){
 if(value.state==='idle')return null;
 if(value.state==='loading')return <p role="status">Aggiornamento dell’elenco…</p>;
 return <div className="reading-callout"><p role="alert">L’operazione è confermata. Non riesco ad aggiornare l’elenco.</p><button className="button outline" aria-label="Riprova ad aggiornare l’elenco" onClick={()=>void value.retry()}>Aggiorna elenco</button></div>;
}
