import { getAccount } from '@/lib/auth/session';
import { env } from '@/lib/runtime-env';
import { bookingDb } from '@/lib/booking/runtime';
import { calendarHeaders, CalendarError, calendarKeyReady, openCalendarValue } from './security.mjs';
import { calendarSelection, calendarSettings, subscriptionUrl } from './settings.mjs';
import { iCloudClient, discoverCalendars } from './icloud.mjs';

export async function calendarOwner(request:Request) {
  const account = await getAccount(request);
  if (!account || account.role !== 'tutor' || account.must_change_password) throw new CalendarError('Accesso riservato al tutor.', 403);
  return account;
}
export function calendarReply(value:unknown,status=200) { return Response.json(value,{status,headers:calendarHeaders}); }
export function calendarFailure(error:unknown) { return calendarReply({error:error instanceof CalendarError?error.message:'Calendario temporaneamente non disponibile. Riprova.'},error instanceof CalendarError?error.status:503); }
export function calendarOrigin(request:Request) {
  const origin=env.SITE_ORIGIN;
  try { const url=new URL(origin||''); if(url.protocol==='https:'&&url.origin===origin&&!url.username&&!url.password)return origin!; } catch {}
  const url=new URL(request.url);
  if(['127.0.0.1','localhost','[::1]'].includes(url.hostname))return url.origin;
  throw new CalendarError('Indirizzo del sito non configurato.');
}
export function calendarKey() { return env.CALENDAR_CONNECTION_KEY; }
export async function ownerCalendarState(accountId:string,request:Request,discover=false) {
  const settings=await calendarSettings(bookingDb(),accountId),key=calendarKey();
  let calendars:{id:string;name:string;color:string}[]|undefined;
  if(discover&&settings.encrypted_credentials) {
    const credentials=openCalendarValue(settings.encrypted_credentials,key,accountId,'icloud');
    calendars=(await discoverCalendars(await iCloudClient(credentials))).map(({id,name,color})=>({id,name,color}));
  }
  return {ready:calendarKeyReady(key),connected:!!settings.encrypted_credentials,selected:calendarSelection(settings),version:settings.version,feedActive:!!settings.feed_token_hash,subscriptionUrl:settings.feed_token_hash&&calendarKeyReady(key)?subscriptionUrl(settings,key,calendarOrigin(request)):null,...(calendars?{calendars}:{})};
}
