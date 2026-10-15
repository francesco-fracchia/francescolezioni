import { bookingDb } from '@/lib/booking/runtime';
import { feedAccount } from '@/lib/calendar/settings.mjs';
import { tutorCalendarEvents,renderTutorCalendar } from '@/lib/calendar/feed.mjs';
import { calendarHeaders } from '@/lib/calendar/security.mjs';
export const dynamic='force-dynamic';
export async function GET(request:Request) {
 try {
  const params=new URL(request.url).searchParams;
  if(params.getAll('token').length!==1||!/^[A-Za-z0-9_-]{43}$/.test(params.get('token')||'')||!await feedAccount(bookingDb(),params.get('token')))return new Response('Collegamento non valido o revocato.',{status:403,headers:calendarHeaders});
  const content=renderTutorCalendar(await tutorCalendarEvents(bookingDb()));
  return new Response(content,{headers:{...calendarHeaders,'Content-Type':'text/calendar; charset=utf-8','Content-Disposition':'inline; filename="lezioni-francesco.ics"'}});
 }catch{return new Response('Calendario temporaneamente non disponibile.',{status:503,headers:calendarHeaders});}
}
export async function HEAD(request:Request) { const response=await GET(request);return new Response(null,{status:response.status,headers:response.headers}); }
