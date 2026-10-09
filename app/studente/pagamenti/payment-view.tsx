'use client';
import { useEffect,useState } from 'react';
type Payment = {
  id:string;kind:'lesson'|'booking';studentId:string;subject:string;starts_at:string;ends_at:string;mode:string;
  amount:number;credit_amount?:number;package_status?:string|null;payment_status:string;lesson_status:string;payment_method:string;paid_at:string|null;
  payment_deadline:string;canPay:boolean;preview:boolean;testMode:boolean;warning?:string;requiresReview:boolean;
};
const format=(s:string)=>new Intl.DateTimeFormat('it-IT',{dateStyle:'full',timeStyle:'short',timeZone:'Europe/Rome'}).format(new Date(s));
const labels:Record<string,string>={paid:'Saldo ricevuto',manual_paid:'Saldo ricevuto',awaiting:'Da pagare',pending:'Pagamento aperto',payment_review:'Pagamento da verificare',expired:'Termine scaduto',unverified:'Saldo da verificare'};
export default function PaymentView(){
  const [payment,setPayment]=useState<Payment|null>(null);const [error,setError]=useState('');const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);
  function params(){const p=new URLSearchParams(window.location.search);return {studentId:p.get('studentId'),id:p.get('id'),kind:p.get('kind')};}
  async function load(){setLoading(true);try{
    const p=new URLSearchParams(window.location.search);const r=await fetch('/api/studente/pagamenti?'+p,{cache:'no-store'});const d=await r.json() as Payment&{error?:string};
    if(!r.ok){setPayment(null);throw Error(d.error||'Saldo non disponibile.');}setPayment(d);
  }catch(e){setError((e as Error).message);}finally{setLoading(false);}}
  useEffect(()=>{void load();},[]);
  async function pay(){setBusy(true);setError('');try{
    const r=await fetch('/api/studente/pagamenti',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(params())});
    const d=await r.json() as {url?:string;error?:string};
    if(!r.ok){if(r.status===409)await load();throw Error(d.error||'Pagamento non disponibile.');}
    if(!d.url?.startsWith('https://checkout.stripe.com/'))throw Error('Pagamento non disponibile.');
    window.location.assign(d.url);
  }catch(e){setError((e as Error).message);setBusy(false);}}
  const paid=payment&&['paid','manual_paid'].includes(payment.payment_status);
  const closed=payment&&(payment.kind==='lesson'?payment.lesson_status!=='planned':!['pending','awaiting_payment','confirmed','payment_review'].includes(payment.lesson_status));
  const deadline=payment&&new Date(payment.payment_deadline).getTime()<=Date.now();
  const back=payment?'/studente?'+new URLSearchParams({studente:payment.studentId,vista:'lezioni',...(payment.preview?{anteprima:payment.studentId}:{})}):'/studente?vista=lezioni';
  return <>{payment?.testMode&&<div className="learning-notice"><strong>Ambiente di prova · nessun addebito reale</strong></div>}{error&&<p className="error" role="alert">{error}</p>}{loading&&!payment&&<p role="status">Caricamento…</p>}{payment&&<section className="booking-status">
    {payment.preview&&<p className="booking-badge">Anteprima del tutor · sola lettura</p>}
    <span className="booking-badge">{payment.lesson_status==='cancelled'?'Appuntamento cancellato':labels[payment.payment_status]||'Saldo da verificare'}</span>
    <h2>{payment.subject}</h2><p>{format(payment.starts_at)} · {payment.mode} · 55 minuti</p><p className="lesson-payment-price">{payment.amount/100} €</p>
    {!!payment.credit_amount&&<p>Credito invito applicato: {payment.credit_amount/100} €. L’importo indicato include già il credito.</p>}{payment.package_status==='applied'?<p>Questa lezione è coperta dal pacchetto: non devi pagare altro. La quota attribuita è di {payment.amount/100} €.</p>:payment.package_status==='returned'&&closed?<p>L’associazione è stata rimossa. La lezione è tornata disponibile nel pacchetto; per eventuali rimborsi contatta Francesco.</p>:paid?<><p>Il tuo saldo è registrato.{closed?' Contatta Francesco per accordarti sull’appuntamento e sul saldo già versato.':''}</p>{payment.paid_at&&<p>Ricevuto il {format(payment.paid_at)}</p>}</>:payment.requiresReview?<p>Il pagamento o l’appuntamento richiede una verifica di Francesco. Non effettuare un secondo pagamento.</p>:closed?<p>L’appuntamento non è più attivo. Contatta Francesco per verificare la prenotazione e il saldo.</p>:payment.payment_method!=='online'?<p>{payment.payment_method==='pos'?'POS':payment.payment_method==='cash'?'Contanti':'Pagamento'} su accordo con Francesco, prima dell’inizio.</p>:deadline?<p>Il termine di pagamento è passato. Contatta Francesco prima di effettuare un nuovo pagamento.</p>:<p>Pagamento entro <strong>{format(payment.payment_deadline)}</strong>.</p>}
    {payment.warning&&<p role="status">{payment.warning}</p>}
    <div className="registry-actions">{payment.canPay&&<button className="button dark" disabled={busy||loading} onClick={pay}>{busy?'Apertura…':`Paga ${payment.amount/100} €${payment.testMode?" · prova":""}`}</button>}<button className="button outline" disabled={busy||loading} onClick={()=>{setError('');void load();}}>{loading?'Verifica…':'Aggiorna saldo'}</button></div>
  </section>}{!payment&&!loading&&error&&<button className="button outline" onClick={()=>{setError('');void load();}}>Riprova</button>}<p><a className="text-link" href={back}>Torna alle tue lezioni</a></p></>;
}
