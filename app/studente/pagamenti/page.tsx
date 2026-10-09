import StudentShell from '@/components/site/student-shell';
import { getAccount } from '@/lib/auth/session';
import { isRequestOwner } from '@/lib/request-admin';
import PaymentView from './payment-view';
export const dynamic='force-dynamic';
export default async function Page(){
  const user=await getAccount();const owner=await isRequestOwner();
  return <StudentShell preview={owner} account={!!user}>
    <main className="wrap booking-page"><p><a href="/studente?vista=lezioni">Lezioni e saldi</a></p><h1>Il tuo saldo</h1>{user?.must_change_password?<p><a href="/account">Imposta prima la tua password</a></p>:user||owner?<PaymentView/>:<section className="booking-empty"><p>Accedi all’area studente per aprire il tuo saldo personale.</p><a className="button dark" href="/accesso?destinazione=%2Fstudente%3Fvista%3Dlezioni">Accedi con email e password</a></section>}</main></StudentShell>;
}
