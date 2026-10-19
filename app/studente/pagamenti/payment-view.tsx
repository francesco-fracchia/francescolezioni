'use client';
import {safeFormMessage} from '@/components/forms/form-feedback';
import {paymentCopy} from '@/lib/booking/payment-copy';
import CancellationSummary from '@/components/booking/cancellation-summary';
import type {CancellationFields} from '@/lib/booking/cancellation-outcome';
import { useCallback,useEffect,useState } from 'react';
type Payment = CancellationFields & {
  id:string;kind:'lesson'|'booking';studentId:string;subject:string;starts_at:string;ends_at:string;mode:string;
  amount:number;credit_amount?:number;package_status?:string|null;payment_status:string;lesson_status:string;payment_method:string;paid_at:string|null;
  payment_deadline:string;canPay:boolean;preview:boolean;testMode:boolean;checkoutMode:'disabled'|'test'|'live';warning?:string;requiresReview:boolean;
};
const format=(s:string)=>new Intl.DateTimeFormat('it-IT',{dateStyle:'full',timeStyle:'short',timeZone:'Europe/Rome'}).format(new Date(s));
const labels:Record<string,string>={paid:'Saldo ricevuto',manual_paid:'Saldo ricevuto',awaiting:'Da pagare',pending:'Pagamento aperto',payment_review:'Pagamento da verificare',expired:'Termine scaduto',unverified:'Saldo da verificare'};
  async function readPayment(){
    const p=new URLSearchParams(window.location.search);const r=await fetch('/api/studente/pagamenti?'+p,{cache:'no-store'});const d=await r.json() as Payment&{error?:string};
    if(!r.ok)throw Error(d.error||'Saldo non disponibile.');return d;
  }
export default function PaymentView(){
  const [payment,setPayment]=useState<Payment|null>(null);const [error,setError]=useState('');const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [now,setNow]=useState(()=>Date.now());
  function params(){const p=new URLSearchParams(window.location.search);return {studentId:p.get('studentId'),id:p.get('id'),kind:p.get('kind')};}
  const load=useCallback(()=>readPayment().then(d=>{setPayment(d);setError('');}).catch(e=>{setPayment(null);setError(safeFormMessage(e));}).finally(()=>setLoading(false)),[]);
  useEffect(()=>{void load();const timer=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(timer);},[load]);
  async function pay(){setBusy(true);setError('');try{
    const r=await fetch('/api/studente/pagamenti',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(params())});
    const d=await r.json() as {url?:string;error?:string};
    if(!r.ok){if(r.status===409)await load();throw Error(d.error||'Pagamento non disponibile.');}
    if(!d.url?.startsWith('https://checkout.stripe.com/'))throw Error('Pagamento non disponibile.');
    window.location.assign(d.url);
  }catch(e){setError(safeFormMessage(e));setBusy(false);}}
  const paid=payment&&['paid','manual_paid'].includes(payment.payment_status);
  const closed=payment&&(payment.kind==='lesson'?payment.lesson_status!=='planned':!['pending','awaiting_payment','confirmed','payment_review'].includes(payment.lesson_status));
  const deadline=payment&&new Date(payment.payment_deadline).getTime()<=now;
  const back=payment?'/studente?'+new URLSearchParams({studente:payment.studentId,vista:'lezioni',...(payment.preview?{anteprima:payment.studentId}:{})}):'/studente?vista=lezioni';
  return <>{payment?.checkoutMode==='test'&&<div className="learning-notice"><strong>Checkout attuale in prova · nessun nuovo addebito reale</strong></div>}{error&&<p className="error" role="alert">{error}</p>}{loading&&!payment&&<p role="status">Caricamento…</p>}{payment&&<section className="booking-status">
    {payment.preview&&<p className="booking-badge">Anteprima del tutor · sola lettura</p>}
    <span className="booking-badge">{payment.lesson_status==='cancelled'?'Appuntamento cancellato':labels[payment.payment_status]||'Saldo da verificare'}</span>
    <h2>{payment.subject}</h2><p>{format(payment.starts_at)} · {payment.mode} · 55 minuti</p><p className="lesson-payment-price">{payment.amount/100} €<small>Quota della lezione</small></p>
    {!!payment.credit_amount&&<p>Credito invito applicato: {payment.credit_amount/100} €. L’importo indicato include già il credito.</p>}{['cancelled','expired'].includes(payment.lesson_status)||payment.package_status==='returned'?<CancellationSummary record={{...payment,status:payment.lesson_status}}/>:payment.package_status==='applied'?<p>Questa lezione è coperta dal pacchetto: non devi pagare altro. La quota attribuita è di {payment.amount/100} €.</p>:paid?<><p>Il tuo saldo è registrato.{closed?' Contatta Francesco per accordarti sull’appuntamento e sul saldo già versato.':''}</p>{payment.paid_at&&<p>Ricevuto il {format(payment.paid_at)}</p>}</>:payment.requiresReview?<p>Il pagamento o l’appuntamento richiede una verifica di Francesco. Non effettuare un secondo pagamento.</p>:closed?<p>L’appuntamento non è più attivo. Contatta Francesco per verificare la prenotazione e il saldo.</p>:payment.payment_method!=='online'?<p>{payment.payment_method==='pos'?'POS':payment.payment_method==='cash'?'Contanti':'Pagamento'} su accordo con Francesco, prima dell’inizio.</p>:deadline?<p>Il termine di pagamento è passato. Contatta Francesco prima di effettuare un nuovo pagamento.</p>:<p>Pagamento entro <strong>{format(payment.payment_deadline)}</strong>.</p>}
    {payment.canPay&&<p>{paymentCopy.checkout}{payment.checkoutMode==='live'?' Confermando nel checkout viene effettuato un addebito reale.':''}</p>}{payment.checkoutMode==='disabled'&&!closed&&payment.payment_method==='online'&&<p>I nuovi pagamenti online non sono disponibili.</p>}{payment.warning&&<p role="status">{payment.warning}</p>}
    <div className="registry-actions">{payment.canPay&&<button className="button dark" disabled={busy||loading} onClick={pay}>{busy?'Apertura…':`Paga ${payment.amount/100} €${payment.testMode?" · prova":""}`}</button>}<button className="button outline" disabled={busy||loading} onClick={()=>{setLoading(true);setError('');void load();}}>{loading?'Verifica…':'Aggiorna saldo'}</button></div>
  </section>}{!payment&&!loading&&error&&<button className="button outline" onClick={()=>{setLoading(true);setError('');void load();}}>Riprova</button>}<p><a className="text-link" href={back}>Torna alle tue lezioni</a></p></>;
}
