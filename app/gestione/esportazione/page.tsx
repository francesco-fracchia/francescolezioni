import {isRequestOwner} from '@/lib/request-admin';
import ExportData from './export-data';
export const dynamic='force-dynamic';
export default async function Page(){const owner=await isRequestOwner();return <><main className="wrap management-page management-export"><h1>Copia dei dati</h1>{owner?<ExportData/>:<p>Questa pagina è riservata a Francesco. <a href="/accesso?destinazione=%2Fgestione%2Fesportazione">Accedi</a></p>}</main></>;}
