import ManagementShell from '@/components/management/management-shell';
import StudentShell from '@/components/site/student-shell';
import {isRequestOwner} from '@/lib/request-admin';
import { getAccount } from '@/lib/auth/session';
import Settings from './settings';
export const dynamic='force-dynamic';
export default async function Page(){const account=await getAccount(),owner=await isRequestOwner();const content=<><main className="wrap management-page booking-page"><h1>Il tuo account</h1>{account?<Settings name={account.name} email={account.email} mustChange={!!account.must_change_password} tutor={account.role==='tutor'}/>:<section className="booking-empty"><p>Accedi per gestire il tuo account.</p><a className="button dark" href="/accesso">Accedi</a></section>}</main></>;return owner?<ManagementShell owner>{content}</ManagementShell>:<StudentShell account={!!account}>{content}</StudentShell>;}
