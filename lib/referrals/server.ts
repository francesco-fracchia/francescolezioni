import { bookingDb } from '@/lib/booking/runtime';
import { LearningError } from '@/lib/learning/access';
import { referralPattern } from './rules';
// Only verified cash/POS balances qualify while Stripe remains in test mode.
// Historical payment rows, never current group membership, define who attended.
export const qualifyingLessonSql=`l.status='planned' AND julianday(l.ends_at)<=julianday(?) AND julianday(l.starts_at)>=julianday(r.created_at)
 AND l.payment_method IN ('cash','pos') AND p.status='manual_paid' AND p.paid_at IS NOT NULL AND p.amount>0
 AND ((r.reward_kind='individual' AND (SELECT COUNT(*) FROM lesson_payments pc WHERE pc.lesson_id=l.id)=1)
 OR (r.reward_kind='group' AND (SELECT COUNT(*) FROM lesson_payments pc WHERE pc.lesson_id=l.id) BETWEEN 2 AND 4
 AND EXISTS(SELECT 1 FROM lesson_payments sender WHERE sender.lesson_id=l.id AND sender.student_id=r.referrer_id AND sender.status='manual_paid' AND sender.paid_at IS NOT NULL AND sender.amount>0)))`;
export const validQualificationsSql=`(SELECT COUNT(*) FROM referral_qualifications q JOIN scheduled_lessons l ON l.id=q.lesson_id JOIN lesson_payments p ON p.lesson_id=l.id AND p.student_id=r.invited_id WHERE q.referral_id=r.id AND ${qualifyingLessonSql})=3`;
export async function validateReferral(code:string){
 if(!code)return;
 if(!referralPattern.test(code)||!await bookingDb().prepare("SELECT c.student_id FROM referral_codes c JOIN students s ON s.id=c.student_id WHERE c.code=? AND s.status='active'").bind(code).first())throw new LearningError('Codice invito non disponibile. Controllalo oppure invia la richiesta senza codice.');
}
export async function creditsFor(studentId:string,now:string){return (await bookingDb().prepare(`SELECT c.id,c.kind,c.amount,c.status,c.expires_at,c.amount-COALESCE((SELECT SUM(x.amount) FROM referral_redemptions x WHERE x.credit_id=c.id AND x.status='applied'),0) AS remaining,
 CASE WHEN c.status='active' AND c.expires_at>? AND r.status='rewarded' AND ${validQualificationsSql} THEN 1 ELSE 0 END AS available
 FROM referral_credits c JOIN referrals r ON r.id=c.referral_id WHERE c.student_id=? ORDER BY c.expires_at,c.id LIMIT 201`).bind(now,now,studentId).all()).results;}
export async function candidates(id:string,kind:'individual'|'group',now:string){return (await bookingDb().prepare(`SELECT DISTINCT l.id,l.subject,l.starts_at,l.ends_at,l.mode FROM (SELECT id,referrer_id,invited_id,created_at,? AS reward_kind FROM referrals WHERE id=?) r JOIN lesson_payments p ON p.student_id=r.invited_id JOIN scheduled_lessons l ON l.id=p.lesson_id WHERE ${qualifyingLessonSql} ORDER BY l.starts_at,l.id LIMIT 201`).bind(kind,id,now).all<{id:string;subject:string;starts_at:string;ends_at:string;mode:string}>()).results;}
