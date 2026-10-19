import {cancellationOutcome,type CancellationRecord} from '@/lib/booking/cancellation-outcome';
const date=(value:string)=>new Intl.DateTimeFormat('it-IT',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Rome'}).format(new Date(value));
export default function CancellationSummary({record}:{record:CancellationRecord}) {
  const outcome=cancellationOutcome(record);
  if(!outcome)return null;
  const received=record.cancellation_requested_at;
  const validDate=received&&Number.isFinite(Date.parse(received));
  const unitNote=outcome.details.find(detail=>detail.startsWith('L’unità resta utilizzata'));
  return <div className="cancellation-outcome"><p><strong>{outcome.title}</strong></p>{unitNote&&<p>{unitNote}</p>}<details><summary>Dettagli dell’esito</summary>{record.status==='cancelled'&&<p>{record.cancelled_by==='tutor'?'Cancellazione da parte di Francesco':record.cancelled_by==='student'?'Cancellazione richiesta dallo studente':'Appuntamento cancellato'}{validDate?` · richiesta ricevuta il ${date(received)}`:''}.</p>}{outcome.details.filter(detail=>detail!==unitNote).map(detail=><p key={detail}>{detail}</p>)}</details></div>;
}
