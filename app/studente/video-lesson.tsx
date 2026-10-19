'use client';
import {useState} from 'react';
import {readVideoAccessibility} from '@/lib/learning/video-accessibility';
import type {Material} from '@/lib/learning/types';

export default function VideoLesson({material, source, onRefresh}: {material: Material; source: string; onRefresh: () => void}) {
 const [failed,setFailed] = useState(false), [buffering,setBuffering] = useState(false), [captionsFailed,setCaptionsFailed] = useState(false), [retry,setRetry] = useState(0);
 const access = readVideoAccessibility(material.body);
 return <div className="video-lesson">
  <video key={retry} controls playsInline preload="none" src={source} aria-label={material.title} onWaiting={()=>setBuffering(true)} onCanPlay={()=>setBuffering(false)} onPlaying={()=>setBuffering(false)} onError={()=>{setFailed(true);setBuffering(false);}}>
   {access?.captions&&<track kind="captions" src={source+'&formato=sottotitoli'} srcLang="it" label="Italiano" default onError={()=>setCaptionsFailed(true)}/>}
  </video>
  {buffering&&<p role="status">Il video sta caricando.{access?.transcript?' Puoi leggere la trascrizione qui sotto.':' Se la connessione è lenta, metti in pausa e riprova tra poco.'}</p>}
  {captionsFailed&&<p role="alert">Non riesco a caricare i sottotitoli. Puoi leggere la trascrizione oppure aggiornare il corso.</p>}
  {failed&&<div className="error" role="alert"><p>Il video non è disponibile o il browser non riesce a riprodurlo.</p><div className="registry-actions"><button className="text-link" onClick={()=>{setFailed(false);setCaptionsFailed(false);setRetry(value=>value+1);onRefresh();}}>Riprova video</button><a href={source} target="_blank" rel="noreferrer">Apri video</a></div></div>}
  {access?.transcript&&<details className="video-transcript"><summary>Leggi la trascrizione</summary><div className="learning-copy video-transcript-copy">{access.transcript}</div><a className="text-link" href={source+'&formato=trascrizione'}>Scarica trascrizione</a></details>}
 </div>;
}
