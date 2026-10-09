import { isRequestOwner } from '@/lib/request-admin';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import BookingDashboard from './booking-dashboard';
export const dynamic='force-dynamic';
export default async function Page(){const owner=await isRequestOwner();const user=await getChatGPTUser();return <><main className="wrap management-page agenda-page"><h1>Calendario</h1>{owner?<BookingDashboard/>:<section className="booking-empty"><p>Accesso riservato a Francesco.</p>{!user&&<a className="button dark" href={"/accesso?destinazione="+encodeURIComponent('/gestione/prenotazioni')}>Accedi alla piattaforma</a>}</section>}</main></>}
