import { bookingDb } from '@/lib/booking/runtime';
import { calendarOwner,calendarReply,calendarFailure,calendarKey } from '@/lib/calendar/runtime';
import { calendarSettings,calendarSelection } from '@/lib/calendar/settings.mjs';
import { openCalendarValue } from '@/lib/calendar/security.mjs';
import { calendarRange } from '@/lib/calendar/ical.mjs';
import { iCloudClient,discoverCalendars,fetchICloudEvents } from '@/lib/calendar/icloud.mjs';
export const maxDuration=60;
export const dynamic='force-dynamic';
type Cached={events:unknown[];calendars:{id:string;name:string;color:string}[];checkedAt:string;connected:boolean};
// Bounded, short-lived server cache, partitioned by tutor, settings version and period.
// Nothing is stored in browser storage, student data, or the lessons tables.
const snapshots=new Map<string,{until:number;value:Cached}>();
export async function GET(request:Request) {
 try {
  const owner=await calendarOwner(request),params=new URL(request.url).searchParams;
  const range=calendarRange(params.get('from'),params.get('to'));
  const settings=await calendarSettings(bookingDb(),owner.id),selected=calendarSelection(settings);
  if(!settings.encrypted_credentials||!selected.length)return calendarReply({events:[],calendars:[],connected:!!settings.encrypted_credentials,checkedAt:null});
  const key=`${owner.id}:${settings.version}:${range.start}:${range.end}`,cached=snapshots.get(key);
  if(cached&&cached.until>Date.now())return calendarReply(cached.value);
  const credentials=openCalendarValue(settings.encrypted_credentials,calendarKey(),owner.id,'icloud');
  const client=await iCloudClient(credentials),calendars=await discoverCalendars(client);
  const events=await fetchICloudEvents(client,calendars,selected,range);
  // Recheck after network I/O: disconnect/reselection/password reset invalidates the response.
  const freshOwner=await calendarOwner(request),freshSettings=await calendarSettings(bookingDb(),owner.id);
  if(freshOwner.auth_version!==owner.auth_version||freshSettings.version!==settings.version)return calendarReply({error:'Il collegamento è cambiato. Aggiorna il calendario.'},409);
  const value={events,calendars:calendars.filter(c=>selected.includes(c.id)).map(({id,name,color})=>({id,name,color})),checkedAt:new Date().toISOString(),connected:true};
  for(const [cacheKey,entry]of snapshots)if(entry.until<=Date.now())snapshots.delete(cacheKey);
  if(snapshots.size>=12)snapshots.delete(snapshots.keys().next().value!);
  snapshots.set(key,{value,until:Date.now()+120000});
  return calendarReply(value);
 } catch(error){return calendarFailure(error);}
}
