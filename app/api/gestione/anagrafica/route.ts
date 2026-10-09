import { isRequestOwner } from '@/lib/request-admin';
import { bookingDb } from '@/lib/booking/runtime';
import { z } from 'zod';
import type { Student } from '@/lib/students/types';
const student=z.object({id:z.string().uuid().optional(),kind:z.literal('student'),name:z.string().trim().min(2).max(100),email:z.string().email().max(254).transform(s=>s.toLowerCase()),phone:z.string().trim().max(40),contactName:z.string().trim().max(100),school:z.string().trim().max(200),notes:z.string().max(2000),notifications:z.boolean()});
const group=z.object({id:z.string().uuid().optional(),kind:z.literal('group'),name:z.string().trim().min(2).max(100),subject:z.string().trim().min(2).max(100),notes:z.string().max(2000),memberIds:z.array(z.string().uuid()).min(2).max(4).refine(ids=>new Set(ids).size===ids.length)});
export async function GET(){if(!await isRequestOwner())return new Response(null,{status:403});try{const db=bookingDb();const [students,groups,members]=await Promise.all([db.prepare('SELECT * FROM students ORDER BY name LIMIT 1000').all<Student>(),db.prepare('SELECT * FROM student_groups ORDER BY name LIMIT 500').all(),db.prepare('SELECT group_id,student_id FROM group_members').all<{group_id:string;student_id:string}>()]);return Response.json({students:students.results,groups:groups.results.map(g=>({...g,members:members.results.filter(m=>m.group_id===g.id).map(m=>students.results.find(s=>s.id===m.student_id)).filter(Boolean)}))},{headers:{'Cache-Control':'private, no-store'}});}catch{return Response.json({error:'Anagrafica temporaneamente non disponibile.'},{status:503});}}
export async function POST(request:Request){if(!await isRequestOwner())return new Response(null,{status:403});if(request.headers.get('origin')!==new URL(request.url).origin)return new Response(null,{status:403});try{const raw=await request.text();if(raw.length>7000)return new Response(null,{status:413});const p=z.discriminatedUnion('kind',[student,group]).parse(JSON.parse(raw));const db=bookingDb();const id=p.id||crypto.randomUUID();const now=new Date().toISOString();
 if(p.kind==='student'){
  if(p.id){const r=await db.prepare("UPDATE students SET name=?,email=?,phone=?,contact_name=?,school=?,notes=?,notifications=?,updated_at=? WHERE id=? AND status='active'").bind(p.name,p.email,p.phone,p.contactName,p.school,p.notes,Number(p.notifications),now,id).run();if(!r.meta.changes)return new Response(null,{status:409});}
  else await db.prepare("INSERT INTO students(id,name,email,phone,contact_name,school,notes,notifications,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(id,p.name,p.email,p.phone,p.contactName,p.school,p.notes,Number(p.notifications),now,now).run();
 }else{
  const rows=await db.prepare(`SELECT id,email FROM students WHERE id IN (${p.memberIds.map(()=>'?').join(',')}) AND status='active'`).bind(...p.memberIds).all<{id:string;email:string}>();if(rows.results.length!==p.memberIds.length||new Set(rows.results.map(s=>s.email)).size!==p.memberIds.length)return Response.json({error:'Scegli 2–4 studenti attivi con email diverse.'},{status:400});
  if(p.id&&!await db.prepare("SELECT id FROM student_groups WHERE id=? AND status='active'").bind(id).first())return new Response(null,{status:409});
  await db.batch([p.id?db.prepare("UPDATE student_groups SET name=?,subject=?,notes=?,updated_at=? WHERE id=? AND status='active'").bind(p.name,p.subject,p.notes,now,id):db.prepare('INSERT INTO student_groups(id,name,subject,notes,created_at,updated_at) VALUES(?,?,?,?,?,?)').bind(id,p.name,p.subject,p.notes,now,now),db.prepare('DELETE FROM group_members WHERE group_id=?').bind(id),...p.memberIds.map(s=>db.prepare('INSERT INTO group_members(group_id,student_id) VALUES(?,?)').bind(id,s))]);
 }
 return Response.json({ok:true,id},{status:p.id?200:201});
 }catch(e){return Response.json({error:String(e).includes('UNIQUE')?'Uno studente con questo nome e questa email è già registrato.':'Controlla i dati e riprova.'},{status:400});}}
export async function PATCH(request:Request){if(!await isRequestOwner())return new Response(null,{status:403});if(request.headers.get('origin')!==new URL(request.url).origin)return new Response(null,{status:403});try{const raw=await request.text();if(raw.length>200)return new Response(null,{status:413});const p=z.object({kind:z.enum(['student','group']),id:z.string().uuid(),action:z.enum(['archive','restore'])}).parse(JSON.parse(raw));const table=p.kind==='student'?'students':'student_groups';const result=await bookingDb().prepare(`UPDATE ${table} SET status=?,updated_at=? WHERE id=?`).bind(p.action==='archive'?'archived':'active',new Date().toISOString(),p.id).run();return result.meta.changes?Response.json({ok:true}):new Response(null,{status:404});}catch{return new Response(null,{status:400});}}
export async function PUT(request:Request){
 if(!await isRequestOwner())return new Response(null,{status:403});if(request.headers.get('origin')!==new URL(request.url).origin)return new Response(null,{status:403});
 try{
  const db=bookingDb();const {resolveStudent}=await import('@/lib/students/resolve');let linked=0;
  const bookings=await db.prepare('SELECT id,name,email FROM bookings WHERE student_id IS NULL LIMIT 200').all<{id:string;name:string;email:string}>();
  for(const b of bookings.results){const s=await resolveStudent(b);await db.prepare('UPDATE bookings SET student_id=? WHERE id=? AND student_id IS NULL').bind(s.id,b.id).run();linked++;}
  const lessons=await db.prepare('SELECT id,name,email,subject FROM scheduled_lessons WHERE student_id IS NULL AND group_id IS NULL LIMIT 200').all<{id:string;name:string;email:string;subject:string}>();
  for(const l of lessons.results){
   const payments=await db.prepare('SELECT id,name,email FROM lesson_payments WHERE lesson_id=?').bind(l.id).all<{id:string;name:string;email:string}>();
   const people=await Promise.all((payments.results.length?payments.results:[l]).map(resolveStudent));
   const updates=payments.results.map((p,i)=>db.prepare('UPDATE lesson_payments SET student_id=? WHERE id=? AND student_id IS NULL').bind(people[i].id,p.id));
   if(people.length===1)updates.push(db.prepare('UPDATE scheduled_lessons SET student_id=? WHERE id=? AND student_id IS NULL').bind(people[0].id,l.id));
   else{const id=crypto.randomUUID();const now=new Date().toISOString();updates.push(db.prepare('UPDATE scheduled_lessons SET group_id=? WHERE id=? AND group_id IS NULL').bind(id,l.id),db.prepare('INSERT INTO student_groups(id,name,subject,created_at,updated_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM scheduled_lessons WHERE id=? AND group_id=?)').bind(id,l.name,l.subject,now,now,l.id,id),...people.map(s=>db.prepare('INSERT INTO group_members(group_id,student_id) SELECT ?,? WHERE EXISTS(SELECT 1 FROM student_groups WHERE id=?)').bind(id,s.id,id)));}
   await db.batch(updates);linked++;
  }
  return Response.json({ok:true,linked});
 }catch{return Response.json({error:'Recupero interrotto. Puoi riprovare senza duplicare le schede.'},{status:503});}
}
