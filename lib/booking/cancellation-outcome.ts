import {cancellationRefundAmount} from './cancellation-policy';

export type CancellationFields = {
  cancelled_by?:string|null;
  cancellation_requested_at?:string|null;
  cancellation_refund_percent?:number|null;
};
export type CancellationRecord = CancellationFields & {
  status:string;
  package_status?:string|null;
  payment_status?:string|null;
  amount?:number|null;
};
export type CancellationOutcome = {kind:'returned'|'refund'|'review';title:string;details:string[]};
const money=(cents:number)=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(cents/100);

// Read the recorded snapshot, never infer a new percentage from today's date.
// Cancellation does not record a money transfer; keep that distinction visible.
export function cancellationOutcome(record:CancellationRecord):CancellationOutcome|null {
  const closed=['cancelled','expired'].includes(record.status);
  if(record.package_status==='returned') {
    if(closed&&record.cancellation_refund_percent!=null) return {kind:'review',title:'Esito da verificare con Francesco',details:['Risultano sia un’unità restituita sia una percentuale di rimborso. Il saldo deve essere verificato prima di attribuire entrambi i benefici.']};
    return {kind:'returned',title:'1 lezione restituita al pacchetto',details:[record.status==='planned'?'L’associazione a questo appuntamento è stata rimossa. Il suo eventuale saldo va verificato separatamente.':'La restituzione di questo utilizzo è registrata. Il saldo residuo del pacchetto indica quante lezioni puoi ancora prenotare.', 'La restituzione dell’unità non conferma un rimborso in denaro.']};
  }
  if(!closed)return null;
  const percent=record.cancellation_refund_percent;
  const packageNote=record.package_status==='applied'?'L’unità resta utilizzata: non è stata restituita al pacchetto.':null;
  if(record.status!=='cancelled'||percent==null||!Number.isInteger(percent)||percent<0||percent>100) return {kind:'review',title:'Esito economico da verificare con Francesco',details:[...(packageNote?[packageNote]:[]),'Non è registrata una percentuale di rimborso valida per questo appuntamento.']};
  if(!['paid','manual_paid'].includes(record.payment_status||'')||typeof record.amount!=='number'||!Number.isSafeInteger(record.amount)||record.amount<0) return {kind:'review',title:`Percentuale di rimborso registrata: ${percent}%`,details:[...(packageNote?[packageNote]:[]),'Il saldo ricevuto non è verificato: l’importo del rimborso deve essere controllato con Francesco.']};
  const amount=record.amount;
  return {kind:'refund',title:`Rimborso previsto: ${money(cancellationRefundAmount(amount,percent))} (${percent}%)`,details:[`Calcolato sulla quota pagata per questa lezione: ${money(amount)}.`,...(packageNote?[packageNote]:[]),'Questa registrazione non conferma un trasferimento di denaro. Contatta Francesco per l’esecuzione o la verifica del rimborso.']};
}
