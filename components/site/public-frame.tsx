"use client";
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import {Menu,X,CalendarDays} from 'lucide-react';
import {publicNavigation,isPublicPage,activePublicNavigation} from '@/lib/public-navigation';
import WhatsAppIcon from './whatsapp-icon';
import PublicFooter from './public-footer';
import {publicBreadcrumbs} from '@/lib/public-pages';
import {publicGraph,serializeJsonLd} from '@/lib/public-schema';
export default function PublicFrame({children,origin}:{children:ReactNode;origin:string}){
 const path=usePathname()||'/',[menu,setMenu]=useState(false),toggle=useRef<HTMLButtonElement>(null),nav=useRef<HTMLElement>(null);
 useEffect(()=>{setMenu(false);},[path]);
 useEffect(()=>{if(!menu)return;function escape(e:KeyboardEvent){if(e.key==='Escape'){setMenu(false);toggle.current?.focus();}}document.addEventListener('keydown',escape);function outside(e:PointerEvent){if(!nav.current?.contains(e.target as Node)&&!toggle.current?.contains(e.target as Node))setMenu(false);}document.addEventListener('pointerdown',outside);return()=>{document.removeEventListener('keydown',escape);document.removeEventListener('pointerdown',outside);};},[menu]);
 if(!isPublicPage(path))return <>{children}</>;
 return <div className="public-shell"><a className="skip" href="#public-content">Vai al contenuto</a>
 <div className="public-announcement">Pre-iscrizioni per novembre 2026 · <a href="/contatti">Chiedi informazioni</a></div>
 <header className="public-header"><div className="public-header-inner"><a className="brand" href="/" aria-label="Francesco Fracchia, pagina iniziale"><img className="brand-logo" src="/francesco-fracchia-logo.png" alt="Francesco Fracchia — Lezioni private" width={2172} height={724}/></a>
 <nav ref={nav} id="public-navigation" className={'public-navigation'+(menu?' is-open':'')} aria-label="Menu principale">{publicNavigation.map(item=><a key={item.href} href={item.href} aria-current={activePublicNavigation(path)===item.href?'page':undefined} onClick={()=>setMenu(false)}>{item.label}</a>)}<a className="public-mobile-book button dark" href="/incontro" onClick={()=>setMenu(false)}>Incontro gratuito · 15 minuti</a><a className="public-student" href="/studente">Area studente</a></nav>
 <a className="button dark public-book" href="/incontro"><CalendarDays size={18} aria-hidden="true"/>Incontro gratuito</a><button ref={toggle} className="public-menu" aria-label={menu?'Chiudi menu':'Apri menu'} aria-expanded={menu} aria-controls="public-navigation" onClick={()=>setMenu(v=>!v)}>{menu?<X/>:<Menu/>}</button></div></header>
 <script type="application/ld+json" dangerouslySetInnerHTML={{__html:serializeJsonLd(publicGraph(path,origin))}}/>
 {publicBreadcrumbs(path).length>0&&<nav className="wrap public-breadcrumbs" aria-label="Percorso di navigazione">{publicBreadcrumbs(path).map((item,i,items)=><span key={item.href}>{i>0&&<span aria-hidden="true"> / </span>}{i===items.length-1?<span aria-current="page">{item.label}</span>:<a href={item.href}>{item.label}</a>}</span>)}</nav>}
 <div id="public-content" tabIndex={-1}>{children}</div>
 <PublicFooter/>
 <a className="whatsapp-floating" href="https://wa.me/393500316324" target="_blank" rel="noopener noreferrer" aria-label="Scrivimi su WhatsApp, si apre in una nuova scheda"><WhatsAppIcon/><span>Scrivimi</span></a></div>;
}
