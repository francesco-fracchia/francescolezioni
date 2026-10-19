'use client';
export type UploadPhase='preparing'|'uploading'|'finalizing';
export type UploadProgress={phase:UploadPhase;loaded?:number;total?:number};
export class UploadFailure extends Error{
 constructor(message:string,public uncertain=false,public interrupted=false){super(message);this.name='UploadFailure';}
}
type Options={signal?:AbortSignal;onProgress?:(progress:UploadProgress)=>void};
// Only transfer bytes use XHR: it exposes genuine upload progress. Finalizing
// is a separate state, never reported as completed until the API acknowledges it.
function transfer(url:string,method:string,body:FormData|File,options:Options,direct=false){
 return new Promise<Response>((resolve,reject)=>{
  const xhr=new XMLHttpRequest();let delivered=false,settled=false;
  function cleanup(){options.signal?.removeEventListener('abort',abort);}
  function fail(error:UploadFailure){if(settled)return;settled=true;cleanup();reject(error);}
  function abort(){xhr.abort();fail(new UploadFailure(delivered&&!direct?'Invio interrotto: controlla l’elenco per verificare se il file è stato salvato.':'Caricamento interrotto. Il file resta selezionato per riprovare.',delivered&&!direct,true));}
  if(options.signal?.aborted){abort();return;}
  xhr.open(method,url);xhr.timeout=240000;
  if(direct&&body instanceof File)xhr.setRequestHeader('Content-Type',body.type);
  xhr.upload.onprogress=event=>{if(event.lengthComputable&&event.loaded>=event.total)delivered=true;options.onProgress?.({phase:'uploading',loaded:event.loaded,total:event.lengthComputable?event.total:undefined});};
  xhr.upload.onload=()=>{delivered=true;options.onProgress?.({phase:direct?'uploading':'finalizing'});};
  xhr.onload=()=>{
   if(settled)return;settled=true;cleanup();
   const headers=new Headers();for(const line of xhr.getAllResponseHeaders().trim().split(/[\r\n]+/)){const colon=line.indexOf(':');if(colon>0)headers.append(line.slice(0,colon),line.slice(colon+1).trim());}
   resolve(new Response([204,205,304].includes(xhr.status)?null:xhr.responseText,{status:xhr.status,headers}));
  };
  xhr.onerror=xhr.ontimeout=()=>fail(new UploadFailure(!direct&&delivered?'La risposta non è arrivata: il salvataggio potrebbe essere riuscito. Controlla l’elenco prima di riprovare.':'Trasferimento non completato. Controlla la connessione e riprova.',!direct&&delivered));
  xhr.onabort=()=>fail(new UploadFailure(delivered&&!direct?'Invio interrotto: controlla l’elenco prima di riprovare.':'Caricamento interrotto. Il file resta selezionato per riprovare.',delivered&&!direct,true));
  options.signal?.addEventListener('abort',abort,{once:true});
  options.onProgress?.({phase:'uploading',loaded:0});xhr.send(body);
 });
}
export async function uploadForm(url:string,method:'PUT'|'POST',form:FormData,kind:'material'|'task'|'submission',target:string,options:Options={}){
 if(kind==='material'&&!form.has('uploadId'))form.set('uploadId',crypto.randomUUID());
 const file=form.get('file');let finalizing=false;
 options.onProgress?.({phase:'preparing'});
 async function finalize(body:BodyInit,headers?:HeadersInit){
  finalizing=true;options.onProgress?.({phase:'finalizing'});
  return fetch(url,{method,body,headers,signal:AbortSignal.timeout(45000)});
 }
 try{
  options.signal?.throwIfAborted();
  if(!(file instanceof File)||!file.size)return await finalize(form);
  const info=await fetch('/api/uploads',{cache:'no-store',signal:options.signal});
  if(!info.ok)throw new UploadFailure('Archivio temporaneamente non disponibile. Riprova.');
  if(!(await info.json() as {direct:boolean}).direct)return await transfer(url,method,form,options);
  const issued=await fetch('/api/uploads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind,target,filename:file.name,mime:file.type,size:file.size}),signal:options.signal});
  const result=await issued.json() as {error?:string;uploadUrl:string;uploadProof:string};
  if(!issued.ok)throw new UploadFailure(result.error||'Caricamento non disponibile.');
  const sent=await transfer(result.uploadUrl,'PUT',file,options,true);
  if(!sent.ok)throw new UploadFailure('File non trasferito nell’archivio. Riprova il caricamento.');
  options.signal?.throwIfAborted();
  const body:Record<string,string>={uploadProof:result.uploadProof};for(const [key,value] of form)if(typeof value==='string')body[key]=value;
  return await finalize(JSON.stringify(body),{'Content-Type':'application/json'});
 }catch(e){
  if(e instanceof UploadFailure)throw e;
  if(finalizing)throw new UploadFailure('Non è arrivata la conferma del salvataggio. Controlla l’elenco prima di riprovare.',true);
  if(options.signal?.aborted)throw new UploadFailure('Caricamento interrotto. Il file resta selezionato per riprovare.',false,true);
  throw new UploadFailure('Caricamento non completato. Controlla la connessione e riprova.');
 }
}
