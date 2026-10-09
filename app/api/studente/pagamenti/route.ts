import { z } from 'zod';
import { bookingDb, paymentConfig } from '@/lib/booking/runtime';
import { openLessonCheckout, reconcileLessonPayment } from '@/lib/booking/lesson-checkout';
import { openBookingCheckout, BookingCheckoutError } from '@/lib/booking/booking-checkout';
import { reconcileBooking } from '@/lib/booking/reconcile';
import { deadlinePassed, paymentDeadline } from '@/lib/booking/payment-policy';
import { failure, LearningError, privateHeaders, sameOrigin, studentScope } from '@/lib/learning/access';
const params = z.object({studentId:z.string().uuid(), kind:z.enum(['lesson','booking']), id:z.string().uuid()});
type Target = z.infer<typeof params>;
type PaymentRow = {
  id:string; access_token:string; amount:number; payment_status:string; lesson_status:string;
  lesson_payment_status:string; payment_method:string; starts_at:string; ends_at:string;
  mode:string; subject:string; paid_at:string|null; credit_amount?:number;package_status?:string|null; has_session?:number;
};

async function read(target:Target) {
  const db = bookingDb();
  return target.kind === 'lesson'
    ? db.prepare(`SELECT p.id,p.access_token,p.amount,COALESCE((SELECT SUM(x.amount) FROM referral_redemptions x WHERE x.payment_id=p.id AND x.status='applied'),0) AS credit_amount,(SELECT x.status FROM package_uses x WHERE x.payment_id=p.id AND (x.status='applied' OR (x.status='returned' AND l.status!='planned' AND p.amount=1900)) ORDER BY CASE x.status WHEN 'applied' THEN 0 ELSE 1 END,x.created_at DESC,x.id LIMIT 1) AS package_status,p.status AS payment_status,p.paid_at,
      l.status AS lesson_status,l.payment_status AS lesson_payment_status,l.payment_method,l.starts_at,l.ends_at,l.mode,l.subject
      FROM lesson_payments p JOIN scheduled_lessons l ON l.id=p.lesson_id WHERE p.id=? AND p.student_id=?`)
        .bind(target.id,target.studentId).first<PaymentRow>()
    : db.prepare(`SELECT b.id,b.access_token,2000 AS amount,
      CASE b.status WHEN 'confirmed' THEN 'paid' WHEN 'pending' THEN 'pending' WHEN 'awaiting_payment' THEN 'awaiting'
      WHEN 'payment_review' THEN 'payment_review' WHEN 'expired' THEN 'expired' ELSE 'unverified' END AS payment_status,
      (b.stripe_session IS NOT NULL) AS has_session,NULL AS paid_at,b.status AS lesson_status,b.status AS lesson_payment_status,'online' AS payment_method,
      s.starts_at,s.ends_at,s.mode,b.subject FROM bookings b JOIN booking_slots s ON s.id=b.slot_id WHERE b.id=? AND b.student_id=?`)
        .bind(target.id,target.studentId).first<PaymentRow>();
}
async function authorize(request:Request,target:Target) {
  const scope = await studentScope(request);
  if (!scope.students.some(s=>s.id===target.studentId)) throw new LearningError('Saldo non disponibile.',403);
  const row = await read(target);
  if (!row) throw new LearningError('Saldo non disponibile.',404);
  return {scope,row};
}
function payable(row:PaymentRow,kind:Target['kind']) {
  return paymentConfig().ready && row.payment_method==='online' && !deadlinePassed(row.starts_at)
    && ['awaiting','pending'].includes(row.payment_status)
    && (kind==='lesson' ? row.lesson_status==='planned' && row.lesson_payment_status==='awaiting' : ['pending','awaiting_payment'].includes(row.lesson_status)&&!!row.has_session);
}
export async function GET(request:Request) {
  try {
    const parsed=params.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) throw new LearningError('Saldo non valido.');
    const target=parsed.data;const {scope}=await authorize(request,target);
    let warning:string|undefined;
    if (!scope.preview && paymentConfig().ready) {
      try { if(target.kind==='lesson') await reconcileLessonPayment(target.id); else await reconcileBooking(target.id); }
      catch { warning='La verifica online non è riuscita. Mostriamo l’ultimo saldo registrato: riprova prima di effettuare un nuovo pagamento.'; }
    }
    const row=await read(target);if(!row)throw new LearningError('Saldo non disponibile.',404);
    // Do not serialize access tokens, Stripe IDs, contact details or group totals.
    return Response.json({id:row.id,kind:target.kind,studentId:target.studentId,subject:row.subject,
      starts_at:row.starts_at,ends_at:row.ends_at,mode:row.mode,amount:row.amount,credit_amount:row.credit_amount||0,package_status:row.package_status||null,payment_status:row.payment_status,
      lesson_status:row.lesson_status,payment_method:row.payment_method,paid_at:row.paid_at,
      payment_deadline:paymentDeadline(row.starts_at),canPay:!scope.preview&&!warning&&payable(row,target.kind),
      preview:scope.preview,testMode:!paymentConfig().live,warning,requiresReview:row.payment_status==='payment_review'||row.lesson_payment_status==='payment_review'}, {headers:privateHeaders});
  } catch(error) { return failure(error); }
}
export async function POST(request:Request) {
  try {
    sameOrigin(request);const raw=await request.text();if(raw.length>400)throw new LearningError('Dati troppo grandi.',413);
    const parsed=params.safeParse(JSON.parse(raw));if(!parsed.success)throw new LearningError('Saldo non valido.');
    const target=parsed.data;const {scope,row}=await authorize(request,target);
    if(scope.preview)throw new LearningError('L’anteprima è in sola lettura.',403);
    if(!payable(row,target.kind))throw new LearningError('Il pagamento non è disponibile. Aggiorna il saldo o contatta Francesco.',409);
    const url=target.kind==='lesson'?await openLessonCheckout(target.id,row.access_token):await openBookingCheckout(target.id,row.access_token);
    if(!url.startsWith('https://checkout.stripe.com/'))throw new LearningError('Pagamento temporaneamente non disponibile.',503);
    return Response.json({url},{headers:privateHeaders});
  } catch(error) {
    if(error instanceof BookingCheckoutError)return failure(new LearningError(error.message,error.status));
    if(error instanceof Error&&error.message==='CLOSED')return failure(new LearningError('Il pagamento non è più disponibile. Aggiorna il saldo o contatta Francesco.',409));
    return failure(error instanceof SyntaxError?new LearningError('Dati non validi.'):error);
  }
}
