import { isRequestOwner } from '@/lib/request-admin';
import RequestDashboard from './request-dashboard';
import { chatGPTSignInPath, getChatGPTUser } from '@/app/chatgpt-auth';
export const dynamic='force-dynamic';
export default async function Management(){const owner=await isRequestOwner();const user=await getChatGPTUser();return <><main className="wrap management-page"><h1>Richieste</h1>{owner?<RequestDashboard/>:<section className="booking-empty"><p>Solo Francesco può accedere a questa pagina. I dati degli studenti restano privati.</p>{!user&&<a className="button dark" href={"/accesso?destinazione="+encodeURIComponent('/gestione')}>Accedi alla piattaforma</a>}</section>}</main></>}
