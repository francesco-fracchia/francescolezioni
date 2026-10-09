import {z} from 'zod';
import {isRequestOwner} from '@/lib/request-admin';
import {bookingDb} from '@/lib/booking/runtime';
import {meetUrl} from '@/lib/lesson-calendar-export';
import {failure,LearningError,privateHeaders,sameOrigin} from '@/lib/learning/access';

type Appointment={id:string;version:number;status:string;mode:string;ends_at:string;video_url:string|null};
export async function PATCH(request:Request){try{
 if(!await isRequestOwner())throw new LearningError('Accesso non consentito.',403);
 sameOrigin(request);const raw=await request.text();if(raw.length>600)throw new LearningError('Dati troppo grandi.',413);
 const parsed=z.object({id:z.string().uuid(),entity:z.enum(['lesson','booking']),version:z.number().int().min(0),url:z.string().max(250)}).safeParse(JSON.parse(raw));
 if(!parsed.success)throw new LearningError('Controlla il collegamento e ricarica l’appuntamento.');
 const p=parsed.data,url=meetUrl(p.url);if(p.url.trim()&&!url)throw new LearningError('Incolla il link Google Meet completo, per esempio https://meet.google.com/abc-defg-hij.');
 const db=bookingDb(),now=new Date().toISOString();
 const query=p.entity==='lesson'?'SELECT id,version,status,mode,ends_at,video_url FROM scheduled_lessons WHERE id=?':'SELECT b.id,b.version,b.status,b.video_url,s.mode,s.ends_at FROM bookings b JOIN booking_slots s ON s.id=b.slot_id WHERE b.id=?';
 const old=await db.prepare(query).bind(p.id).first<Appointment>();
 if(!old||old.mode!=='Online'||old.status!==(p.entity==='lesson'?'planned':'confirmed')||Date.parse(old.ends_at)<=Date.parse(now))throw new LearningError('Il link si gestisce su una lezione online attiva, non ancora terminata.',409);
 // A retry after a lost successful response must not repeat the version change.
 if(old.video_url===url&&(old.version===p.version||old.version===p.version+1))return Response.json({ok:true,version:old.version},{headers:privateHeaders});
 if(old.version!==p.version)throw new LearningError('L’appuntamento è cambiato. Ricarica prima di salvare.',409);
 const statement=p.entity==='lesson'?db.prepare("UPDATE scheduled_lessons SET video_url=?,version=version+1 WHERE id=? AND version=? AND mode='Online' AND status='planned' AND ends_at>?").bind(url,p.id,p.version,now):db.prepare("UPDATE bookings SET video_url=?,version=version+1 WHERE id=? AND version=? AND status='confirmed' AND EXISTS(SELECT 1 FROM booking_slots s WHERE s.id=bookings.slot_id AND s.mode='Online' AND s.ends_at>?)").bind(url,p.id,p.version,now);
 const result=await statement.run();if(!result.meta.changes)throw new LearningError('L’appuntamento è cambiato. Ricarica prima di salvare.',409);
 return Response.json({ok:true,version:p.version+1},{headers:privateHeaders});
}catch(e){return failure(e instanceof SyntaxError?new LearningError('Dati non validi.'):e);}}
