import { z } from 'zod';
import { isRequestOwner } from '@/lib/request-admin';
import { bookingDb } from '@/lib/booking/runtime';
import { failure,LearningError,privateHeaders } from '@/lib/learning/access';
export async function GET(request:Request){
  if(!await isRequestOwner())return new Response(null,{status:403});
  try{
    const courseId=z.string().uuid().safeParse(new URL(request.url).searchParams.get('corso'));
    if(!courseId.success)throw new LearningError('Corso non valido.');
    const db=bookingDb();
    const course=await db.prepare('SELECT id,title,status FROM courses WHERE id=?').bind(courseId.data).first();
    if(!course)throw new LearningError('Corso non disponibile.',404);
    const [materials,enrollments,progress]=await Promise.all([
      db.prepare(`SELECT m.id,m.title,u.title AS module_title FROM course_materials m JOIN course_modules u ON u.id=m.module_id
        WHERE u.course_id=? AND m.status='published' ORDER BY u.position,u.id,m.position,m.id`).bind(courseId.data).all<{id:string;title:string;module_title:string}>(),
      db.prepare(`SELECT s.id,s.name,s.status AS student_status,e.status AS enrollment_status FROM course_enrollments e
        JOIN students s ON s.id=e.student_id WHERE e.course_id=? ORDER BY s.name,s.id`).bind(courseId.data).all<{id:string;name:string;student_status:string;enrollment_status:string}>(),
      db.prepare(`SELECT p.student_id,p.material_id,p.completed_at FROM material_progress p JOIN course_materials m ON m.id=p.material_id
        JOIN course_modules u ON u.id=m.module_id WHERE u.course_id=? AND m.status='published'
        AND EXISTS(SELECT 1 FROM course_enrollments e WHERE e.student_id=p.student_id AND e.course_id=u.course_id)`)
        .bind(courseId.data).all<{student_id:string;material_id:string;completed_at:string}>(),
    ]);
    return Response.json({course,materials:materials.results,students:enrollments.results.map(s=>{
      const completed=progress.results.filter(p=>p.student_id===s.id);
      return {...s,completed:completed.map(p=>({material_id:p.material_id,completed_at:p.completed_at})),
        last_completed_at:completed.map(p=>p.completed_at).sort().at(-1)||null};
    })},{headers:privateHeaders});
  }catch(error){return failure(error);}
}
