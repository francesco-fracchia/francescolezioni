import { isRequestOwner } from '@/lib/request-admin';
import HomeworkManager from './manager';
export const dynamic='force-dynamic';
export default async function Page(){return <><main className="wrap management-page"><h1>Compiti e correzioni</h1>{await isRequestOwner()?<HomeworkManager/>:<section className="booking-empty"><p>Accesso riservato a Francesco.</p><a className="button dark" href="/accesso?destinazione=%2Fgestione%2Fcompiti">Accedi alla piattaforma</a></section>}</main></>}
