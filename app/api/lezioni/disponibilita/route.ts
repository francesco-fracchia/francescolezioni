import {ensureCalendarAvailability} from '@/lib/calendar/availability';
import {ensureSchedule} from '@/lib/booking/schedule';
import {bookingDb} from '@/lib/booking/runtime';
import {availableLessonSlotsSql} from '@/lib/packages/reservation';
const headers = {'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'};
export async function GET() {
  try {
    await ensureSchedule(); await ensureCalendarAvailability();
    const result = await bookingDb().prepare(availableLessonSlotsSql).bind(new Date(Date.now()+86400000).toISOString()).all<{starts_at:string;ends_at:string;mode:string}>();
    // Shared reservation policy, no personal data/IDs or payment reconciliation.
    return Response.json({slots:result.results.map(({starts_at,ends_at,mode})=>({starts_at,ends_at,mode})),limited:result.results.length===200}, {headers});
  } catch { return Response.json({error:'Non riesco a caricare gli orari. Riprova tra poco.'}, {status:503,headers}); }
}
