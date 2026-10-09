import { bookingDb, paymentConfig, stripe } from './runtime';
import { reconcileBooking } from './reconcile';
import { deadlinePassed } from './payment-policy';

export class BookingCheckoutError extends Error {
  constructor(message: string, public status = 409) { super(message); }
}

type CheckoutBooking = {
  status: string; stripe_session: string | null; checkout_expires_at: number | null; email: string; starts_at: string;
};

export async function openBookingCheckout(id: string, token: string) {
  const config = paymentConfig();
  if (!config.ready || !config.origin) throw new BookingCheckoutError('Il pagamento online non è disponibile.', 503);
  const db = bookingDb();
  const read = () => db.prepare(`SELECT b.status,b.stripe_session,b.checkout_expires_at,b.email,s.starts_at
    FROM bookings b JOIN booking_slots s ON s.id=b.slot_id
    WHERE b.id=? AND b.access_token=?`).bind(id, token).first<CheckoutBooking>();
  if (!await read()) throw new BookingCheckoutError('Prenotazione non disponibile.', 404);
  await reconcileBooking(id);
  // Re-read after reconciliation: a stale pending snapshot must never reopen a
  // checkout after a completed, uncertain or late payment.
  const booking = await read();
  if (!booking || deadlinePassed(booking.starts_at) || !['pending', 'awaiting_payment'].includes(booking.status)) {
    throw new BookingCheckoutError('La prenotazione non è più in attesa di pagamento. Aggiorna il saldo o contatta Francesco.');
  }
  if (!booking.stripe_session) throw new BookingCheckoutError('Il pagamento richiede una verifica di Francesco.');
  const previous = await stripe(`checkout/sessions/${encodeURIComponent(booking.stripe_session)}`) as unknown as {
    id: string; status: string; payment_status: string; url: string; livemode: boolean;
    amount_total: number; currency: string; metadata: { booking_id?: string };
  };
  if (previous.id !== booking.stripe_session || previous.livemode !== !!config.live || previous.metadata?.booking_id !== id || previous.amount_total !== 2000 || previous.currency !== 'eur') {
    throw new BookingCheckoutError('Il pagamento richiede una verifica di Francesco.');
  }
  if (previous.payment_status === 'paid') throw new BookingCheckoutError('Pagamento già ricevuto. Aggiorna il saldo.');
  if (previous.status === 'open') {
    if (!previous.url?.startsWith('https://checkout.stripe.com/')) throw new BookingCheckoutError('Pagamento temporaneamente non disponibile.', 503);
    return previous.url;
  }
  if (previous.status !== 'expired') throw new BookingCheckoutError('Il pagamento richiede una verifica di Francesco.');
  // Persist the expiry before asking Stripe, so timeouts and concurrent retries
  // reuse exactly the same body with the existing renewal idempotency key.
  await db.prepare(`UPDATE bookings SET checkout_expires_at=? WHERE id=? AND stripe_session=?
    AND checkout_expires_at IS NULL AND status IN ('pending','awaiting_payment')`)
    .bind(Math.floor(Date.now() / 60000) * 60 + 1860, id, booking.stripe_session).run();
  const attempt = await read();
  if (!attempt || attempt.stripe_session !== booking.stripe_session || !attempt.checkout_expires_at
    || !['pending','awaiting_payment'].includes(attempt.status) || deadlinePassed(attempt.starts_at)) {
    throw new BookingCheckoutError('Lo stato è cambiato. Aggiorna il saldo prima di riprovare.');
  }
  const body = new URLSearchParams({
    mode: 'payment', locale: 'it', 'payment_method_types[0]': 'card',
    'line_items[0][price_data][currency]': 'eur', 'line_items[0][price_data][unit_amount]': '2000',
    'line_items[0][price_data][product_data][name]': 'Lezione individuale · 55 minuti',
    'line_items[0][quantity]': '1', customer_email: attempt.email, 'metadata[booking_id]': id,
    success_url: `${config.origin}/prenota?booking=${id}#${token}`,
    cancel_url: `${config.origin}/prenota?booking=${id}#${token}`,
    expires_at: String(attempt.checkout_expires_at),
  });
  const session = await stripe('checkout/sessions', body, id + '-' + previous.id);
  if (session.livemode !== !!config.live || !session.url?.startsWith('https://checkout.stripe.com/')) throw new BookingCheckoutError('Pagamento temporaneamente non disponibile.', 503);
  const saved = await db.prepare("UPDATE bookings SET stripe_session=?,status='pending',checkout_expires_at=NULL WHERE id=? AND status IN ('pending','awaiting_payment') AND stripe_session=? AND checkout_expires_at=?")
    .bind(session.id, id, booking.stripe_session, attempt.checkout_expires_at).run();
  if (!saved.meta.changes) {
    // Another retry may have saved the same idempotent session already.
    const current = await read();
    if (!current || current.stripe_session !== session.id || !['pending','awaiting_payment'].includes(current.status)) {
      try { await stripe(`checkout/sessions/${encodeURIComponent(session.id)}/expire`, new URLSearchParams()); } catch { /* Keep the existing record for tutor verification. */ }
      throw new BookingCheckoutError('Lo stato è cambiato. Aggiorna il saldo prima di riprovare.');
    }
  }
  return session.url;
}
