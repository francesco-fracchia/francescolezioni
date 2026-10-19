import type {Metadata} from 'next';
import PageRecovery from '@/components/site/page-recovery';

export const metadata: Metadata = {title:'Pagina non trovata | Francesco Fracchia',robots:{index:false,follow:false}};
export default function NotFound() {return <PageRecovery kind="missing"/>;}
