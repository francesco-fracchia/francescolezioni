import {bookingDb} from '@/lib/booking/runtime';
import {isRequestOwner} from '@/lib/request-admin';
import {failure,LearningError,privateHeaders} from '@/lib/learning/access';
import {dayWindow,romeDay} from '@/lib/management/operations';
export async function GET(){try{
 if(!await isRequestOwner())throw new LearningError('Accesso riservato al tutor.',403);const now=new Date().toISOString(),day=romeDay(new Date(now)),{start,end}=dayWindow(day),db=bookingDb();
 const [appointments,followups,corrections,saldos]=await Promise.all([
 db.prepare(`SELECT id,'lesson' kind,name,subject,mode,starts_at,ends_at,student_id,NULL request_id FROM scheduled_lessons WHERE status='planned' AND starts_at<? AND ends_at>?
 UNION ALL SELECT b.id,'booking',b.name,b.subject,s.mode,s.starts_at,s.ends_at,b.student_id,NULL FROM bookings b JOIN booking_slots s ON s.id=b.slot_id WHERE b.status='confirmed' AND s.starts_at<? AND s.ends_at>?
 UNION ALL SELECT id,'consultation',name,subject,mode,starts_at,ends_at,NULL,request_id FROM consultations WHERE status='confirmed' AND starts_at<? AND ends_at>?
 ORDER BY starts_at,id LIMIT 101`).bind(end,start,end,start,end,start).all(),
 db.prepare(`SELECT r.id,r.name,r.subject,r.status,f.next_action,f.next_action_date FROM requests r LEFT JOIN request_followups f ON f.request_id=r.id WHERE r.status!='closed' AND (r.status='new' OR (f.next_action!='' AND f.next_action_date<=?)) ORDER BY CASE WHEN f.next_action_date IS NOT NULL THEN 0 ELSE 1 END,f.next_action_date,r.created_at,r.id LIMIT 101`).bind(day).all(),
 db.prepare(`SELECT h.id,h.assignment_id,a.student_id,s.name,a.title,h.created_at FROM homework_submissions h JOIN homework_assignments a ON a.id=h.assignment_id JOIN students s ON s.id=a.student_id WHERE s.status='active' AND a.status='published' AND (h.review_status='pending' OR h.feedback_status='draft') AND NOT EXISTS(SELECT 1 FROM homework_submissions n WHERE n.assignment_id=h.assignment_id AND n.attempt>h.attempt) ORDER BY h.created_at,h.id LIMIT 101`).all(),
 db.prepare(`SELECT p.id AS id,p.name,p.amount,'lesson' kind,p.student_id FROM lesson_payments p JOIN scheduled_lessons l ON l.id=p.lesson_id WHERE l.status='planned' AND l.payment_method IN ('cash','pos') AND p.status='awaiting' AND p.amount>0
 UNION ALL SELECT p.id,s.name,p.amount,'package',p.student_id FROM lesson_packages p JOIN students s ON s.id=p.student_id WHERE p.status='awaiting' AND s.status='active' ORDER BY kind,id LIMIT 101`).all(),
 ]);
 return Response.json({day,now,appointments:appointments.results.slice(0,100),followups:followups.results.slice(0,100),corrections:corrections.results.slice(0,100),saldos:saldos.results.slice(0,100),truncated:[appointments,followups,corrections,saldos].some(r=>r.results.length>100)},{headers:privateHeaders});
 }catch(e){return failure(e);}}
