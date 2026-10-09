import {isRequestOwner} from '@/lib/request-admin';
import Today from './today';
export const dynamic='force-dynamic';
export default async function Page(){const owner=await isRequestOwner();return <><main className="wrap management-page"><h1>Oggi</h1>{owner?<Today/>:<p>Questa pagina è riservata a Francesco. <a href="/accesso?destinazione=%2Fgestione%2Foggi">Accedi</a></p>}</main></>;}
