export type PaymentMode='disabled'|'test'|'live';
export type RuntimeStatus={visibility:'private'|'public'|'unknown';emailMode:'disabled'|'preview'|'live';paymentMode:PaymentMode};
export const unconfiguredRuntimeStatus:RuntimeStatus={visibility:'unknown',emailMode:'disabled',paymentMode:'disabled'};
export function paymentMode(ready:boolean,live:boolean):PaymentMode{return ready?(live?'live':'test'):'disabled';}
export const paymentModeLabel:Record<PaymentMode,string>={disabled:'Pagamenti online disattivati',test:'Pagamenti online di prova',live:'Pagamenti online reali'};
export const emailModeLabel:Record<RuntimeStatus['emailMode'],string>={disabled:'Invio email disattivato',preview:'Email in anteprima',live:'Invio email abilitato'};
export function runtimeLabel(status:RuntimeStatus){return [status.visibility==='private'?'Sito privato':status.visibility==='public'?'Sito pubblico':null,emailModeLabel[status.emailMode],paymentModeLabel[status.paymentMode]].filter(Boolean).join(' · ');}
