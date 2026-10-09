import {isRequestOwner} from '@/lib/request-admin';
import Templates from './templates';
export const dynamic='force-dynamic';
export default async function Page(){const owner=await isRequestOwner();return <><main className="wrap management-page"><h1>Modelli</h1>{owner?<Templates/>:<p>Questa pagina è riservata a Francesco. <a href="/accesso?destinazione=%2Fgestione%2Fmodelli">Accedi</a></p>}</main></>;}
