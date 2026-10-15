import {bookingDb} from '@/lib/booking/runtime';
import {env} from '@/lib/runtime-env';
import {dailyConsultationRule} from '@/lib/consultation-recurrence';
import {consultationDay} from '@/lib/consultations';
import {calendarRange} from './ical.mjs';
import {syncCalendarBusy} from './busy.mjs';
export async function ensureCalendarAvailability(force=false){
 const db=bookingDb(),rule=await dailyConsultationRule(db),today=consultationDay(new Date().toISOString());
 const first=rule?.active&&rule.start_date>today?rule.start_date:today;
 const end=new Date(Date.parse(first+'T12:00:00Z')+36*86400000).toISOString().slice(0,10);
 await syncCalendarBusy(db,env.CALENDAR_CONNECTION_KEY,calendarRange(first,end),{force});
}
