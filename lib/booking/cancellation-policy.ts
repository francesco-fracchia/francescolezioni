export type CancellationBy = 'student' | 'tutor';
// Preavviso misurato dalla richiesta ricevuta, non dal momento in cui viene registrata.
export function cancellationRefundPercent(startsAt: string, requestedAt: string, by: CancellationBy): 50 | 100 {
 const start=Date.parse(startsAt),received=Date.parse(requestedAt);
 if(!Number.isFinite(start)||!Number.isFinite(received))throw new Error('Invalid cancellation date');
 return by==='tutor'||start-received>=24*60*60*1000?100:50;
}
export function cancellationRefundAmount(paidCents: number, percent: 50 | 100): number {
 if(!Number.isSafeInteger(paidCents)||paidCents<0)throw new Error('Invalid paid amount');
 return Math.round(paidCents*percent/100);
}
