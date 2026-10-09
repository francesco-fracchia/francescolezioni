import { bookingDb } from '@/lib/booking/runtime';
import type { Assignment,Submission,HomeworkData } from './types';
export async function homeworkData(studentId:string,studentView:boolean):Promise<HomeworkData>{
 const db=bookingDb(),filter=studentView?"AND a.status='published'":'';
 const [assignments,submissions]=await Promise.all([
 db.prepare(`SELECT a.id,a.student_id,a.plan_id,CASE WHEN p.status='published' OR ?=0 THEN p.title ELSE NULL END plan_title,a.title,a.subject,a.instructions,a.due_date,a.status,a.filename,a.mime,a.size,a.version,a.created_at,a.updated_at FROM homework_assignments a LEFT JOIN study_plans p ON p.id=a.plan_id AND p.student_id=a.student_id WHERE a.student_id=? ${filter} ORDER BY a.created_at DESC,a.id LIMIT 51`).bind(studentView?1:0,studentId).all<Assignment>(),
 db.prepare(`SELECT s.id,s.assignment_id,s.attempt,s.body,s.filename,s.mime,s.size,CASE WHEN s.feedback_status='published' OR ?=0 THEN s.feedback ELSE '' END feedback,CASE WHEN s.feedback_status='published' OR ?=0 THEN s.feedback_status ELSE 'draft' END feedback_status,CASE WHEN s.feedback_status='published' OR ?=0 THEN s.review_status ELSE 'pending' END review_status,s.version,s.created_at,CASE WHEN s.feedback_status='published' OR ?=0 THEN s.reviewed_at ELSE NULL END reviewed_at FROM homework_submissions s WHERE s.assignment_id IN (SELECT a.id FROM homework_assignments a WHERE a.student_id=? ${filter} ORDER BY a.created_at DESC,a.id LIMIT 50) ORDER BY s.attempt DESC,s.id`).bind(...Array(4).fill(studentView?1:0),studentId).all<Submission>(),
 ]);return {assignments:assignments.results.slice(0,50),submissions:submissions.results,truncated:assignments.results.length>50};
}
