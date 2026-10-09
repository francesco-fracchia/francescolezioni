import { isRequestOwner } from '@/lib/request-admin';
import Accounts from './accounts';
export const dynamic='force-dynamic';
export default async function Page(){const owner=await isRequestOwner();return <><main className="wrap management-page"><h1>Account e accessi</h1>{owner?<Accounts/>:<section className="booking-empty"><p>Accesso riservato al tutor.</p><a className="button dark" href="/accesso?destinazione=%2Fgestione%2Faccount">Accedi alla piattaforma</a></section>}</main></>}
