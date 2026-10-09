import { isRequestOwner } from '@/lib/request-admin';
import { bookingDb } from '@/lib/booking/runtime';
import { requestDetails,detailText,type RequestRow } from '@/lib/requests/types';
import { z } from 'zod';

const schema=z.discriminatedUnion('kind',[
 z.object({id:z.string().uuid(),kind:z.literal('new'),name:z.string().trim().min(2).max(100),contactName:z.string().trim().max(100).default('')}),
 z.object({id:z.string().uuid(),kind:z.literal('student'),studentId:z.string().uuid()}),
 z.object({id:z.string().uuid(),kind:z.literal('group'),studentId:z.string().uuid(),groupId:z.string().uuid()}),
]);
export async function POST(request:Request) {
 if(!await isRequestOwner())return new Response(null,{status:403});
 if(request.headers.get('origin')!==new URL(request.url).origin)return new Response(null,{status:403});
 try {
  const raw=await request.text();if(raw.length>1000)return new Response(null,{status:413});
  const parsed=schema.safeParse(JSON.parse(raw));if(!parsed.success)return Response.json({error:'Controlla il collegamento alla scheda.'},{status:400});
  const p=parsed.data;const db=bookingDb();
  const row=await db.prepare('SELECT * FROM requests WHERE id=?').bind(p.id).first<RequestRow>();
  if(!row)return new Response(null,{status:404});
  if(row.student_id)return Response.json({ok:true,studentId:row.student_id,groupId:row.group_id,alreadyLinked:true});
  let studentId='';let groupId:string|null=null;
  if(p.kind==='new') {
   const email=row.email.trim().toLowerCase();const details=requestDetails(row.details);const now=new Date().toISOString();
   await db.batch([
    db.prepare('INSERT OR IGNORE INTO students(id,name,email,phone,contact_name,school,created_at,updated_at) SELECT ?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM requests WHERE id=? AND student_id IS NULL)').bind(crypto.randomUUID(),p.name,email,detailText(details,'phone').slice(0,40),p.contactName,detailText(details,'institution').slice(0,200),now,now,p.id),
    db.prepare("UPDATE requests SET student_id=(SELECT id FROM students WHERE name=? AND email=? AND status='active') WHERE id=? AND student_id IS NULL AND EXISTS(SELECT 1 FROM students WHERE name=? AND email=? AND status='active')").bind(p.name,email,p.id,p.name,email),
   ]);
  } else {
   studentId=p.studentId;
   if(!await db.prepare("SELECT id FROM students WHERE id=? AND status='active'").bind(studentId).first())return Response.json({error:'Seleziona uno studente attivo.'},{status:409});
   if(p.kind==='group') {
    groupId=p.groupId;
    const {resolveGroup}=await import('@/lib/students/resolve');
    const g=await resolveGroup(groupId);
    if(!g.members.some(s=>s.id===studentId))return Response.json({error:'Il referente deve essere un membro del gruppo.'},{status:400});
   }
   // One winner per request; retrying never creates duplicate links or appointments.
   await db.prepare(`UPDATE requests SET student_id=?,group_id=? WHERE id=? AND student_id IS NULL AND EXISTS(SELECT 1 FROM students WHERE id=? AND status='active')${groupId?" AND EXISTS(SELECT 1 FROM student_groups WHERE id=? AND status='active') AND EXISTS(SELECT 1 FROM group_members WHERE group_id=? AND student_id=?)":''}`).bind(studentId,groupId,p.id,studentId,...(groupId?[groupId,groupId,studentId]:[])).run();
  }
  const linked=await db.prepare('SELECT student_id,group_id FROM requests WHERE id=?').bind(p.id).first<{student_id:string|null;group_id:string|null}>();
  if(!linked?.student_id)return Response.json({error:'Scheda non collegata. Se già archiviata, ripristinala nell’anagrafica.'},{status:409});
  return Response.json({ok:true,studentId:linked.student_id,groupId:linked.group_id});
 }catch(e){return Response.json({error:String(e).includes('GROUP_INACTIVE')?'Il gruppo deve avere 2–4 studenti attivi con email diverse.':'Collegamento non riuscito. Riprova.'},{status:400});}
}
export async function PATCH(request:Request) {
 if(!await isRequestOwner())return new Response(null,{status:403});
 if(request.headers.get('origin')!==new URL(request.url).origin)return new Response(null,{status:403});
 try {
  const raw=await request.text();if(raw.length>400)return new Response(null,{status:413});
  const p=z.object({id:z.string().uuid(),studentId:z.string().uuid(),groupId:z.string().uuid().nullable()}).parse(JSON.parse(raw));
  const r=await bookingDb().prepare('UPDATE requests SET student_id=NULL,group_id=NULL WHERE id=? AND student_id=? AND group_id IS ?').bind(p.id,p.studentId,p.groupId).run();
  return r.meta.changes?Response.json({ok:true}):Response.json({error:'Il collegamento è cambiato: ricarica le richieste.'},{status:409});
 }catch{return Response.json({error:'Collegamento non rimosso. Riprova.'},{status:400});}
}
