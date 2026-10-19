'use client';
import {useEffect,useRef,useState} from 'react';
import {readFormResponse} from './form-feedback';
import {uploadForm,UploadFailure,type UploadProgress} from '@/lib/uploads/client';
type State={phase:'idle'|'done'|'error'|'interrupted'|'uncertain'|UploadProgress['phase'];percent?:number};
export function fileSize(size:number){return size<1024?size+' B':new Intl.NumberFormat('it-IT',{maximumFractionDigits:1}).format(size/(size<1024*1024?1024:1024*1024))+(size<1024*1024?' KB':' MB');}
export function useFileUpload(){
 const [state,setState]=useState<State>({phase:'idle'}),[file,setFile]=useState<File|null>(null);
 const [operation,setOperation]=useState(0);
 const attempt=useRef<{signature:string;id:string}|null>(null);
 const request=useRef<AbortController|null>(null),phase=useRef<State['phase']>('idle');
 useEffect(()=>()=>{if(phase.current!=='finalizing')request.current?.abort();},[]);
 function update(value:State){phase.current=value.phase;setState(value);}
 return {state,file,operation,blocked:state.phase==='uncertain',
  select(value:File|null){if(request.current)return;attempt.current=null;setFile(value);update({phase:'idle'});},
  cancel(){if(['preparing','uploading'].includes(phase.current))request.current?.abort();},
  checked(){if(!request.current)update({phase:'error'});},
  confirmSaved(ids:string[]){if(phase.current!=='uncertain'||!attempt.current||!ids.includes(attempt.current.id))return false;attempt.current=null;update({phase:'done'});return true;},
  async send(url:string,method:'PUT'|'POST',form:FormData,kind:'material'|'task'|'submission',target:string,scope:HTMLFormElement|null){
   if(request.current)throw new Error('Attendi il caricamento in corso.');
   if(phase.current==='uncertain')throw new Error('Verifica l’elenco prima di un nuovo invio.');
   if(kind==='material'){const chosen=form.get('file'),signature=JSON.stringify([url,target,[...form].filter(([,value])=>typeof value==='string'),chosen instanceof File?[chosen.name,chosen.size,chosen.type,chosen.lastModified]:null]);if(attempt.current?.signature!==signature)attempt.current={signature,id:crypto.randomUUID()};form.set('uploadId',attempt.current.id);}
   const controller=new AbortController();setOperation(n=>n+1);request.current=controller;const chosen=form.get('file');setFile(chosen instanceof File&&chosen.size?chosen:null);update({phase:'preparing'});
   try{
    const response=await uploadForm(url,method,form,kind,target,{signal:controller.signal,onProgress:progress=>update({phase:progress.phase,percent:progress.total?Math.min(100,Math.floor((progress.loaded||0)/progress.total*100)):undefined})});
    if(!response.ok){await readFormResponse(response,scope);throw new UploadFailure('Invio non accettato. Controlla i dati e riprova.');}
    // HTTP acknowledgement is the write outcome; no second read can turn it into a failure.
    attempt.current=null;update({phase:'done'});
   }catch(e){update({phase:e instanceof UploadFailure&&e.uncertain?'uncertain':e instanceof UploadFailure&&e.interrupted?'interrupted':'error'});throw e;}
   finally{request.current=null;}
  },
 };
}
export default function FileUploadProgress({upload,onReview}:{upload:ReturnType<typeof useFileUpload>;onReview?:()=>Promise<void>}){
 const [reviewed,setReviewed]=useState<number|null>(null),[checking,setChecking]=useState(false),[error,setError]=useState('');
 const {file,state}=upload,active=['preparing','uploading','finalizing'].includes(state.phase);
 const messages:Record<State['phase'],string>={idle:'File selezionato',preparing:'Preparo il caricamento…',uploading:'Trasferimento del file…',finalizing:'Trasferimento terminato. Attendo la conferma del salvataggio…',done:'Salvataggio confermato',error:'Invio non completato',interrupted:'Caricamento interrotto',uncertain:'Salvataggio da verificare'};
 if(!file&&state.phase==='idle')return null;
 return <div className="file-upload-status" aria-busy={active}>
  {file&&<p className="file-upload-name"><strong>{file.name}</strong><span>{fileSize(file.size)}</span></p>}
  <p role="status">{!file&&state.phase==='finalizing'?'Attendo la conferma della consegna…':messages[state.phase]}</p>
  {state.phase==='uploading'&&<div className="file-upload-meter"><progress aria-label="Avanzamento del trasferimento" max={100} value={state.percent}/>{state.percent!==undefined&&<span aria-hidden="true">{state.percent}%</span>}</div>}
  {['preparing','uploading'].includes(state.phase)&&<button className="button outline" type="button" onClick={upload.cancel}>Interrompi caricamento</button>}
  {state.phase==='uncertain'&&<><p>Il file potrebbe essere già salvato. Verifica l’elenco prima di inviarlo di nuovo; testo e file restano nel modulo.</p>{onReview&&<button className="button outline" type="button" disabled={checking} onClick={async()=>{setChecking(true);setError('');try{await onReview();setReviewed(upload.operation);}catch{setError('Non riesco ad aggiornare l’elenco. Riprova prima di un nuovo invio.');}finally{setChecking(false);}}}>{checking?'Controllo…':'Aggiorna elenco per verificare'}</button>}{(!onReview||reviewed===upload.operation)&&<button className="text-link" type="button" onClick={()=>{upload.checked();setReviewed(null);}}>Il file non risulta salvato: abilita un nuovo tentativo</button>}</>}
  {error&&<p className="error" role="alert">{error}</p>}
 </div>;
}
