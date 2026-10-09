import StudentShell from '@/components/site/student-shell';
import PreviewPicker from './preview-picker';
import { getAccount } from '@/lib/auth/session';
import { isRequestOwner } from '@/lib/request-admin';
import StudentWorkspace from './workspace';
export const dynamic='force-dynamic';
export const metadata={title:'Area studente | Francesco Fracchia'};
export default async function Page({searchParams}:{searchParams:Promise<{anteprima?:string}>}){const params=await searchParams;const account=await getAccount(),owner=await isRequestOwner();return <StudentShell preview={owner} account={!!account}><main className="wrap management-page"><h1>{owner?'Anteprima area studente':'Area studente'}</h1>{owner&&!params.anteprima&&<PreviewPicker/>}{account?.must_change_password?<section className="booking-empty"><p>Imposta la tua password prima di continuare.</p><a className="button dark" href="/account">Imposta password</a></section>:(account&&account.role!=='tutor')||(owner&&params.anteprima)?<StudentWorkspace/>:owner?null:<section className="booking-empty"><p>Accedi per vedere le tue lezioni, i corsi e i materiali assegnati da Francesco.</p><a className="button dark" href="/accesso?destinazione=%2Fstudente">Accedi con email e password</a></section>}</main></StudentShell>}
