import { env } from '@/lib/runtime-env';
import { getAccount } from '@/lib/auth/session';
import { LearningError } from '@/lib/learning/access';
import { readUploadClaim, signUploadClaim } from './claims.mjs';

export type UploadKind = 'material' | 'task' | 'submission';
export type UploadClaim = { actor:string; version:number; kind:UploadKind; target:string; key:string; filename:string; mime:string; size:number; expires:number };
export const uploadTypes = { material:['application/pdf','image/png','image/jpeg','video/mp4','video/webm'], task:['application/pdf','image/png','image/jpeg','text/plain'], submission:['application/pdf','image/png','image/jpeg','text/plain'] };
const secret = () => process.env.TURSO_AUTH_TOKEN || process.env.CF_D1_API_TOKEN;
export function uploadProof(claim:UploadClaim) { return signUploadClaim(claim, secret()); }

// Finalization runs through the existing course/homework authorization and SQL
// guards. Never accept client-provided object URLs, keys or file metadata.
export async function readDirectForm(request:Request, kind:UploadKind, targetField:string) {
 const raw=await request.text();if(raw.length>40000)throw new LearningError('Dati troppo grandi.',413);
 const body=JSON.parse(raw), account=await getAccount(request);let claim:UploadClaim;
 try { claim=readUploadClaim(body.uploadProof,secret()) as UploadClaim; }
 catch { throw new LearningError('Il caricamento è scaduto o non è valido. Scegli di nuovo il file.',409); }
 if(!account||account.must_change_password||account.id!==claim.actor||account.auth_version!==claim.version||claim.kind!==kind||body[targetField]!==claim.target)throw new LearningError('Caricamento non consentito.',403);
 if(!env.BUCKET)throw new LearningError('Archivio temporaneamente non disponibile.',503);
 const object=await env.BUCKET.get(claim.key);if(!object||object.size!==claim.size)throw new LearningError('Il file non è stato caricato completamente.',409);
 let size=0;const chunks:Uint8Array[]=[];const reader=object.body.getReader();
 try {while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>claim.size)throw new LearningError('Dimensione del file non valida.',413);chunks.push(part.value);}}
 finally {await reader.cancel().catch(()=>{});reader.releaseLock();}
 if(size!==claim.size)throw new LearningError('Caricamento incompleto.',409);
 const form=new FormData();for(const [key,value] of Object.entries(body))if(key!=='uploadProof'&&key!=='file'&&typeof value==='string')form.set(key,value);
 form.set('file',new File(chunks as BlobPart[],claim.filename,{type:claim.mime}));
 return {form,key:claim.key};
}
