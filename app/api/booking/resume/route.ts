import { z } from 'zod';
import { BookingCheckoutError, openBookingCheckout } from '@/lib/booking/booking-checkout';
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return Response.json({error: 'Origine non consentita.'}, {status: 403});
  try {
    const raw = await request.text();
    if (raw.length > 300) return new Response(null, {status: 413});
    const parsed = z.object({id: z.string().uuid()}).safeParse(JSON.parse(raw));
    const token = request.headers.get('Authorization')?.replace(/^Bearer /, '');
    if (!parsed.success || !token) return new Response(null, {status: 401});
    return Response.json({url: await openBookingCheckout(parsed.data.id, token)}, {headers: {'Cache-Control': 'private, no-store'}});
  } catch (error) {
    return Response.json({error: error instanceof BookingCheckoutError ? error.message : 'Non siamo riusciti a riaprire il pagamento. Riprova.'},
      {status: error instanceof BookingCheckoutError ? error.status : 503, headers: {'Cache-Control': 'private, no-store'}});
  }
}
