import { z } from 'zod';
import { sameAuthOrigin } from '@/lib/auth/session';
import { bookingDb } from '@/lib/booking/runtime';
import { calendarOwner,calendarReply,calendarFailure,calendarKey,ownerCalendarState } from '@/lib/calendar/runtime';
import { CalendarError,openCalendarValue,calendarKeyReady } from '@/lib/calendar/security.mjs';
import { calendarSettings,updateCalendarSettings } from '@/lib/calendar/settings.mjs';
import { iCloudClient,discoverCalendars } from '@/lib/calendar/icloud.mjs';
export const maxDuration=60;
export const dynamic='force-dynamic';
const basic={version:z.number().int().min(0)};
const operation=z.discriminatedUnion('kind',[
 z.object({...basic,kind:z.literal('connect'),appleId:z.string().trim().email().max(254),password:z.string().trim().regex(/^[a-z]{4}(?:-?[a-z]{4}){3}$/i)}),
 z.object({...basic,kind:z.literal('select'),calendars:z.array(z.string().regex(/^[a-f0-9]{64}$/)).max(10)}),
 ...(['disconnect','create-feed','rotate-feed','revoke-feed'] as const).map(kind=>z.object({...basic,kind:z.literal(kind)})),
]);
export async function GET(request:Request) {
 try { const owner=await calendarOwner(request);return calendarReply(await ownerCalendarState(owner.id,request,new URL(request.url).searchParams.get('discover')==='1')); } catch(error){return calendarFailure(error);}
}
export async function POST(request:Request) {
 try {
  const owner=await calendarOwner(request);
  if(!sameAuthOrigin(request))throw new CalendarError('Origine non consentita.',403);
  const raw=await request.text();if(raw.length>8000)throw new CalendarError('Richiesta troppo grande.',413);
  const body=operation.parse(JSON.parse(raw));const db=bookingDb();let credentials;
  if(['connect','create-feed','rotate-feed'].includes(body.kind)&&!calendarKeyReady(calendarKey()))throw new CalendarError('Il collegamento dei calendari deve ancora essere configurato sul server.');
  if(body.kind==='connect') {
   credentials={appleId:body.appleId,password:body.password};
   await discoverCalendars(await iCloudClient(credentials));
  } else if(body.kind==='select') {
   const current=await calendarSettings(db,owner.id);
   if(!current.encrypted_credentials)throw new CalendarError('Collega prima iCloud.',409);
   const credentials=openCalendarValue(current.encrypted_credentials,calendarKey(),owner.id,'icloud');
   const calendars=await discoverCalendars(await iCloudClient(credentials));
   if(body.calendars.some(id=>!calendars.some(c=>c.id===id)))throw new CalendarError('Un calendario non è più disponibile. Aggiorna l’elenco.',409);
  }
  await updateCalendarSettings(db,owner,body.version,body,calendarKey(),credentials);
  return calendarReply(await ownerCalendarState(owner.id,request));
 }catch(error){return error instanceof z.ZodError||error instanceof SyntaxError?calendarReply({error:'Controlla i dati. Per iCloud usa la password specifica per l’app, composta da quattro gruppi di quattro lettere.'},400):calendarFailure(error);}
}
