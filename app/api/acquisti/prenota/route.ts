import {z} from 'zod';
import {bookingDb} from '@/lib/booking/runtime';
import {failure,LearningError,privateHeaders,sameOrigin,studentScope} from '@/lib/learning/access';
import {availableLessonSlotsSql,reservePurchasedLesson} from '@/lib/packages/reservation';
import {noticeStatements,dispatchAppointmentNotices} from '@/lib/notifications/appointments';
const schema=z.object({id:z.string().uuid(),studentId:z.string().uuid(),packageId:z.string().uuid(),slotId:z.string().min(1).max(100),subject:z.enum(['Matematica','Informatica','Sistemi e Reti'])});
export async function GET(request:Request){try{
 await studentScope(request);
 const slots=await bookingDb().prepare(availableLessonSlotsSql).bind(new Date(Date.now()+86400000).toISOString()).all();
 return Response.json({slots:slots.results},{headers:privateHeaders});
 }catch(e){return failure(e);}}
export async function POST(request:Request){try{
 sameOrigin(request);const scope=await studentScope(request);if(scope.preview)throw new LearningError('L’anteprima è in sola lettura.',403);
 const raw=await request.text();if(raw.length>600)throw new LearningError('Dati troppo grandi.',413);
 const p=schema.parse(JSON.parse(raw));if(!scope.students.some(s=>s.id===p.studentId))throw new LearningError('Lezione non disponibile.',403);
 const result=await reservePurchasedLesson(p);
 const notices=await noticeStatements('lesson',p.id,'confirmed',1,{payment_status:'paid'},"status='planned' AND payment_status='paid'");
 if(notices.length)await bookingDb().batch(notices);
 await dispatchAppointmentNotices();
 return Response.json(result,{headers:privateHeaders});
 }catch(e){return failure(e instanceof z.ZodError||e instanceof SyntaxError?new LearningError('Controlla i dati richiesti.'):String(e).includes('LESSON_CONFLICT')||String(e).includes('PACKAGE_')||String(e).includes('UNIQUE')?new LearningError('Orario già occupato o lezioni esaurite. Aggiorna il calendario.',409):e);}}
