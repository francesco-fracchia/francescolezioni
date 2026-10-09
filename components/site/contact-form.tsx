'use client';
import WhatsAppIcon from '@/components/site/whatsapp-icon';
import {useRef,useState,type FormEvent} from 'react';
import {Check} from 'lucide-react';
import {schoolSubjects,universitySubjects} from '@/lib/catalog';
import {useSitePreview} from './site-preview-context';
export default function ContactForm({subject='Matematica',standalone=false,referralCode='',initialMessage=''}:{subject?:string;standalone?:boolean;referralCode?:string;initialMessage?:string}){
 const Heading=standalone?'h1':'h2';
 const preview=useSitePreview();
 const [inviteCode,setInviteCode]=useState(referralCode);
 const [state,setState]=useState<'idle'|'saving'|'success'|'error'>('idle'),[error,setError]=useState(''),[replyEmail,setReplyEmail]=useState('');
 const attempt=useRef<{id:string;body:string}|null>(null);
 const subjects=[...new Set([...schoolSubjects,...universitySubjects,'Altro / da concordare'])];
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(preview){setError('Il modulo non invia richieste durante l’anteprima.');return;}const form=new FormData(event.currentTarget);
  const body=JSON.stringify({name:String(form.get('name')||'').trim(),email:String(form.get('email')||'').trim().toLowerCase(),subject:String(form.get('subject')||''),message:String(form.get('message')||'').trim(),consent:form.get('consent')==='on',website:String(form.get('website')||''),...(String(form.get('referralCode')||'').trim()?{referralCode:String(form.get('referralCode')).trim()}:{} )});
  if(attempt.current?.body!==body)attempt.current={id:crypto.randomUUID(),body};
  setState('saving');setError('');
  try{
   const response=await fetch('/api/contatti',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:attempt.current.id,...JSON.parse(body)})});
   const result=await response.json() as {error?:string};if(!response.ok)throw Error(result.error||'Messaggio non salvato. Riprova.');
   setReplyEmail(String(form.get('email')||'').trim());setState('success');
  }catch(e){setError(e instanceof Error?e.message:'Non ho ricevuto la conferma. Riprova: i dati sono ancora nel modulo.');setState('error');}
 }
 if(state==='success')return <section className="success" aria-live="polite"><span className="success-icon"><Check size={32}/></span><Heading id="dialog-title">Messaggio ricevuto</Heading><p>Ti risponderò a <strong>{replyEmail}</strong>. Se vuoi fare lezione, ci accorderemo su giorno e orario.</p><p className="form-note">Hai inviato una richiesta di informazioni. Nessun appuntamento è stato prenotato e non devi pagare nulla.</p></section>;
 return <div className="contact-form"><Heading id="dialog-title">Chiedi informazioni</Heading><p>Puoi usare questo modulo per chiedermi informazioni per te o per tuo figlio, anche se non hai ancora raccolto il programma o deciso quando fare lezione.</p>{preview&&<p className="form-note" role="status">Durante l’anteprima il modulo non invia richieste.</p>}<form onSubmit={submit}><fieldset disabled={state==='saving'}><div className="form-grid"><label>Nome<input name="name" autoComplete="name" required minLength={2} maxLength={100}/></label><label>Email<input name="email" type="email" autoComplete="email" required maxLength={254}/></label><label className="full">Materia<select name="subject" defaultValue={subjects.includes(subject)?subject:'Altro / da concordare'}>{subjects.map(s=><option key={s}>{s}</option>)}</select></label><label className="full">Messaggio (facoltativo)<textarea name="message" defaultValue={initialMessage} rows={3} maxLength={1000} placeholder={subject==='Informatica'?'Es. Frequento la quarta superiore e ho difficoltà con i cicli e gli array.':'Es. Mio figlio frequenta la terza superiore e ha difficoltà con le equazioni.'}/></label></div><details open={!!referralCode}><summary>Hai un codice invito?</summary><label>Codice invito (facoltativo)<input name="referralCode" value={inviteCode} onChange={e=>setInviteCode(e.target.value)} maxLength={19} placeholder="FF-…" autoComplete="off"/></label></details><label className="honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off"/></label><p className="form-privacy">Uso questi dati per risponderti e gestire la richiesta. Restano riservati. Se sei minorenne, compila con un genitore e usa la sua email.</p><label className="checkbox"><input name="consent" type="checkbox" required/>Acconsento all’uso di questi dati per essere ricontattato.</label>{error&&<p className="error" role="alert">{error}</p>}<button className="button dark" type="submit" disabled={preview}>{state==='saving'?'Invio in corso…':'Invia il messaggio'}</button></fieldset></form><div className="contact-alternatives"><a href="https://wa.me/393500316324" target="_blank" rel="noopener noreferrer"><WhatsAppIcon/>Scrivimi su WhatsApp</a><p>Per parlare del programma puoi anche <a href={`/incontro?materia=${encodeURIComponent(subject)}${inviteCode?'&invito='+encodeURIComponent(inviteCode.trim()):''}`}>prenotare un incontro gratuito di 15 minuti</a>.</p></div></div>;
}
