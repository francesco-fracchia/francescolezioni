'use client';
import {useEffect,useRef,useState,useSyncExternalStore,type ReactNode,type RefObject} from 'react';
import {createSafetyRegistry} from '@/lib/form-safety';

const registry=createSafetyRegistry<HTMLElement>();
const savingMessage='Attendi la fine dell’invio o del salvataggio prima di uscire dal modulo.';
let ask:((resolve:(leave:boolean)=>void)=>void)|null=null;
let showBlocked:(()=>void)|null=null;
let asking:Promise<boolean>|null=null;
export async function confirmLeave(scope?:HTMLElement|null){
 const state=registry.state(entry=>!scope||scope.contains(entry.scope));
 if(state.saving){showBlocked?.();return false;}
 if(!state.dirty)return true;
 if(!ask)return false;
 asking??=new Promise<boolean>(resolve=>ask?.(resolve)).finally(()=>{asking=null;});
 return asking;
}
export function needsLeaveConfirmation(){const state=registry.state();return state.dirty||state.saving;}
function formValue(form:HTMLFormElement){
 return JSON.stringify(Array.from(form.elements).flatMap((el,index)=>{
  if(!(el instanceof HTMLInputElement||el instanceof HTMLSelectElement||el instanceof HTMLTextAreaElement))return [];
  if(el.hasAttribute('data-safety-ignore')||el instanceof HTMLInputElement&&['hidden','password','submit','button'].includes(el.type)||el.name==='website')return [];
  const value=el instanceof HTMLInputElement&&el.type==='file'?Array.from(el.files||[]).map(f=>[f.name,f.size,f.lastModified]):el instanceof HTMLInputElement&&['checkbox','radio'].includes(el.type)?el.checked:el.value.trim()?el.value:'';
  return [[el.name||'@'+index,value]];
 }));
}
export function useFormSafety(formRef:RefObject<HTMLFormElement|null>,identity:string,enabled=true,trackChanges=true){
 const entry=useRef<{form:HTMLFormElement;baseline:string;saving:boolean}|null>(null);
 const baseline=useRef<{form:HTMLFormElement;identity:string;value:string}|null>(null);
 useEffect(()=>{
  if(!enabled||!formRef.current)return;
  const form=formRef.current;
  if(baseline.current?.form!==form||baseline.current.identity!==identity)baseline.current={form,identity,value:formValue(form)};
  const current={form,baseline:baseline.current.value,saving:false};entry.current=current;
  const remove=registry.register({scope:current.form,dirty:()=>trackChanges&&formValue(current.form)!==current.baseline,saving:()=>current.saving});
  return()=>{remove();if(entry.current===current)entry.current=null;};
 },[formRef,identity,enabled,trackChanges]);
 return {
  begin(){if(registry.state().saving){showBlocked?.();return false;}if(!entry.current)return false;entry.current.saving=true;registry.notify();return true;},
  end(){if(entry.current)entry.current.saving=false;registry.notify();},
  saved(){if(entry.current){entry.current.baseline=formValue(entry.current.form);if(baseline.current)baseline.current.value=entry.current.baseline;}registry.notify();},
 };
}
export function useSnapshotSafety(scope:RefObject<HTMLElement|null>,identity:string,snapshot:string){
 const current=useRef({value:snapshot,baseline:snapshot,saving:false});
 useEffect(()=>{current.current.value=snapshot;},[snapshot]);
 useEffect(()=>{if(!scope.current)return;const entry=current.current;entry.baseline=entry.value;return registry.register({scope:scope.current,dirty:()=>entry.value!==entry.baseline,saving:()=>entry.saving});},[scope,identity]);
 return {begin(){if(registry.state().saving){showBlocked?.();return false;}current.current.saving=true;registry.notify();return true;},end(){current.current.saving=false;registry.notify();},saved(){current.current.baseline=current.current.value;registry.notify();}};
}
export function useIsSaving(){return useSyncExternalStore(registry.subscribe,()=>registry.state().saving,()=>false);}
export function FormSafetyProvider({children}:{children:ReactNode}){
 const [pending,setPending]=useState<{resolve:(leave:boolean)=>void}|null>(null),[blocked,setBlocked]=useState(false);
 const panel=useRef<HTMLDialogElement>(null),stay=useRef<HTMLButtonElement>(null);
 useEffect(()=>{
  const request=(resolve:(leave:boolean)=>void)=>setPending({resolve});
  const notify=()=>setBlocked(true);
  ask=request;showBlocked=notify;
  return()=>{if(ask===request)ask=null;if(showBlocked===notify)showBlocked=null;};
 },[]);
 useEffect(()=>{if(!blocked)return;const timer=setTimeout(()=>setBlocked(false),4000);return()=>clearTimeout(timer);},[blocked]);
 useEffect(()=>{if(!pending)return;const dialog=panel.current,previous=document.activeElement;if(!dialog)return;dialog.showModal();stay.current?.focus();return()=>{if(dialog.open)dialog.close();if(previous instanceof HTMLElement&&previous.isConnected)previous.focus({preventScroll:true});};},[pending]);
 function finish(leave:boolean){if(!pending)return;setPending(null);pending.resolve(leave);}
 useEffect(()=>{
  let allowUnload=false;
  function beforeUnload(event:BeforeUnloadEvent){if(allowUnload){allowUnload=false;return;}const state=registry.state();if(state.saving||state.dirty){event.preventDefault();event.returnValue='';}}
  function follow(event:MouseEvent){
   if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
   const anchor=(event.target instanceof Element?event.target:null)?.closest<HTMLAnchorElement>('a[href]');
   if(!anchor||anchor.hasAttribute('download')||anchor.target&&anchor.target!=='_self')return;
   const url=new URL(anchor.href,window.location.href);
   if(!['http:','https:'].includes(url.protocol)||url.hash&&url.origin===location.origin&&url.pathname===location.pathname&&url.search===location.search)return;
   const state=registry.state();if(!state.dirty&&!state.saving)return;
   event.preventDefault();event.stopImmediatePropagation();
   void confirmLeave().then(leave=>{if(!leave)return;allowUnload=true;window.location.assign(url.href);setTimeout(()=>{allowUnload=false;},0);});
  }
  document.addEventListener('click',follow,true);window.addEventListener('beforeunload',beforeUnload);
  return()=>{document.removeEventListener('click',follow,true);window.removeEventListener('beforeunload',beforeUnload);};
 },[]);
 return <>{children}{blocked&&<p className="form-safety-notice" role="status">{savingMessage}</p>}{pending&&<dialog ref={panel} data-form-safety className="form-safety-dialog" aria-modal="true" aria-labelledby="form-safety-title" aria-describedby="form-safety-description" onCancel={event=>{event.preventDefault();finish(false);}} onKeyDown={event=>{if(event.key!=='Tab')return;const buttons=event.currentTarget.querySelectorAll<HTMLButtonElement>('button');const first=buttons[0],last=buttons[buttons.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}}>
  <h2 id="form-safety-title">Ci sono modifiche non salvate</h2><p id="form-safety-description">Le modifiche non sono state salvate o inviate. Se esci, potresti perderle.</p><div className="actions"><button ref={stay} type="button" className="button dark" onClick={()=>finish(false)}>Continua a scrivere</button><button type="button" className="button outline" onClick={()=>finish(true)}>Esci dal modulo</button></div>
 </dialog>}</>;
}
