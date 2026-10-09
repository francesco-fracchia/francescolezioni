import { isRequestOwner } from '@/lib/request-admin';
import Manager from './manager';
export const dynamic='force-dynamic';
export default async function Page(){const owner=await isRequestOwner();return <><main className="wrap management-page"><h1>Incontri gratuiti</h1>{owner?<Manager/>:<p>Accesso riservato a Francesco.</p>}</main></>;}
