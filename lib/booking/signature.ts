export async function validStripeSignature(raw:string,header:string,secret:string,now=Date.now()) {
 const parts=header.split(','); const timestamp=parts.find(p=>p.startsWith('t='))?.slice(2);
 if(!timestamp||!/^\d+$/.test(timestamp)||Math.abs(now/1000-Number(timestamp))>300)return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 for(const part of parts.filter(p=>p.startsWith('v1='))) {
 const hex=part.slice(3);if(!/^[a-f0-9]{64}$/.test(hex))continue;
 const signature=new Uint8Array(hex.match(/../g)!.map(v=>parseInt(v,16)));
 if(await crypto.subtle.verify('HMAC',key,signature,new TextEncoder().encode(`${timestamp}.${raw}`)))return true;
 }return false;
}
