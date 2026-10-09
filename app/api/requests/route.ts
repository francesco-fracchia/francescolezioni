import { z } from 'zod';
import { tests } from '@/lib/catalog';
import {findRequest,saveRequest} from '@/lib/request-store';
import {limitPublicRequest} from '@/lib/public-request-limit';
const headers={'Cache-Control':'no-store'};
const schema = z.object({id:z.string().uuid(),kind:z.enum(['pre-registration','group','consultation','lesson']),name:z.string().trim().min(2).max(100),email:z.string().trim().email().max(254).transform(s=>s.toLowerCase()),subject:z.string().min(1).max(100),details:z.object({studentType:z.enum(['Superiori','Università']),institution:z.string().max(200),year:z.string().max(100),teacher:z.string().max(100),program:z.string().min(2).max(3000),goal:z.string().max(1000),deadline:z.string().max(20),availability:z.string().min(2).max(1000),mode:z.enum(['Online','Lodi','Entrambe']),level:z.string().max(100),groupSize:z.string().max(20),companion:z.boolean(),phone:z.string().max(40),groupRequest:z.enum(['existing','matching']).optional(),participants:z.array(z.object({name:z.string().trim().min(1).max(100),level:z.string().max(200)})).max(3).optional(),sharedProgram:z.string().max(100).optional(),groupNotes:z.string().max(2000).optional()}),assessment:z.object({test:z.string().max(100),score:z.number().min(0).max(100),answers:z.array(z.number().int().min(0).max(4)).max(5),student:z.string().max(200).optional()}).nullable().optional(),consent:z.literal(true),website:z.string().max(0)});
export async function POST(request:Request) {
 const origin = request.headers.get('origin');
 if (origin !== new URL(request.url).origin) return Response.json({error:'Origine non consentita.'},{status:403,headers});
 if(Number(request.headers.get('content-length')||0)>20000) return Response.json({error:'Richiesta troppo grande.'},{status:413,headers});
 try {
 const body = await request.text(); if(body.length>20000) return Response.json({error:'Richiesta troppo grande.'},{status:413,headers});
 const parsed=schema.safeParse(JSON.parse(body)); if(!parsed.success) return Response.json({error:'Controlla i campi richiesti.'},{status:400,headers});
 const p=parsed.data;
 if(p.kind==='group' && p.details.groupRequest==='existing' && !p.details.participants?.length) return Response.json({error:'Indica almeno un compagno.'},{status:400,headers});
 let assessment=null;
 if(p.assessment){const questions=tests[p.assessment.test];if(!questions||p.assessment.answers.length!==questions.length)return Response.json({error:'Risultato del test non valido.'},{status:400,headers});
 const review=questions.map((q,i)=>({topic:q.topic,question:q.text,answer:q.options[p.assessment!.answers[i]]||'Non lo so ancora',correctAnswer:q.options[q.correct],correct:p.assessment!.answers[i]===q.correct,explanation:q.explanation}));
 assessment={...p.assessment,score:Math.round(review.filter(q=>q.correct).length/questions.length*100),review,version:'2026-10-04'};}
 const record={...p,details:JSON.stringify(p.details),assessment:assessment?JSON.stringify(assessment):null};
 const same=(old:NonNullable<Awaited<ReturnType<typeof findRequest>>>)=>old.kind===record.kind&&old.name===record.name&&old.email===record.email&&old.subject===record.subject&&old.details===record.details&&old.assessment===record.assessment;
 const existing=await findRequest(p.id);
 if(existing)return same(existing)?Response.json({id:p.id,ok:true},{headers}):Response.json({error:'Identificativo già utilizzato con altri dati. Invia una nuova richiesta.'},{status:409,headers});
 const limited=await limitPublicRequest(request,p.email);if(limited)return limited;
 try{await saveRequest(record);}catch(error){const saved=await findRequest(p.id);if(saved)return same(saved)?Response.json({id:p.id,ok:true},{headers}):Response.json({error:'Identificativo già utilizzato con altri dati.'},{status:409,headers});throw error;}
 return Response.json({id:p.id,ok:true},{status:201,headers});
 } catch(error) {
 if(error instanceof SyntaxError)return Response.json({error:'Dati non validi.'},{status:400,headers});
 console.error('Request save failed');return Response.json({error:'Non siamo riusciti a salvare la richiesta. I tuoi dati sono ancora nel modulo: riprova.'},{status:503,headers});
 }
}
