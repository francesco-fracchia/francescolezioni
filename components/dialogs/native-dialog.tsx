'use client';
import {useEffect,useId,useRef,type ReactNode,type RefObject} from 'react';
import {X} from 'lucide-react';
import {confirmLeave,useIsSaving} from '@/components/forms/form-safety';
let openDialogs=0,previousOverflow='';
export default function NativeDialog({title,children,onClose,busy=false,className='',headerClassName='',closeClassName='',closeLabel='Chiudi',labelledBy,returnFocus}:{title:ReactNode;children:ReactNode;onClose:()=>void;busy?:boolean;className?:string;headerClassName?:string;closeClassName?:string;closeLabel?:string;labelledBy?:string;returnFocus?:RefObject<HTMLElement|null>}){
 const dialog=useRef<HTMLDialogElement>(null),closeButton=useRef<HTMLButtonElement>(null),outside=useRef(false),closing=useRef(false);
 const titleId=useId(),saving=useIsSaving();
 useEffect(()=>{
  const el=dialog.current;if(!el)return;
  const opener=returnFocus?.current||document.activeElement;
  if(openDialogs++===0){previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';}
  el.showModal();closeButton.current?.focus();
  const observer=new MutationObserver(()=>{
   const active=document.activeElement;
   if(active!==document.body&&active!==el)return;
   const outcome=el.querySelector<HTMLElement>('.success h1,.success h2');
   if(!outcome)return;outcome.tabIndex=-1;outcome.focus({preventScroll:true});outcome.scrollIntoView({block:'start'});
  });
  observer.observe(el,{childList:true,subtree:true});
  return()=>{observer.disconnect();if(el.open)el.close();if(--openDialogs===0)document.body.style.overflow=previousOverflow;
   const target=opener instanceof HTMLElement&&opener!==document.body&&opener.isConnected?opener:document.querySelector<HTMLElement>('main h1')||document.querySelector<HTMLElement>('main');
   if(target){const temporaryIndex=!target.hasAttribute('tabindex')&&target.tabIndex<0;if(temporaryIndex)target.setAttribute('tabindex','-1');target.focus({preventScroll:true});if(temporaryIndex)target.addEventListener('blur',()=>{if(target.getAttribute('tabindex')==='-1')target.removeAttribute('tabindex');},{once:true});}
  };
 },[returnFocus]);
 async function close(){if(busy||saving||closing.current)return;closing.current=true;try{if(await confirmLeave(dialog.current))onClose();}finally{closing.current=false;}}
 function isOutside(event:React.PointerEvent<HTMLDialogElement>){const r=event.currentTarget.getBoundingClientRect();return event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom;}
 return <dialog ref={dialog} className={'native-dialog '+className} aria-modal="true" aria-labelledby={labelledBy||titleId} onCancel={event=>{event.preventDefault();void close();}} onPointerDown={event=>{outside.current=event.target===event.currentTarget&&isOutside(event);}} onPointerUp={event=>{const dismiss=outside.current&&event.target===event.currentTarget&&isOutside(event);outside.current=false;if(dismiss)void close();}} onKeyDown={event=>{
  if(event.key!=='Tab')return;
  const items=Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button,input,select,textarea,a[href],[tabindex="0"]')).filter(el=>el.tabIndex>=0&&!el.matches(':disabled')&&el.getClientRects().length>0),first=items[0],last=items[items.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
 }}>
  <div className={'native-dialog-header '+headerClassName}>{labelledBy?<span>{title}</span>:<h2 id={titleId}>{title}</h2>}<button ref={closeButton} type="button" className={closeClassName} aria-label={closeLabel} disabled={busy||saving} onClick={()=>void close()}><X size={20} aria-hidden="true"/></button></div>{children}
 </dialog>;
}
