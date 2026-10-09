import { env } from '@/lib/runtime-env';
export function bookingDb() { if(!env.DB) throw new Error('Database unavailable'); return env.DB; }
export function paymentConfig() {
 const key=env.STRIPE_SECRET_KEY; const origin=env.SITE_ORIGIN;
 const webhook=env.STRIPE_WEBHOOK_SECRET;
 const live=!!key?.startsWith('sk_live_');
 let validOrigin=false;try{const u=new URL(origin||'');validOrigin=u.protocol==='https:'&&u.origin===origin;}catch{/* Missing or invalid public origin keeps checkout closed. */}
 const ready=validOrigin && (!!key?.startsWith('sk_test_') || (live && env.PAYMENT_LIVE_ENABLED==='1' && !!webhook));
 return {key,origin,webhook,live,ready};
}
export async function stripe(path:string,body?:URLSearchParams,idempotency?:string) {
 const config=paymentConfig(); if(!config.ready) throw new Error('Payments unavailable');
 for(let attempt=0;attempt<3;attempt++){
  const response=await fetch(`https://api.stripe.com/v1/${path}`,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${config.key}`,...(body?{'Content-Type':'application/x-www-form-urlencoded'}:{}),...(idempotency?{'Idempotency-Key':idempotency}:{})},body});
  // Stripe can reject simultaneous execution of the same key. Retry the same
  // persisted request, never a fresh key that could create another charge.
  if(response.status===409&&idempotency&&attempt<2){await new Promise(r=>setTimeout(r,400*(attempt+1)));continue;}
  if(!response.ok) throw new Error('Payment provider unavailable'); return await response.json() as {id:string;url:string;livemode:boolean};
 }
 throw new Error('Payment provider unavailable');
}
