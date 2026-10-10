"use client";

import {useEffect,useRef,useState} from 'react';
import {ArrowRight,ChevronDown,ChevronUp,Gift} from 'lucide-react';
import {rewardAmount} from '@/lib/referrals/rules';

export default function ReferralBanner(){
 const [minimized,setMinimized]=useState(true);
 const toggle=useRef<HTMLButtonElement>(null),restoreFocus=useRef(false);

 useEffect(()=>{
  if(restoreFocus.current){toggle.current?.focus();restoreFocus.current=false;}
 },[minimized]);

 function change(next:boolean){
  restoreFocus.current=true;
  setMinimized(next);
 }

 return <aside className={'referral-banner'+(minimized?' is-minimized':'')} aria-label="Bonus Invita un amico" onKeyDown={event=>{
  if(event.key==='Escape'&&!minimized){event.preventDefault();change(true);}
 }}>
  {minimized?<button ref={toggle} className="referral-banner-toggle" type="button" aria-expanded={false} aria-label="Apri il banner Invita un amico" onClick={()=>change(false)}><Gift size={19} aria-hidden="true"/>Invita un amico<ChevronUp size={16} aria-hidden="true"/></button>:<>
   <div className="referral-banner-heading"><h2><Gift size={20} aria-hidden="true"/>Invita un amico</h2><button ref={toggle} type="button" className="referral-banner-minimize" aria-expanded={true} aria-label="Riduci il banner Invita un amico" title="Riduci" onClick={()=>change(true)}><ChevronDown size={20} aria-hidden="true"/></button></div>
   <p className="referral-banner-bonus"><span><strong>{rewardAmount('individual')/100} €</strong> a testa</span><span><strong>{rewardAmount('group')/100} €</strong> a testa in gruppo</span></p>
   <p className="referral-banner-note">Credito dopo 3 lezioni svolte e pagate. Solo per nuovi studenti invitati.</p>
   <a href="/invita" className="referral-banner-link">Come funziona e condizioni<ArrowRight size={16} aria-hidden="true"/></a>
  </>}
 </aside>;
}
