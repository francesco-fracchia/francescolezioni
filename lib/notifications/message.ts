export type NoticeKind='reserved'|'confirmed'|'modified'|'cancelled'|'expired';
export type Appointment={id:string;subject:string;starts_at:string;ends_at:string;mode:string;payment_method?:string;payment_status?:string;previous_start?:string};
export type Recipient={name:string;email:string;studentId?:string|null;notifications?:number;amount?:number;paymentLink?:string};
const date=(s:string)=>new Intl.DateTimeFormat('it-IT',{dateStyle:'full',timeStyle:'short',timeZone:'Europe/Rome'}).format(new Date(s));
export function appointmentMessage(kind:NoticeKind,a:Appointment,r:Recipient){
 const title={reserved:'Lezione riservata',confirmed:'Lezione confermata',modified:'Lezione modificata',cancelled:'Lezione cancellata',expired:'Prenotazione scaduta'}[kind];
 const lines=[`Ciao ${r.name},`, '',`${title}: ${a.subject}.`,`${date(a.starts_at)} · ${a.mode} · 55 minuti.`];
 if(kind==='modified'&&a.previous_start)lines.push(`L’orario precedente era ${date(a.previous_start)}.`);
 if(kind==='cancelled')lines.push('Questo appuntamento è stato cancellato. Se hai già pagato, contatta Francesco per concordare la gestione del saldo.');
 else if(kind==='expired')lines.push('Il termine di pagamento è passato. Per fissare un nuovo appuntamento contatta Francesco.');
 else if(a.payment_status!=='paid'&&a.payment_method==='online'){
  if(r.amount)lines.push(`Quota personale: ${r.amount/100} €.`);
  lines.push(`Pagamento entro ${date(new Date(Date.parse(a.starts_at)-3600000).toISOString())}.`);
  if(r.paymentLink)lines.push(`Il tuo link personale: ${r.paymentLink}`);
 }else if(a.payment_status!=='paid'&&['pos','cash'].includes(a.payment_method||''))lines.push(`Pagamento concordato con ${a.payment_method==='pos'?'POS':'contanti'}, prima di iniziare.`);
 lines.push('', 'Francesco Fracchia','info@francescofracchia.it','WhatsApp: +39 350 031 6324');
 return {subject:`${title} · ${a.subject}`,body:lines.join('\n')};
}
