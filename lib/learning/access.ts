import { getAccount } from '@/lib/auth/session';
import { isRequestOwner } from '@/lib/request-admin';
import { bookingDb } from '@/lib/booking/runtime';

export class LearningError extends Error {
 constructor(message:string,public status=400){super(message);}
}
export const privateHeaders={'Cache-Control':'private, no-store','Vary':'Cookie'};
export function failure(error:unknown){
 return Response.json({error:error instanceof LearningError?error.message:'Servizio temporaneamente non disponibile. Riprova.'},{status:error instanceof LearningError?error.status:503,headers:privateHeaders});
}
export function sameOrigin(request:Request){if(request.headers.get('origin')!==new URL(request.url).origin)throw new LearningError('Richiesta non consentita.',403);}
export async function studentScope(request:Request){
 const preview=new URL(request.url).searchParams.get('anteprima');
 const db=bookingDb();
 if(preview){
  if(!await isRequestOwner())throw new LearningError('Accesso non consentito.',403);
  const student=await db.prepare("SELECT id,name FROM students WHERE id=? AND status='active'").bind(preview).first<{id:string;name:string}>();
  if(!student)throw new LearningError('Studente non disponibile.',404);
  return {students:[student],preview:true,userId:'tutor-preview',authVersion:-1};
 }
 const user=await getAccount(request);if(!user)throw new LearningError('Accedi alla piattaforma con email e password.',401);
 if(user.must_change_password)throw new LearningError('Imposta prima la tua password dalla pagina Account.',403);
 const students=await db.prepare("SELECT DISTINCT s.id,s.name FROM students s JOIN account_student_access a ON a.student_id=s.id JOIN accounts u ON u.id=a.account_id WHERE a.account_id=? AND a.status='active' AND s.status='active' AND u.status='active' ORDER BY s.name").bind(user.id).all<{id:string;name:string}>();
 return {students:students.results,preview:false,userId:user.id,authVersion:user.auth_version};
}
export async function authorizedMaterial(studentId:string,materialId:string){
 return bookingDb().prepare(`SELECT m.id,m.title,m.kind,m.body,m.object_key,m.filename,m.mime,m.size FROM course_materials m JOIN course_modules u ON u.id=m.module_id JOIN courses c ON c.id=u.course_id JOIN course_enrollments e ON e.course_id=c.id JOIN students s ON s.id=e.student_id WHERE m.id=? AND s.id=? AND s.status='active' AND e.status='active' AND c.status='published' AND m.status='published'`).bind(materialId,studentId).first<{id:string;title:string;kind:string;body:string;object_key:string|null;filename:string|null;mime:string|null;size:number|null}>();
}
