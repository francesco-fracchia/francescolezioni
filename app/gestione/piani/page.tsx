import { isRequestOwner } from '@/lib/request-admin';
import PlansManager from './manager';
export const dynamic='force-dynamic';
export default async function Page(){const owner=await isRequestOwner();return <><main className="wrap management-page"><h1>Piani e riepiloghi</h1>{owner?<PlansManager/>:<section className="booking-empty"><p>Accesso riservato a Francesco.</p><a className="button dark" href="/accesso?destinazione=%2Fgestione%2Fpiani">Accedi alla piattaforma</a></section>}</main></>}
