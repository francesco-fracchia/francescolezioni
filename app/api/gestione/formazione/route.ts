import { env } from '@/lib/runtime-env';
import { z } from 'zod';
import { isRequestOwner } from '@/lib/request-admin';
import { bookingDb } from '@/lib/booking/runtime';
import { failure,LearningError,privateHeaders,sameOrigin } from '@/lib/learning/access';
const id=z.string().uuid();const title=z.string().trim().min(2).max(150);const status=z.enum(['draft','published','archived']);
const position=z.number().int().min(0).max(999);
const commands=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('access'),studentId:id,email:z.string().trim().email().max(254).transform(s=>s.toLowerCase()),role:z.enum(['student','guardian'])}),
 z.object({kind:z.literal('revoke-access'),id}),
 z.object({kind:z.literal('course'),id:id.optional(),title,subject:title,description:z.string().max(3000),status}),
 z.object({kind:z.literal('module'),id:id.optional(),courseId:id,title,position}),
 z.object({kind:z.literal('material'),id:id.optional(),moduleId:id,title,body:z.string().trim().min(1).max(30000),status,position}),
 z.object({kind:z.literal('material-status'),id,status,position,title:title.optional()}),
 z.object({kind:z.literal('enrollment'),studentId:id,courseId:id,status:z.enum(['active','revoked'])}),
]);
export async function GET(){if(!await isRequestOwner())return new Response(null,{status:403});try{
 const db=bookingDb();const [students,access,courses,modules,materials,enrollments]=await Promise.all([
 db.prepare('SELECT id,name,status FROM students ORDER BY name').all(),
 db.prepare('SELECT id,student_id,email,role,status,user_id FROM student_access ORDER BY email').all(),
 db.prepare('SELECT * FROM courses ORDER BY updated_at DESC,id').all(),
 db.prepare('SELECT * FROM course_modules ORDER BY position,id').all(),
 db.prepare('SELECT id,module_id,title,kind,body,filename,size,status,position FROM course_materials ORDER BY position,id').all(),
 db.prepare('SELECT student_id,course_id,status FROM course_enrollments').all(),
 ]);return Response.json({students:students.results,access:access.results,courses:courses.results,modules:modules.results,materials:materials.results,enrollments:enrollments.results},{headers:privateHeaders});
 }catch(e){return failure(e);}}
export async function POST(request:Request){if(!await isRequestOwner())return new Response(null,{status:403});try{
 sameOrigin(request);const raw=await request.text();if(raw.length>40000)throw new LearningError('Contenuto troppo grande.',413);
 const parsed=commands.safeParse(JSON.parse(raw));if(!parsed.success)throw new LearningError('Controlla i campi richiesti.');const p=parsed.data;
 const db=bookingDb();const now=new Date().toISOString();const recordId=('id' in p?p.id:undefined)||crypto.randomUUID();
 async function exists(table:string,value:string,active=false){if(!await db.prepare(`SELECT id FROM ${table} WHERE id=?${active?" AND status='active'":''}`).bind(value).first())throw new LearningError('La scheda selezionata non è disponibile.',404);}
 if(p.kind==='access'||p.kind==='revoke-access'){
  throw new LearningError('Gli accessi si gestiscono dalla pagina Account e accessi.',409);
 }else if(p.kind==='course'){
  if(p.id){await exists('courses',p.id);await db.prepare('UPDATE courses SET title=?,subject=?,description=?,status=?,updated_at=? WHERE id=?').bind(p.title,p.subject,p.description,p.status,now,p.id).run();}
  else await db.prepare('INSERT INTO courses(id,title,subject,description,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').bind(recordId,p.title,p.subject,p.description,p.status,now,now).run();
 }else if(p.kind==='module'){
  await exists('courses',p.courseId);
  if(p.id){if(!await db.prepare('SELECT id FROM course_modules WHERE id=? AND course_id=?').bind(p.id,p.courseId).first())throw new LearningError('Modulo non disponibile.',404);await db.prepare('UPDATE course_modules SET title=?,position=? WHERE id=?').bind(p.title,p.position,p.id).run();}
  else await db.prepare('INSERT INTO course_modules(id,course_id,title,position) VALUES(?,?,?,?)').bind(recordId,p.courseId,p.title,p.position).run();
 }else if(p.kind==='material'){
  await exists('course_modules',p.moduleId);
  if(p.id){const r=await db.prepare("UPDATE course_materials SET title=?,body=?,status=?,position=? WHERE id=? AND module_id=? AND kind='text'").bind(p.title,p.body,p.status,p.position,p.id,p.moduleId).run();if(!r.meta.changes)throw new LearningError('Materiale non disponibile.',404);}
  else await db.prepare("INSERT INTO course_materials(id,module_id,title,kind,body,status,position,created_at) VALUES(?,?,?,'text',?,?,?,?)").bind(recordId,p.moduleId,p.title,p.body,p.status,p.position,now).run();
 }else if(p.kind==='material-status'){
  await exists('course_materials',p.id);await db.prepare('UPDATE course_materials SET status=?,position=?,title=COALESCE(?,title) WHERE id=?').bind(p.status,p.position,p.title??null,p.id).run();
 }else{
  await exists('students',p.studentId,true);await exists('courses',p.courseId);
  await db.prepare('INSERT INTO course_enrollments(student_id,course_id,status,created_at) VALUES(?,?,?,?) ON CONFLICT(student_id,course_id) DO UPDATE SET status=excluded.status').bind(p.studentId,p.courseId,p.status,now).run();
 }
 return Response.json({ok:true,id:recordId},{headers:privateHeaders});
 }catch(e){if(e instanceof SyntaxError)return failure(new LearningError('Dati non validi.'));return failure(e);}}
export async function PUT(request:Request){if(!await isRequestOwner())return new Response(null,{status:403});let key:string|undefined;try{
 sameOrigin(request);if(!env.BUCKET)throw new LearningError('Archivio file temporaneamente non disponibile.',503);
 const length=Number(request.headers.get('content-length'));if(length>52*1024*1024)throw new LearningError('Il file supera 50 MB.',413);
 if(!request.body)throw new LearningError('Scegli un file.');
 let received=0;
 const bounded=request.body.pipeThrough(new TransformStream<Uint8Array,Uint8Array>({transform(chunk,controller){received+=chunk.byteLength;if(received>52*1024*1024)throw new LearningError('Il file supera 50 MB.',413);controller.enqueue(chunk);}}));
 const form=await new Response(bounded,{headers:{'Content-Type':request.headers.get('content-type')||''}}).formData();const file=form.get('file');const moduleId=id.safeParse(form.get('moduleId'));const label=title.safeParse(form.get('title'));const order=position.safeParse(Number(form.get('position')));
 if(!(file instanceof File)||!moduleId.success||!label.success||!order.success)throw new LearningError('Scegli modulo, titolo e file.');
 const allowed=['application/pdf','image/png','image/jpeg','video/mp4','video/webm'];
 if(!allowed.includes(file.type)||file.size===0)throw new LearningError('Sono ammessi PDF, PNG, JPEG, MP4 e WebM.');
 if(file.size>50*1024*1024)throw new LearningError('Il file supera 50 MB.',413);
 const db=bookingDb();if(!await db.prepare('SELECT id FROM course_modules WHERE id=?').bind(moduleId.data).first())throw new LearningError('Modulo non disponibile.',404);
 const recordId=crypto.randomUUID();key=`learning/${recordId}`;
 await env.BUCKET.put(key,file.stream(),{httpMetadata:{contentType:file.type}});
 await db.prepare("INSERT INTO course_materials(id,module_id,title,kind,object_key,filename,mime,size,status,position,created_at) VALUES(?,?,?,?,?,?,?,?,'draft',?,?)").bind(recordId,moduleId.data,label.data,file.type.startsWith('video/')?'video':'file',key,file.name.slice(0,200),file.type,file.size,order.data,new Date().toISOString()).run();
 return Response.json({ok:true,id:recordId},{status:201,headers:privateHeaders});
 }catch(e){if(key)try{await env.BUCKET?.delete(key);}catch{/* Failed storage cleanup never makes a file public. */}return failure(e);}}
