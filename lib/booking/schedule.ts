import {bookingDb} from './runtime';
import {ensureAutomaticSlots} from '@/lib/consultation-recurrence';
// Kept for callers needing a Rome civil hour, including daylight saving time.
export function romeSlot(date:string,hour:number){const guess=Date.parse(`${date}T${String(hour).padStart(2,'0')}:00:00Z`),local=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Rome',hour:'2-digit',hourCycle:'h23'}).format(new Date(guess)));return new Date(guess-(local-hour)*3600000).toISOString();}
export async function ensureSchedule(){return ensureAutomaticSlots(bookingDb(),'paid');}
