"use client";
import BrandLogo from '@/components/site/brand-logo';
import {useEffect,useRef,useState,type ReactNode,type KeyboardEvent as ReactKeyboardEvent} from 'react';
import {usePathname} from 'next/navigation';
import {Menu,X,CalendarDays} from 'lucide-react';
import {isPublicPage} from '@/lib/public-navigation';
import PublicNavigation from './public-navigation';
import WhatsAppIcon from './whatsapp-icon';
import PublicFooter from './public-footer';
import {publicBreadcrumbs} from '@/lib/public-pages';
import {publicGraph,serializeJsonLd} from '@/lib/public-schema';
import SitePreviewBar from './site-preview-bar';
import {SitePreviewContext} from './site-preview-context';
type Props={children:ReactNode;origin:string;preview?:boolean};
export default function PublicFrame(props:Props){
 const path=usePathname()||'/';
 return isPublicPage(path)?<PublicPageFrame key={path} {...props} path={path}/>:<>{props.children}</>;
}
function PublicPageFrame({children,origin,preview=false,path}:Props&{path:string}){
 const [menu,setMenu]=useState(false),toggle=useRef<HTMLButtonElement>(null),panel=useRef<HTMLDialogElement>(null);
 const [lessonsOpen,setLessonsOpen]=useState(false);
 useEffect(()=>{const size=window.matchMedia('(max-width:900px)');const close=()=>{setMenu(false);setLessonsOpen(false);};size.addEventListener('change',close);return()=>size.removeEventListener('change',close);},[]);
 useEffect(()=>{
  if(!menu)return;
  const dialog=panel.current,opener=toggle.current;
  if(!dialog)return;
  const overflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  dialog.showModal();
  dialog.querySelector<HTMLAnchorElement>('nav a')?.focus();
  return()=>{
   if(dialog.open)dialog.close();
   document.body.style.overflow=overflow;
   if(opener?.isConnected&&opener.getClientRects().length)opener.focus({preventScroll:true});
  };
 },[menu]);
 function containMenuFocus(event:ReactKeyboardEvent<HTMLDialogElement>){
  if(event.key!=='Tab')return;
  const controls=Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),[tabindex="0"]')).filter(el=>el.tabIndex>=0&&el.getClientRects().length>0);
  const first=controls[0],last=controls[controls.length-1];
  if(!first){event.preventDefault();return;}
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
 }
 return <SitePreviewContext.Provider value={preview}><div className="public-shell"><a className="skip" href="#public-content">Vai al contenuto</a>{preview&&<SitePreviewBar/>}
 <header className="public-header"><div className="public-header-inner"><a className="brand" href="/" aria-label="Francesco Fracchia, pagina iniziale"><BrandLogo sizes="(max-width: 480px) 170px, (max-width: 1120px) 180px, 205px" className="brand-logo"  alt="Francesco Fracchia — Lezioni private"/></a>
 <PublicNavigation path={path} lessonsOpen={lessonsOpen} onLessonsChange={setLessonsOpen}/>
 <a className="button dark public-book" href="/incontro"><CalendarDays size={18} aria-hidden="true"/>Incontro gratuito</a><button ref={toggle} type="button" className="public-menu" aria-label="Apri menu" aria-haspopup="dialog" aria-expanded={menu} aria-controls="public-mobile-menu" onClick={()=>setMenu(true)}><Menu aria-hidden="true"/></button></div></header>
 <dialog ref={panel} id="public-mobile-menu" className="public-mobile-dialog" aria-label="Menu principale" aria-modal={menu?true:undefined} onKeyDown={containMenuFocus} onCancel={event=>{event.preventDefault();setMenu(false);}} onClose={()=>{if(!panel.current?.open)setMenu(false);}} onClick={event=>{if(event.target===event.currentTarget){const bounds=event.currentTarget.getBoundingClientRect();if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)setMenu(false);}}}>
  <div className="public-mobile-heading"><strong>Menu</strong><button type="button" className="public-mobile-close" aria-label="Chiudi menu" onClick={()=>setMenu(false)}><X aria-hidden="true"/></button></div>
  <PublicNavigation path={path} mobile onNavigate={()=>setMenu(false)}/>
 </dialog>

 {!preview&&<script type="application/ld+json" dangerouslySetInnerHTML={{__html:serializeJsonLd(publicGraph(path,origin))}}/>}
 {publicBreadcrumbs(path).length>0&&<nav className="wrap public-breadcrumbs" aria-label="Percorso di navigazione">{publicBreadcrumbs(path).map((item,i,items)=><span key={item.href}>{i>0&&<span aria-hidden="true"> / </span>}{i===items.length-1?<span aria-current="page">{item.label}</span>:<a href={item.href}>{item.label}</a>}</span>)}</nav>}
 <div id="public-content" tabIndex={-1}>{children}</div>
 <PublicFooter/>
 <a className="whatsapp-floating" href="https://wa.me/393500316324" target="_blank" rel="noopener noreferrer" aria-label="Scrivimi su WhatsApp, si apre in una nuova scheda"><WhatsAppIcon/></a></div></SitePreviewContext.Provider>;
}
