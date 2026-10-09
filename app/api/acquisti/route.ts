import {z} from 'zod';
import {bookingDb,paymentConfig} from '@/lib/booking/runtime';
import {failure,LearningError,privateHeaders,sameOrigin,studentScope} from '@/lib/learning/access';
import {openPurchase,reconcilePurchase} from '@/lib/packages/checkout';
import {packagesFor} from '@/lib/packages/server';
const schema=z.object({id:z.string().uuid(),studentId:z.string().uuid(),units:z.union([z.literal(1),z.literal(5)])});
export async function GET(request:Request){try{
 const scope=await studentScope(request);
 const id=new URL(request.url).searchParams.get('studente')||scope.students[0]?.id;
 if(!id||!scope.students.some(s=>s.id===id))throw new LearningError('Seleziona uno studente del tuo account.',403);
 const purchase=new URL(request.url).searchParams.get('acquisto');let warning:string|undefined;
 if(purchase&&!scope.preview&&paymentConfig().ready){
  if(!z.string().uuid().safeParse(purchase).success)throw new LearningError('Acquisto non valido.');
  const owned=await bookingDb().prepare('SELECT id FROM lesson_packages WHERE id=? AND student_id=?').bind(purchase,id).first();
  if(!owned)throw new LearningError('Acquisto non disponibile.',404);
  try{await reconcilePurchase(purchase);}catch{warning='La verifica del pagamento non è riuscita. Riprova: non effettuare un secondo acquisto per lo stesso saldo.';}
 }
 return Response.json({students:scope.students,studentId:id,packages:await packagesFor(id),ready:paymentConfig().ready&&!scope.preview,live:paymentConfig().live,preview:scope.preview,warning},{headers:privateHeaders});
 }catch(e){return failure(e);}}
export async function POST(request:Request){try{
 sameOrigin(request);const scope=await studentScope(request);if(scope.preview)throw new LearningError('L’anteprima è in sola lettura.',403);
 const raw=await request.text();if(raw.length>400)throw new LearningError('Dati troppo grandi.',413);
 const p=schema.parse(JSON.parse(raw));if(!scope.students.some(s=>s.id===p.studentId))throw new LearningError('Acquisto non disponibile.',403);
 return Response.json({url:await openPurchase(p.id,p.studentId,p.units)},{headers:privateHeaders});
 }catch(e){return failure(e instanceof z.ZodError||e instanceof SyntaxError?new LearningError('Controlla i dati richiesti.'):e);}}
