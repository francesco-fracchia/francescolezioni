import { isRequestOwner } from '@/lib/request-admin';
import { bookingDb } from '@/lib/booking/runtime';
import { groupProblems,snapshot,waitingCandidate } from '@/lib/matching/compare';
import type { Candidate,Proposal } from '@/lib/matching/types';
import { z } from 'zod';

const headers={'Cache-Control':'private, no-store'};
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers});
const checks=z.object({program:z.boolean(),level:z.boolean(),goal:z.boolean(),availability:z.boolean(),mode:z.boolean()});
const create=z.object({id:z.string().uuid(),name:z.string().trim().min(2).max(100),mode:z.enum(['Online','Lodi']),availability:z.string().trim().min(2).max(1000),notes:z.string().trim().max(800),requestIds:z.array(z.string().uuid()).min(2).max(4).refine(ids=>new Set(ids).size===ids.length),expected:z.string().max(65000),checks});
const select="SELECT r.*,s.name student_name,s.email student_email,s.status student_status,(SELECT g.id FROM student_groups g JOIN group_members gm ON gm.group_id=g.id WHERE gm.student_id=s.id AND g.status='active' AND lower(trim(g.subject))=lower(trim(r.subject)) ORDER BY g.id LIMIT 1) existing_group_id FROM requests r LEFT JOIN students s ON s.id=r.student_id";
async function loadMembers(ids:string[]){const rows=await bookingDb().prepare(select+` WHERE r.id IN (${ids.map(()=>'?').join(',')})`).bind(...ids).all<Candidate>();return ids.map(id=>rows.results.find(r=>r.id===id)).filter((r):r is Candidate=>!!r).map(snapshot);}
function equivalent(p:Proposal,data:{name:string;mode:string;availability:string;notes:string},members:string){return p.name===data.name&&p.mode===data.mode&&p.availability===data.availability&&p.notes===data.notes&&p.members===members;}

export async function GET(request:Request){
 if(!await isRequestOwner())return reply({error:'Accesso riservato a Francesco.'},403);
 try{
  const db=bookingDb();const anchor=new URL(request.url).searchParams.get('richiesta');if(anchor&&!z.string().uuid().safeParse(anchor).success)return reply({error:'Richiesta non valida.'},400);
  const rows=await db.prepare(select+" WHERE r.kind='group' AND r.status IN ('new','contacted','matching') AND r.group_id IS NULL AND json_extract(CASE WHEN json_valid(r.details) THEN r.details ELSE '{}' END,'$.groupRequest')='matching' ORDER BY r.created_at DESC,r.id LIMIT 501").all<Candidate>();
  const candidates=rows.results.slice(0,500).map(snapshot);
  if(anchor&&!candidates.some(r=>r.id===anchor)){const row=await db.prepare(select+' WHERE r.id=?').bind(anchor).first<Candidate>();if(row&&waitingCandidate(row))candidates.push(snapshot(row));}
  const proposals=await db.prepare('SELECT * FROM matching_proposals ORDER BY created_at DESC,id LIMIT 101').all<Proposal>();
  return reply({candidates,proposals:proposals.results.slice(0,100),limits:{candidates:rows.results.length>500,proposals:proposals.results.length>100}});
 }catch{return reply({error:'Abbinamenti temporaneamente non disponibili.'},503);}
}
export async function POST(request:Request){
 if(!await isRequestOwner())return reply({error:'Accesso riservato a Francesco.'},403);
 if(request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'Origine non consentita.'},403);
 try{
  const raw=await request.text();if(raw.length>80000)return reply({error:'Proposta troppo grande.'},413);
  const p=create.parse(JSON.parse(raw));const ids=[...p.requestIds].sort();const db=bookingDb();
  const existing=await db.prepare('SELECT * FROM matching_proposals WHERE id=?').bind(p.id).first<Proposal>();
  if(existing){if(equivalent(existing,p,p.expected)&&existing.checks===JSON.stringify(p.checks))return reply({ok:true,id:p.id,status:existing.status,groupId:existing.group_id});return reply({error:'Questo tentativo è già stato salvato con dati diversi. Ricarica le proposte.'},409);}
  const rows=await loadMembers(ids);if(rows.length!==ids.length)return reply({error:'Una richiesta non è più disponibile.'},409);
  const problems=groupProblems(rows,p.mode);if(problems.length)return reply({error:problems.join(' ')},409);
  const members=JSON.stringify(rows);if(members!==p.expected)return reply({error:'I dati sono cambiati. Aggiorna il confronto prima di salvare.'},409);
  const now=new Date().toISOString();
  await db.prepare('INSERT OR IGNORE INTO matching_proposals(id,name,subject,mode,availability,notes,checks,members,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(p.id,p.name,rows[0].subject,p.mode,p.availability,p.notes,JSON.stringify(p.checks),members,now,now).run();
  const saved=await db.prepare('SELECT * FROM matching_proposals WHERE id=?').bind(p.id).first<Proposal>();
  if(!saved||!equivalent(saved,p,members)||saved.checks!==JSON.stringify(p.checks))return reply({error:'Proposta già salvata con dati diversi. Ricarica.'},409);
  return reply({ok:true,id:p.id,status:saved.status},201);
 }catch{return reply({error:'Controlla i dati della proposta e riprova.'},400);}
}
export async function PATCH(request:Request){
 if(!await isRequestOwner())return reply({error:'Accesso riservato a Francesco.'},403);
 if(request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'Origine non consentita.'},403);
 try{
  const raw=await request.text();if(raw.length>1200)return reply({error:'Richiesta troppo grande.'},413);
  const p=z.object({id:z.string().uuid(),action:z.enum(['approve','dismiss']),checks:checks.optional()}).parse(JSON.parse(raw));const db=bookingDb();
  const proposal=await db.prepare('SELECT * FROM matching_proposals WHERE id=?').bind(p.id).first<Proposal>();if(!proposal)return reply({error:'Proposta non trovata.'},404);
  if(p.action==='dismiss'){
   if(proposal.status==='approved')return reply({error:'Il gruppo è già stato creato. Gestiscilo nell’anagrafica.'},409);
   await db.prepare("UPDATE matching_proposals SET status='dismissed',updated_at=? WHERE id=? AND status='draft'").bind(new Date().toISOString(),p.id).run();
   const final=await db.prepare('SELECT status FROM matching_proposals WHERE id=?').bind(p.id).first<{status:string}>();
   return final?.status==='dismissed'?reply({ok:true}):reply({error:'La proposta è cambiata. Ricarica.'},409);
  }
  if(proposal.status==='approved')return reply({ok:true,groupId:proposal.group_id,alreadyApproved:true});
  if(proposal.status!=='draft')return reply({error:'La proposta è stata scartata.'},409);
  if(!p.checks||!Object.values(p.checks).every(Boolean))return reply({error:'Verifica tutte le cinque condizioni prima di approvare.'},400);
  const stored=JSON.parse(proposal.members) as Candidate[];const rows=await loadMembers(stored.map(r=>r.id));
  if(JSON.stringify(rows)!==proposal.members)return reply({error:'Richieste o anagrafiche cambiate: scarta questa proposta e ripeti il confronto.'},409);
  const problems=groupProblems(rows,proposal.mode);if(problems.length)return reply({error:problems.join(' ')},409);
  // D1 batch is transactional. Repeat every source check inside the winning write,
  // so overlapping proposals and archival/link changes cannot claim stale members.
  const guard=rows.map(()=>`EXISTS(SELECT 1 FROM requests r JOIN students s ON s.id=r.student_id WHERE r.id=? AND r.kind=? AND r.name=? AND r.email=? AND r.subject=? AND r.details=? AND r.assessment IS ? AND r.status=? AND r.created_at=? AND r.student_id=? AND r.group_id IS NULL AND s.name=? AND s.email=? AND s.status='active' AND NOT EXISTS(SELECT 1 FROM group_members gm JOIN student_groups g ON g.id=gm.group_id WHERE gm.student_id=s.id AND g.status='active' AND lower(trim(g.subject))=lower(trim(r.subject))))`).join(' AND ');
  const args=rows.flatMap(r=>[r.id,r.kind,r.name,r.email,r.subject,r.details,r.assessment,r.status,r.created_at,r.student_id,r.student_name,r.student_email]);
  const now=new Date().toISOString();const approvalKey=crypto.randomUUID();const groupNotes=[proposal.notes,`Modalità concordata: ${proposal.mode}`,`Disponibilità concordata: ${proposal.availability}`].filter(Boolean).join('\n');
  await db.batch([
   db.prepare(`UPDATE matching_proposals SET status='approved',group_id=id,approval_key=?,checks=?,updated_at=? WHERE id=? AND status='draft' AND ${guard} AND NOT EXISTS(SELECT 1 FROM student_groups WHERE id=?)`).bind(approvalKey,JSON.stringify(p.checks),now,p.id,...args,p.id),
   db.prepare("INSERT OR IGNORE INTO student_groups(id,name,subject,notes,created_at,updated_at) SELECT id,name,subject,?,?,? FROM matching_proposals WHERE id=? AND status='approved' AND approval_key=?").bind(groupNotes,now,now,p.id,approvalKey),
   ...rows.map(r=>db.prepare("INSERT OR IGNORE INTO group_members(group_id,student_id) SELECT group_id,? FROM matching_proposals WHERE id=? AND status='approved' AND approval_key=?").bind(r.student_id,p.id,approvalKey)),
   ...rows.map(r=>db.prepare("UPDATE requests SET group_id=?,status='matching' WHERE id=? AND group_id IS NULL AND EXISTS(SELECT 1 FROM matching_proposals WHERE id=? AND status='approved' AND approval_key=?)").bind(p.id,r.id,p.id,approvalKey)),
  ]);
  const result=await db.prepare('SELECT status,group_id FROM matching_proposals WHERE id=?').bind(p.id).first<{status:string;group_id:string|null}>();
  return result?.status==='approved'?reply({ok:true,groupId:result.group_id}):reply({error:'Un’altra modifica ha cambiato i partecipanti. Ricarica e ripeti il confronto.'},409);
 }catch{return reply({error:'Operazione non completata. Ricarica le proposte prima di riprovare.'},400);}
}
