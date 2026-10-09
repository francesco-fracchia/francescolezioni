import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
const sql=new DatabaseSync(':memory:');
for(const f of (await readdir(new URL('../drizzle/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort())sql.exec(await readFile(new URL('../drizzle/'+f,import.meta.url),'utf8'));
const db={prepare(query){const bind=(...args)=>({async first(){return sql.prepare(query).get(...args)||null;},async all(){return {results:sql.prepare(query).all(...args)};},async run(){const r=sql.prepare(query).run(...args);return {meta:{changes:Number(r.changes)}};}});return {bind,...bind()};}};
const objects=new Map();const env={BUCKET:{async put(key,stream){objects.set(key,new Uint8Array(await new Response(stream).arrayBuffer()));},async delete(key){objects.delete(key);},async get(key,{range}={}){const bytes=objects.get(key);if(!bytes)return null;const match=range?.get('range')?.match(/^bytes=(\d+)-(\d+)$/);const offset=match?Number(match[1]):0;const length=match?Number(match[2])-offset+1:bytes.length;return {body:bytes.slice(offset,offset+length),size:bytes.length,httpEtag:'"test"',range:{offset,length}};}}};
let user=null;let owner=false;
globalThis.__learning={getAccount:async()=>user?{id:user.userId,must_change_password:0,auth_version:0}:null,isRequestOwner:async()=>owner,bookingDb:()=>db,env};
async function compile(path,replace=s=>s){const s=replace(await readFile(new URL('../'+path,import.meta.url),'utf8')).replace("import { getAccount } from '@/lib/auth/session';",'const {getAccount}=globalThis.__learning;').replace(/import \{ isRequestOwner \} from '@\/lib\/request-admin';/g,'const {isRequestOwner}=globalThis.__learning;').replace(/import \{ bookingDb \} from '@\/lib\/booking\/runtime';/g,'const {bookingDb}=globalThis.__learning;').replace(/import \{ env \} from '@\/lib\/runtime-env';/g,'const {env}=globalThis.__learning;').replace("from 'zod'",'from '+JSON.stringify(import.meta.resolve('zod')));return 'data:text/javascript;base64,'+Buffer.from(ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText).toString('base64');}
const access=await compile('lib/learning/access.ts');
const fileModule=await compile('lib/learning/files.ts',s=>s.replace("from './access'",'from '+JSON.stringify(access)));
const replace=s=>s.replace("from '@/lib/learning/access'",'from '+JSON.stringify(access)).replace("from '@/lib/learning/files'",'from '+JSON.stringify(fileModule));
const student=await import(await compile('app/api/studente/route.ts',replace));
const files=await import(await compile('app/api/studente/materiali/route.ts',replace));
const admin=await import(await compile('app/api/gestione/formazione/route.ts',replace));
const adminFiles=await import(await compile('app/api/gestione/formazione/materiali/route.ts',replace));
const progressView=await import(await compile('app/api/gestione/formazione/avanzamento/route.ts',replace));
const base='https://site.example';
const req=(path='/api/studente',method='GET',body,origin=base)=>new Request(base+path,{method,headers:{Origin:origin,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
const ids=Array.from({length:8},()=>crypto.randomUUID());const [a,b,c,course,module,material,lesson,payment]=ids;const now=new Date().toISOString();
for(const [id,name,email] of [[a,'Anna','contact@example.com'],[b,'Bruno','contact@example.com'],[c,'Carla','other@example.com']])sql.prepare('INSERT INTO students(id,name,email,notes,created_at,updated_at) VALUES(?,?,?,\'PRIVATE NOTE\',?,?)').run(id,name,email,now,now);
function grant(studentId){sql.prepare("INSERT OR IGNORE INTO accounts(id,name,email,role,password_hash,must_change_password,created_at,updated_at) VALUES('parent','Parent','parent@example.com','guardian','test-only',0,?,?)").run(now,now);sql.prepare("INSERT INTO account_student_access(account_id,student_id,status,created_at) VALUES('parent',?,'active',?) ON CONFLICT(account_id,student_id) DO UPDATE SET status='active'").run(studentId,now);}
async function command(body){const r=await admin.POST(req('/api/gestione/formazione','POST',body));assert.equal(r.status,200,await r.clone().text());return r;}
try{
 assert.equal((await student.GET(req())).status,401);assert.equal((await admin.GET()).status,403);
 owner=true;user={userId:'owner',email:'owner@example.com'};
 await command({kind:'course',title:'Analisi 1',subject:'Matematica',description:'Test',status:'draft'});
 const created=sql.prepare('SELECT id FROM courses').get().id;
 await command({kind:'module',courseId:created,title:'Limiti',position:0});const mod=sql.prepare('SELECT id FROM course_modules').get().id;
 await command({kind:'material',moduleId:mod,title:'Esercizi',body:'Contenuto riservato',status:'draft',position:0});const mat=sql.prepare('SELECT id FROM course_materials').get().id;
 await command({kind:'enrollment',studentId:a,courseId:created,status:'active'});
 grant(a);grant(b);
 assert.equal((await admin.POST(req('/api/gestione/formazione','POST',{kind:'revoke-access',id:crypto.randomUUID()},'https://evil.example'))).status,403);
 const form=new FormData();form.set('moduleId',mod);form.set('title','Dispensa');form.set('position','1');form.set('file',new File(['%PDF-1.7\nunit test'],'test.pdf',{type:'application/pdf'}));
 assert.equal((await progressView.GET(req('/api/gestione/formazione/avanzamento?corso='+created))).status,200);
 const upload=await admin.PUT(new Request(base+'/api/gestione/formazione',{method:'PUT',headers:{Origin:base},body:form}));assert.equal(upload.status,201,await upload.clone().text());const fileId=(await upload.json()).id;assert.equal((await adminFiles.GET(req('/api/gestione/formazione/materiali?materiale='+fileId))).status,200);
 const bad=new FormData();bad.set('moduleId',mod);bad.set('title','HTML');bad.set('position','1');bad.set('file',new File(['<script>bad</script>'],'bad.html',{type:'text/html'}));assert.equal((await admin.PUT(new Request(base+'/api/gestione/formazione',{method:'PUT',headers:{Origin:base},body:bad}))).status,400);
 owner=false;assert.equal((await adminFiles.GET(req('/api/gestione/formazione/materiali?materiale='+fileId))).status,403);assert.equal((await progressView.GET(req('/api/gestione/formazione/avanzamento?corso='+created))).status,403);user={userId:'unapproved',email:'contact@example.com'};assert.equal((await (await student.GET(req())).json()).students.length,0); // Contact address is never an entitlement.
 user={userId:'parent',email:'parent@example.com'};
 let r=await student.GET(req());let d=await r.json();assert.equal(d.students.length,2);assert.equal(d.courses.length,0);assert.equal(r.headers.get('Cache-Control'),'private, no-store');
 assert.equal((await student.GET(req('/api/studente?studente='+c))).status,403);assert.equal((await student.GET(req('/api/studente?anteprima='+c))).status,403);
 const fileReq=()=>req(`/api/studente/materiali?studente=${a}&materiale=${fileId}`);
 assert.equal((await files.GET(fileReq())).status,404);
 owner=true;await command({kind:'course',id:created,title:'Analisi 1',subject:'Matematica',description:'Test',status:'published'});await command({kind:'material-status',id:mat,status:'published',position:0});await command({kind:'material-status',id:fileId,status:'published',position:1,title:'Dispensa rinominata'});assert.equal(sql.prepare('SELECT title,filename FROM course_materials WHERE id=?').get(fileId).title,'Dispensa rinominata');assert.equal(sql.prepare('SELECT filename FROM course_materials WHERE id=?').get(fileId).filename,'test.pdf');owner=false;
 r=await files.GET(fileReq());assert.equal(r.status,200);assert.equal(r.headers.get('Content-Type'),'application/pdf');assert.ok(r.headers.get('Content-Disposition').startsWith('attachment'));assert.equal(await r.text(),'%PDF-1.7\nunit test');
 const partial=await files.GET(new Request(fileReq(),{headers:{Range:'bytes=0-5'}}));assert.equal(partial.status,206);assert.equal(await partial.text(),'%PDF-1');assert.ok(partial.headers.get('Content-Range').startsWith('bytes 0-5/'));
 let progress=()=>student.POST(req('/api/studente','POST',{studentId:a,materialId:mat,completed:true}));assert.equal((await progress()).status,200);assert.equal((await progress()).status,200);assert.equal(sql.prepare('SELECT count(*) n FROM material_progress').get().n,1);
 owner=true;const report=await (await progressView.GET(req('/api/gestione/formazione/avanzamento?corso='+created))).json();assert.equal(report.materials.length,2);assert.equal(report.students[0].completed.length,1);owner=false;
 assert.equal((await student.POST(req('/api/studente','POST',{studentId:b,materialId:mat,completed:true}))).status,403);
 sql.prepare("INSERT INTO scheduled_lessons(id,series_id,name,email,subject,starts_at,ends_at,mode,notes,status,created_at,payment_method) VALUES(?,?,'SECRET GROUP','secret@example.com','Analisi 1',?,?,'Online','PRIVATE NOTE','planned',?,'online')").run(lesson,lesson,now,now,now);
 for(const [sid,n] of [[a,'Anna'],[c,'Carla']])sql.prepare("INSERT INTO lesson_payments(id,lesson_id,access_token,student_id,name,email,amount,status,created_at) VALUES(?,?,?, ?,?,'private@example.com',1500,'awaiting',?)").run(crypto.randomUUID(),lesson,'SECRET TOKEN',sid,n,now);
 d=await (await student.GET(req('/api/studente?studente='+a))).json();assert.equal(d.lessons.length,1);assert.equal(d.lessons[0].amount,1500);const serialized=JSON.stringify(d);for(const secret of ['PRIVATE NOTE','SECRET GROUP','SECRET TOKEN','Carla','secret@example.com'])assert.ok(!serialized.includes(secret),secret);
 d=await (await student.GET(req('/api/studente?studente='+b))).json();assert.equal(d.lessons.length,0);assert.equal(d.materials.length,0);assert.equal(d.nextAppointment,null);
 // The next appointment must survive the history cap, without leaking another student's lessons.
 const nearest=crypto.randomUUID(),other=crypto.randomUUID();
 const lessonInsert=sql.prepare("INSERT INTO scheduled_lessons(id,series_id,name,email,subject,starts_at,ends_at,mode,notes,status,created_at,payment_method,student_id) VALUES(?,?,'SECRET GROUP','secret@example.com','Matematica',?,?,'Online','PRIVATE NOTE',?,?,'online',?)");
 function addLesson(id,start,status='planned',studentId=a){lessonInsert.run(id,id,new Date(start).toISOString(),new Date(start+3300000).toISOString(),status,now,studentId);}
 const nextStart=Date.now()+86400000;
 addLesson(nearest,nextStart,'planned',null);
 sql.prepare("INSERT INTO lesson_payments(id,lesson_id,access_token,student_id,name,email,amount,status,created_at) VALUES(?,?,?,?,'Anna','private@example.com',1500,'awaiting',?)").run(crypto.randomUUID(),nearest,'SECRET TOKEN',a,now);
 addLesson(other,nextStart-7200000,'planned',c);addLesson(crypto.randomUUID(),nextStart-14400000,'cancelled');
 sql.prepare('UPDATE scheduled_lessons SET video_url=? WHERE id=?').run('https://meet.google.com/abc-defg-hij',nearest);
 sql.prepare('UPDATE scheduled_lessons SET video_url=? WHERE id=?').run('https://meet.google.com/xxx-yyyy-zzz',other);
 for(let i=0;i<201;i++)addLesson(crypto.randomUUID(),nextStart+(i+2)*86400000);
 d=await (await student.GET(req('/api/studente?studente='+a))).json();assert.equal(d.lessons.length,200);assert.equal(d.truncated,true);assert.ok(!d.lessons.some(l=>l.id===nearest));assert.equal(d.nextAppointment.id,nearest);assert.equal(d.nextAppointment.kind,'lesson');
 assert.deepEqual(Object.keys(d.nextAppointment).sort(),['ends_at','id','kind','mode','starts_at','status','subject','video_url']);assert.equal(d.nextAppointment.video_url,'https://meet.google.com/abc-defg-hij');assert.ok(!JSON.stringify(d).includes('xxx-yyyy-zzz'));assert.equal(d.materials.find(m=>m.id===mat).created_at,sql.prepare('SELECT created_at FROM course_materials WHERE id=?').get(mat).created_at);
 d=await (await student.GET(req('/api/studente?studente='+b))).json();assert.equal(d.nextAppointment,null);
 const booked=crypto.randomUUID(),slot=crypto.randomUUID();
 sql.prepare("INSERT INTO booking_slots(id,starts_at,ends_at,mode,status) VALUES(?,?,?,'Lodi','available')").run(slot,new Date(nextStart-10800000).toISOString(),new Date(nextStart-7500000).toISOString());
 sql.prepare("INSERT INTO bookings(id,slot_id,access_token,name,email,subject,status,created_at,student_id) VALUES(?,?,'SECRET TOKEN','Anna','private@example.com','Informatica','pending',?,?)").run(booked,slot,now,a);
 d=await (await student.GET(req('/api/studente?studente='+a))).json();assert.equal(d.nextAppointment.id,nearest);
 sql.prepare("UPDATE bookings SET status='confirmed' WHERE id=?").run(booked);
 sql.prepare('UPDATE bookings SET video_url=? WHERE id=?').run('https://meet.google.com/mno-pqrs-tuv',booked);
 d=await (await student.GET(req('/api/studente?studente='+a))).json();assert.equal(d.nextAppointment.id,booked);assert.equal(d.nextAppointment.kind,'booking');assert.equal(d.nextAppointment.video_url,null);
 sql.prepare("UPDATE booking_slots SET mode='Online' WHERE id=?").run(slot);
 d=await (await student.GET(req('/api/studente?studente='+a))).json();assert.equal(d.nextAppointment.video_url,'https://meet.google.com/mno-pqrs-tuv');
 sql.prepare("UPDATE bookings SET status='cancelled' WHERE id=?").run(booked);
 d=await (await student.GET(req('/api/studente?studente='+a))).json();assert.equal(d.bookings.find(b=>b.id===booked).video_url,null);assert.equal(d.nextAppointment.id,nearest);
 sql.prepare("UPDATE bookings SET status='confirmed' WHERE id=?").run(booked);
 owner=true;d=await (await student.GET(req('/api/studente?anteprima='+a))).json();assert.equal(d.preview,true);assert.equal(d.nextAppointment.id,booked);owner=false;
 user={userId:'imposter',email:'parent@example.com'};assert.equal((await (await student.GET(req())).json()).students.length,0); // Stable identity cannot be reclaimed by matching email.
 user={userId:'parent',email:'changed@example.com'};assert.equal((await (await student.GET(req())).json()).students.length,2); // Stable identity survives email change.
 owner=true;sql.prepare("UPDATE account_student_access SET status='revoked' WHERE student_id=?").run(a);owner=false;assert.equal((await files.GET(fileReq())).status,403);assert.equal((await progress()).status,403);
 owner=true;grant(a);owner=false;user={userId:'parent',email:'parent@example.com'};assert.equal((await files.GET(fileReq())).status,200);
 owner=true;await command({kind:'enrollment',studentId:a,courseId:created,status:'revoked'});owner=false;assert.equal((await files.GET(fileReq())).status,404);assert.equal((await progress()).status,403);
 owner=true;await command({kind:'enrollment',studentId:a,courseId:created,status:'active'});await command({kind:'material-status',id:fileId,status:'archived',position:1});const reportAfterArchive=await (await progressView.GET(req('/api/gestione/formazione/avanzamento?corso='+created))).json();assert.equal(reportAfterArchive.materials.length,1);assert.equal(reportAfterArchive.students[0].completed.length,1);owner=false;assert.equal((await files.GET(fileReq())).status,404);
 sql.prepare("UPDATE students SET status='archived' WHERE id=?").run(a);assert.equal((await student.GET(req('/api/studente?studente='+a))).status,403);
 owner=true;sql.prepare("UPDATE students SET status='active' WHERE id=?").run(a);assert.equal((await student.POST(req('/api/studente?anteprima='+a,'POST',{studentId:a,materialId:mat,completed:true}))).status,403);
 assert.equal((await student.POST(req('/api/studente','POST',{studentId:a,materialId:mat,completed:true},'https://evil.example'))).status,403);
 console.log('PASS: explicit grants, stable identities, multi-child guardian, per-student history and balances, draft isolation, protected R2 files, revocations, progress persistence, owner preview and CSRF.');
}finally{delete globalThis.__learning;sql.close();}
