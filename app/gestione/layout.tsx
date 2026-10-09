import {isRequestOwner} from '@/lib/request-admin';
import ManagementShell from '@/components/management/management-shell';
export const dynamic='force-dynamic';
export const metadata={title:'Area tutor | Francesco Fracchia'};
export default async function Layout({children}:{children:React.ReactNode}){return <ManagementShell owner={await isRequestOwner()}>{children}</ManagementShell>;}
