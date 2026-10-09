import { isRequestOwner } from '@/lib/request-admin';
import { chatGPTSignInPath,getChatGPTUser } from '@/app/chatgpt-auth';
import Matching from './matching';
import './matching.css';
export const dynamic='force-dynamic';
export default async function Page(){const owner=await isRequestOwner();const user=await getChatGPTUser();return <><main className="wrap management-page"><h1>Abbinamento dei gruppi</h1>{owner?<Matching/>:<section className="booking-empty"><p>Accesso riservato a Francesco.</p>{!user&&<a className="button dark" href={"/accesso?destinazione="+encodeURIComponent('/gestione/abbinamenti')}>Accedi alla piattaforma</a>}</section>}</main></>}
