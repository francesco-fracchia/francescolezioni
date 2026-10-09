import { bookingDb } from '@/lib/booking/runtime';
import type { Plan,Summary,StudyData } from './types';
// Historical participation is authoritative, never the group's present members.
export const lessonParticipant="(l.student_id=? OR EXISTS(SELECT 1 FROM lesson_payments participant WHERE participant.lesson_id=l.id AND participant.student_id=?))";
export async function studyData(studentId:string,publishedOnly:boolean):Promise<StudyData>{
 const db=bookingDb();const [plans,summaries]=await Promise.all([
 db.prepare(`SELECT id,student_id,title,subject,objective,target_date,starting_point,topics,next_steps,status,version,created_at,updated_at FROM study_plans WHERE student_id=? ${publishedOnly?"AND status='published'":''} ORDER BY updated_at DESC,id LIMIT 51`).bind(studentId).all<Plan>(),
 db.prepare(`SELECT r.id,r.student_id,r.appointment_kind,r.appointment_id,r.title,r.topics,r.practice,r.next_steps,r.status,r.version,r.created_at,r.updated_at,COALESCE(l.subject,b.subject) subject,COALESCE(l.starts_at,slot.starts_at) starts_at,COALESCE(l.ends_at,slot.ends_at) ends_at,COALESCE(l.status,b.status) appointment_status FROM lesson_summaries r LEFT JOIN scheduled_lessons l ON r.appointment_kind='lesson' AND l.id=r.appointment_id LEFT JOIN bookings b ON r.appointment_kind='booking' AND b.id=r.appointment_id LEFT JOIN booking_slots slot ON slot.id=b.slot_id WHERE r.student_id=? ${publishedOnly?"AND r.status='published'":''} AND ((r.appointment_kind='lesson' AND ${lessonParticipant}) OR (r.appointment_kind='booking' AND b.student_id=?)) ORDER BY COALESCE(l.starts_at,slot.starts_at) DESC,r.id LIMIT 101`).bind(studentId,studentId,studentId,studentId).all<Summary>(),
 ]);return {plans:plans.results.slice(0,50),summaries:summaries.results.slice(0,100),truncated:{plans:plans.results.length>50,summaries:summaries.results.length>100}};
}
