import { env } from '@/lib/runtime-env';
import { createHash } from 'node:crypto';
import { bookingDb } from '@/lib/booking/runtime';
import { LearningError } from '@/lib/learning/access';
export const maxFile=10*1024*1024;
export async function readHomeworkForm(request:Request){
 if(!request.body)throw new LearningError('Dati mancanti.');
 if(Number(request.headers.get('content-length'))>12*1024*1024)throw new LearningError('Il file supera 10 MB.',413);
 let received=0;const bounded=request.body.pipeThrough(new TransformStream<Uint8Array,Uint8Array>({transform(chunk,c){received+=chunk.byteLength;if(received>12*1024*1024)throw new LearningError('Il file supera 10 MB.',413);c.enqueue(chunk);}}));
 return new Response(bounded,{headers:{'Content-Type':request.headers.get('content-type')||''}}).formData();
}
export async function homeworkFile(value:FormDataEntryValue|null){
 if(value===null||value===''||(value instanceof File&&value.size===0))return null;
 if(!(value instanceof File)||value.size>maxFile)throw new LearningError('Scegli un file fino a 10 MB.',413);
 const bytes=new Uint8Array(await value.arrayBuffer());let mime=value.type;
 const prefix=new TextDecoder().decode(bytes.slice(0,8));
 const valid=mime==='application/pdf'?prefix.startsWith('%PDF-'):mime==='image/png'?[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v):mime==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:mime==='text/plain'?(()=>{try{new TextDecoder('utf-8',{fatal:true}).decode(bytes);return !bytes.includes(0);}catch{return false;}})():false;
 if(!valid)throw new LearningError('Sono ammessi PDF, PNG, JPEG e testo UTF-8. Il contenuto deve corrispondere al formato.');
 const filename=value.name.replace(/[\x00-\x1f\x7f/\\]/g,'_').slice(0,180)||'consegna';
 return {bytes,filename,mime,size:value.size,hash:createHash('sha256').update(bytes).digest('hex')};
}
export async function putHomeworkFile(key:string,file:NonNullable<Awaited<ReturnType<typeof homeworkFile>>>){if(!env.BUCKET)throw new LearningError('Archivio temporaneamente non disponibile.',503);await env.BUCKET.put(key,file.bytes,{httpMetadata:{contentType:file.mime}});}
// A database timeout can happen after commit: never delete an object that may
// already be referenced. Keep uncertain objects for operational recovery.
export async function discardUnusedFile(key:string|null){if(!key)return;try{const used=await bookingDb().prepare('SELECT id FROM homework_assignments WHERE object_key=? UNION ALL SELECT id FROM homework_submissions WHERE object_key=? LIMIT 1').bind(key,key).first();if(!used)await env.BUCKET?.delete(key);}catch{/* Preserve uncertain objects; don't replace a successful save with a cleanup error. */}}
