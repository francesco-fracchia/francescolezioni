'use client';
import {useMemo,useRef,useState} from 'react';
import {CalendarPlus,Copy} from 'lucide-react';
import {consultationReceipt,type ConfirmedConsultation} from '@/lib/consultation-receipt.mjs';

export default function ConsultationReceipt({appointment}: {appointment:ConfirmedConsultation&{calendarToken:string}}) {
  const [copied,setCopied] = useState<'idle'|'success'|'error'>('idle');
  const manual = useRef<HTMLDetailsElement>(null), field = useRef<HTMLTextAreaElement>(null);
  const receipt = useMemo(()=>{try{return consultationReceipt(appointment);}catch{return null;}},[appointment]);
  async function copy() {
    if (!receipt) return;
    try {await navigator.clipboard.writeText(receipt.summary);setCopied('success');}
    catch {setCopied('error');if(manual.current)manual.current.open=true;field.current?.focus();field.current?.select();}
  }
  if (!receipt) return <p>Conserva giorno e orario riportati sopra. Per spostare o cancellare l’incontro, scrivimi su WhatsApp.</p>;
  return <div className="consultation-receipt">
    <p>{receipt.instructions}</p>
    <div className="actions"><form action="/api/incontri/calendario" method="post"><input type="hidden" name="id" value={appointment.id}/><input type="hidden" name="token" value={appointment.calendarToken}/><button type="submit" className="button dark"><CalendarPlus size={18} aria-hidden="true"/>Aggiungi al calendario</button></form><button type="button" className="button outline" onClick={()=>void copy()}><Copy size={18} aria-hidden="true"/>Copia riepilogo</button></div>
    {copied==='success'&&<p role="status">Riepilogo copiato.</p>}{copied==='error'&&<p role="status">Puoi copiare il riepilogo dal campo qui sotto.</p>}
    <details ref={manual} className="reading-disclosure"><summary>Leggi o copia il riepilogo</summary><label>Dettagli dell’incontro<textarea ref={field} readOnly rows={7} value={receipt.summary}/></label></details>
    <p className="form-note">Il file si può importare nel calendario che usi. Se spostiamo l’incontro, aggiorna anche il tuo calendario.</p>
  </div>;
}
