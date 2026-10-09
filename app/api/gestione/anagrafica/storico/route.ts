import { isRequestOwner } from '@/lib/request-admin';
import { bookingDb } from '@/lib/booking/runtime';
import { z } from 'zod';

export async function GET(request: Request) {
 if (!await isRequestOwner()) return new Response(null, { status: 403 });
 const params = z.object({ kind: z.enum(['student', 'group']), id: z.string().uuid() }).safeParse(Object.fromEntries(new URL(request.url).searchParams));
 if (!params.success) return Response.json({ error: 'Scheda non valida.' }, { status: 400 });
 try {
  const { kind, id } = params.data;
  const db = bookingDb();
  const table = kind === 'student' ? 'students' : 'student_groups';
  if (!await db.prepare(`SELECT id FROM ${table} WHERE id=?`).bind(id).first()) return new Response(null, { status: 404 });
  // Historical membership comes from the appointment and its payment rows,
  // never the group's current members or a contact's mutable email address.
  const condition = kind === 'group' ? 'l.group_id=?' : '(l.student_id=? OR EXISTS(SELECT 1 FROM lesson_payments p WHERE p.lesson_id=l.id AND p.student_id=?))';
  const lessonQuery = db.prepare(`SELECT l.id,l.name,l.subject,l.starts_at,l.ends_at,l.mode,l.status,l.payment_method,l.payment_status FROM scheduled_lessons l WHERE ${condition} ORDER BY l.starts_at DESC,l.id LIMIT 201`);
  const lessons = await (kind === 'group' ? lessonQuery.bind(id) : lessonQuery.bind(id, id)).all<{ id: string }>();
  const rows = lessons.results.slice(0, 200);
  const paymentsQuery = db.prepare(`SELECT id,lesson_id,student_id,name,amount,status,paid_at FROM lesson_payments WHERE lesson_id IN (SELECT l.id FROM scheduled_lessons l WHERE ${condition} ORDER BY l.starts_at DESC,l.id LIMIT 200)${kind === 'student' ? ' AND student_id=?' : ''} ORDER BY name,id`);
  const payments = rows.length ? await (kind === 'group' ? paymentsQuery.bind(id) : paymentsQuery.bind(id, id, id)).all() : { results: [] };
  const bookings = kind === 'student' ? await db.prepare('SELECT b.id,b.subject,b.status,s.starts_at,s.ends_at,s.mode FROM bookings b JOIN booking_slots s ON s.id=b.slot_id WHERE b.student_id=? ORDER BY s.starts_at DESC,b.id LIMIT 201').bind(id).all() : { results: [] };
  const notificationQuery = kind === 'student'
   ? db.prepare('SELECT id,kind,recipient,subject,body,status,error,created_at FROM notifications WHERE student_id=? ORDER BY created_at DESC,id LIMIT 101').bind(id)
   : db.prepare('SELECT n.id,n.kind,n.recipient,n.subject,n.body,n.status,n.error,n.created_at FROM notifications n JOIN scheduled_lessons l ON n.entity_type=\'lesson\' AND n.entity_id=l.id WHERE l.group_id=? ORDER BY n.created_at DESC,n.id LIMIT 101').bind(id);
  const notifications = await notificationQuery.all();
  const requests=await db.prepare(`SELECT id,kind,name,email,subject,details,assessment,status,created_at,student_id,group_id FROM requests WHERE ${kind==='group'?'group_id':'student_id'}=? ORDER BY created_at DESC,id LIMIT 101`).bind(id).all();
  return Response.json({
   lessons: rows.map(l => ({ ...l, payments: payments.results.filter(p => p.lesson_id === l.id) })),
   bookings: bookings.results.slice(0, 200), notifications: notifications.results.slice(0, 100),requests:requests.results.slice(0,100),
   truncated: { appointments: lessons.results.length > 200 || bookings.results.length > 200, notifications: notifications.results.length > 100,requests:requests.results.length>100 },
  }, { headers: { 'Cache-Control': 'private, no-store' } });
 } catch {
  return Response.json({ error: 'Storico temporaneamente non disponibile. Riprova.' }, { status: 503 });
 }
}
