import {validateReferral} from '@/lib/referrals/server';
import {z} from 'zod';
import {findRequest,saveRequest} from '@/lib/request-store';
import {limitPublicRequest} from '@/lib/public-request-limit';
const headers={'Cache-Control':'no-store'};
const schema=z.object({id:z.string().uuid(),name:z.string().trim().min(2).max(100),email:z.string().trim().email().max(254).transform(s=>s.toLowerCase()),subject:z.string().trim().min(1).max(100),message:z.string().trim().max(1000).default(''),consent:z.literal(true),website:z.string().max(0),referralCode:z.string().max(19).optional()});
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Origine non consentita.'},{status:403,headers});
 try{
  const raw=await request.text();if(raw.length>5000)return Response.json({error:'Messaggio troppo lungo.'},{status:413,headers});
  const parsed=schema.safeParse(JSON.parse(raw));if(!parsed.success)return Response.json({error:'Controlla nome, email, materia e consenso.'},{status:400,headers});
  const {id,name,email,subject,message,referralCode}=parsed.data;
  const record={id,kind:'contact',name,email,subject,details:JSON.stringify({message,...(referralCode?{referralCode}:{})}),assessment:null};
  // Verify retries by content, without exposing another request's data.
  const same=(old:NonNullable<Awaited<ReturnType<typeof findRequest>>>)=>old.kind===record.kind&&old.name===name&&old.email===email&&old.subject===subject&&old.details===record.details&&old.assessment===null;
  const existing=await findRequest(id);
  if(existing)return same(existing)?Response.json({ok:true,id},{headers}):Response.json({error:'Questo messaggio è già stato inviato con altri dati. Invia una nuova richiesta.'},{status:409,headers});
  const limited=await limitPublicRequest(request,email);if(limited)return limited;
  await validateReferral(referralCode||'');
  try{await saveRequest(record);}catch(error){
   // A simultaneous retry or a lost DB acknowledgement may already be saved.
   const saved=await findRequest(id);if(saved)return same(saved)?Response.json({ok:true,id},{headers}):Response.json({error:'Identificativo già utilizzato. Invia una nuova richiesta.'},{status:409,headers});throw error;
  }
  return Response.json({ok:true,id},{status:201,headers});
 }catch(error){if(error instanceof Error&&error.message.startsWith('Codice invito'))return Response.json({error:error.message},{status:400,headers});if(error instanceof SyntaxError)return Response.json({error:'Dati del messaggio non validi.'},{status:400,headers});return Response.json({error:'Non ho ricevuto la conferma del salvataggio. Il messaggio è ancora qui: riprova.'},{status:503,headers});}
}
