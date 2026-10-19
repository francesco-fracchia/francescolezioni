'use client';
import {useEffect,type ReactNode} from 'react';
import {safeFormMessage} from '@/lib/form-errors.mjs';
export {safeFormMessage};
type Control=HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement;
let sequence=0;
function controls(scope:ParentNode){return Array.from(scope.querySelectorAll<Control>('input,select,textarea')).filter(el=>el.type!=='hidden');}
function clearField(el:Control){
 const id=el.dataset.fieldError;
 if(!id)return;
 document.getElementById(id)?.remove();
 const descriptions=(el.getAttribute('aria-describedby')||'').split(/\s+/).filter(value=>value&&value!==id);
 if(descriptions.length)el.setAttribute('aria-describedby',descriptions.join(' '));else el.removeAttribute('aria-describedby');
 el.removeAttribute('aria-invalid');delete el.dataset.fieldError;
}
function fieldError(el:Control,message:string){
 clearField(el);const id='field-error-'+(++sequence),text=document.createElement('span');
 text.id=id;text.className='field-error';text.textContent=message;
 // The referenced description is announced, but does not become part of a wrapping label's name.
 text.setAttribute('aria-hidden','true');el.insertAdjacentElement('afterend',text);
 el.dataset.fieldError=id;el.setAttribute('aria-invalid','true');
 el.setAttribute('aria-describedby',[(el.getAttribute('aria-describedby')||''),id].filter(Boolean).join(' '));
}
function focusField(el:Control){
 for(let parent=el.parentElement;parent;parent=parent.parentElement)if(parent instanceof HTMLDetailsElement)parent.open=true;
 requestAnimationFrame(()=>{if(!el.isConnected||el.closest('[hidden]'))return;el.focus({preventScroll:true});el.scrollIntoView({block:'center'});});
}
function invalidMessage(el:Control){
 const v=el.validity,min='minLength' in el?el.minLength:0;
 if(v.valueMissing)return el.type==='checkbox'?'Seleziona questa casella per proseguire.':'Completa questo campo.';
 if(v.typeMismatch)return el.type==='email'?'Inserisci un indirizzo email valido.':'Controlla questo valore.';
 if(v.tooShort||min>0&&el.value.length<min)return `Scrivi almeno ${min} caratteri.`;
 if(v.tooLong)return `Usa al massimo ${'maxLength' in el?el.maxLength:0} caratteri.`;
 if(v.rangeUnderflow||v.rangeOverflow)return 'Inserisci un valore nell’intervallo consentito.';
 return 'Controlla questo valore.';
}
export function validateFields(scope:ParentNode){
 const all=controls(scope).filter(el=>!el.matches(':disabled')),invalid=all.filter(el=>!el.validity.valid||el.required&&el.type!=='checkbox'&&!el.value.trim()||el.value&&'minLength' in el&&el.minLength>0&&el.value.length<el.minLength);
 all.forEach(clearField);invalid.forEach(el=>fieldError(el,invalidMessage(el)));
 if(invalid[0])focusField(invalid[0]);return !invalid.length;
}
export class FormResponseError extends Error{
 constructor(message:string,public fieldErrors:Record<string,string>={},public status=400){super(message);}
}
export function showFormError(error:unknown,form?:HTMLFormElement|null){
 if(form&&error instanceof FormResponseError){
  const all=controls(form);let first:Control|undefined;
  for(const [name,message] of Object.entries(error.fieldErrors)){const el=all.find(el=>el.name===name||el.dataset.errorField===name);if(!el)continue;fieldError(el,message);first??=el;}
  if(first)focusField(first);
 }
 return safeFormMessage(error);
}
export async function readFormResponse(response:Response,form?:HTMLFormElement|null){
 let data;try{data=await response.json();}catch{throw new FormResponseError('Risposta non ricevuta correttamente. Riprova con gli stessi dati; non ripetere l’operazione con dati diversi.',{},response.status);}
 if(!response.ok){const fields:Record<string,string>={};if(data?.fieldErrors&&typeof data.fieldErrors==='object')for(const [key,value] of Object.entries(data.fieldErrors))if(typeof value==='string')fields[key]=safeFormMessage(value,'Controlla questo valore.');
  const error=new FormResponseError(safeFormMessage(data?.error),fields,response.status);showFormError(error,form);throw error;
 }
 return data;
}
export function FormFeedbackProvider({children}:{children:ReactNode}){
 useEffect(()=>{
  let first:Control|null=null;
  function invalid(event:Event){const el=event.target;if(!(el instanceof HTMLInputElement||el instanceof HTMLSelectElement||el instanceof HTMLTextAreaElement))return;
   event.preventDefault();fieldError(el,invalidMessage(el));if(first)return;first=el;queueMicrotask(()=>{if(first)focusField(first);first=null;});
  }
  function input(event:Event){const el=event.target;if(el instanceof HTMLInputElement||el instanceof HTMLSelectElement||el instanceof HTMLTextAreaElement){if(el.dataset.fieldError)clearField(el);}}
  document.addEventListener('invalid',invalid,true);document.addEventListener('input',input,true);document.addEventListener('change',input,true);
  return()=>{document.removeEventListener('invalid',invalid,true);document.removeEventListener('input',input,true);document.removeEventListener('change',input,true);};
 },[]);
 return children;
}
