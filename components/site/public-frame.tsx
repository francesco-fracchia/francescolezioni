"use client";
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import {Menu,X,CalendarDays,ChevronDown} from 'lucide-react';
import {publicNavigation,publicLessonNavigation,isPublicPage,activePublicNavigation} from '@/lib/public-navigation';
import WhatsAppIcon from './whatsapp-icon';
import PublicFooter from './public-footer';
import ReferralBanner from './referral-banner';
import {publicBreadcrumbs} from '@/lib/public-pages';
import {publicGraph,serializeJsonLd} from '@/lib/public-schema';
import SitePreviewBar from './site-preview-bar';
import {SitePreviewContext} from './site-preview-context';
export default function PublicFrame({children,origin,preview=false}:{children:ReactNode;origin:string;preview?:boolean}){
 const path=usePathname()||'/',[menu,setMenu]=useState(false),toggle=useRef<HTMLButtonElement>(null),nav=useRef<HTMLElement>(null);
 const [lessonsOpen,setLessonsOpen]=useState(false),lessonsRef=useRef<HTMLDivElement>(null),lessonsToggle=useRef<HTMLButtonElement>(null);
 useEffect(()=>{setMenu(false);setLessonsOpen(false);},[path]);
 useEffect(()=>{if(!lessonsOpen)return;function escape(e:KeyboardEvent){if(e.key==='Escape'){setLessonsOpen(false);lessonsToggle.current?.focus();}}function outside(e:PointerEvent){if(!lessonsRef.current?.contains(e.target as Node))setLessonsOpen(false);}document.addEventListener('keydown',escape);document.addEventListener('pointerdown',outside);return()=>{document.removeEventListener('keydown',escape);document.removeEventListener('pointerdown',outside);};},[lessonsOpen]);
 useEffect(()=>{if(!menu)return;function escape(e:KeyboardEvent){if(e.key==='Escape'){setMenu(false);toggle.current?.focus();}}document.addEventListener('keydown',escape);function outside(e:PointerEvent){if(!nav.current?.contains(e.target as Node)&&!toggle.current?.contains(e.target as Node))setMenu(false);}document.addEventListener('pointerdown',outside);return()=>{document.removeEventListener('keydown',escape);document.removeEventListener('pointerdown',outside);};},[menu]);
 if(!isPublicPage(path))return <>{children}</>;
 return <SitePreviewContext.Provider value={preview}><div className="public-shell"><a className="skip" href="#public-content">Vai al contenuto</a>{preview&&<SitePreviewBar/>}
 <div className="public-announcement">Pre-iscrizioni per novembre 2026 · <a href="/contatti">Chiedi informazioni</a></div>
 <header className="public-header"><div className="public-header-inner"><a className="brand" href="/" aria-label="Francesco Fracchia, pagina iniziale"><img className="brand-logo" src="/francesco-fracchia-logo.png" alt="Francesco Fracchia — Lezioni private" width={2172} height={724}/></a>
 <nav ref={nav} id="public-navigation" className={'public-navigation'+(menu?' is-open':'')} aria-label="Menu principale">{publicNavigation.map(item=>item.href==='/catalogo'?<div key={item.href} ref={lessonsRef} className="public-lessons-menu"><div className="public-lessons-trigger"><a href={item.href} aria-current={activePublicNavigation(path)===item.href?'page':undefined} onClick={()=>setMenu(false)}>{item.label}</a><button ref={lessonsToggle} type="button" aria-label="Mostra le categorie di lezioni" aria-expanded={lessonsOpen} aria-controls="public-lesson-links" onClick={()=>setLessonsOpen(v=>!v)}><ChevronDown size={16} aria-hidden="true"/></button></div><div id="public-lesson-links" className={'public-lesson-links'+(lessonsOpen?' is-open':'')}>{publicLessonNavigation.map(lesson=><a key={lesson.href} href={lesson.href} onClick={()=>{setMenu(false);setLessonsOpen(false);}}><strong>{lesson.label}</strong><small>{lesson.description}</small></a>)}</div></div>:<a key={item.href} href={item.href} aria-current={activePublicNavigation(path)===item.href?'page':undefined} onClick={()=>setMenu(false)}>{item.label}</a>)}<a className="public-mobile-book button dark" href="/incontro" onClick={()=>setMenu(false)}>Incontro gratuito · 15 minuti</a><a className="public-student" href="/studente">Area studente</a></nav>
 <a className="button dark public-book" href="/incontro"><CalendarDays size={18} aria-hidden="true"/>Incontro gratuito</a><button ref={toggle} className="public-menu" aria-label={menu?'Chiudi menu':'Apri menu'} aria-expanded={menu} aria-controls="public-navigation" onClick={()=>setMenu(v=>!v)}>{menu?<X/>:<Menu/>}</button></div></header>
 {!preview&&<script type="application/ld+json" dangerouslySetInnerHTML={{__html:serializeJsonLd(publicGraph(path,origin))}}/>}
 {publicBreadcrumbs(path).length>0&&<nav className="wrap public-breadcrumbs" aria-label="Percorso di navigazione">{publicBreadcrumbs(path).map((item,i,items)=><span key={item.href}>{i>0&&<span aria-hidden="true"> / </span>}{i===items.length-1?<span aria-current="page">{item.label}</span>:<a href={item.href}>{item.label}</a>}</span>)}</nav>}
 <div id="public-content" tabIndex={-1}>{children}</div>
 <PublicFooter/>
 {!menu&&!lessonsOpen&&!['/incontro','/contatti','/invita','/privacy','/prezzi'].includes(path)&&<ReferralBanner/>}
 <a className="whatsapp-floating" href="https://wa.me/393500316324" target="_blank" rel="noopener noreferrer" aria-label="Scrivimi su WhatsApp, si apre in una nuova scheda"><WhatsAppIcon/><span>Scrivimi</span></a></div></SitePreviewContext.Provider>;
}
