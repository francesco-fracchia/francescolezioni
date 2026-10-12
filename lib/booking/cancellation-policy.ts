export type CancellationBy = 'student' | 'tutor';
// Preavviso misurato dalla richiesta ricevuta, non dal momento in cui viene registrata.
export function cancellationRefundPercent(startsAt: string, requestedAt: string, by: CancellationBy, chosenPercent?: number): number {
 const start=Date.parse(startsAt),received=Date.parse(requestedAt);
 if(!Number.isFinite(start)||!Number.isFinite(received))throw new Error('Invalid cancellation date');
 if(by==='tutor'){
  if(chosenPercent===undefined||!Number.isInteger(chosenPercent)||chosenPercent<0||chosenPercent>100)throw new Error('Choose the tutor refund percentage');
  return chosenPercent;
 }
 return start-received>=24*60*60*1000?100:50;
}
export function cancellationRefundAmount(paidCents: number, percent: number): number {
 if(!Number.isSafeInteger(paidCents)||paidCents<0||!Number.isInteger(percent)||percent<0||percent>100)throw new Error('Invalid paid amount');
 return Math.round(paidCents*percent/100);
}
