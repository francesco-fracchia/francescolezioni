import { isRequestOwner } from '@/lib/request-admin';
import { chatGPTSignInPath,getChatGPTUser } from '@/app/chatgpt-auth';
import NotificationLog from './notification-log';
export const dynamic='force-dynamic';
export default async function Page(){const owner=await isRequestOwner();const user=await getChatGPTUser();return <><main className="wrap management-page"><h1>Registro email</h1>{owner?<NotificationLog/>:<section className="booking-empty"><p>Accesso riservato a Francesco.</p>{!user&&<a className="button dark" href={"/accesso?destinazione="+encodeURIComponent('/gestione/notifiche')}>Accedi alla piattaforma</a>}</section>}</main></>}
