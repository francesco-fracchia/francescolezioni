import type {Metadata} from 'next';
import PageRecovery from '@/components/site/page-recovery';
import {recoveryPath} from '@/lib/page-recovery';

export const metadata: Metadata = {title:'Sito non disponibile | Francesco Fracchia',robots:{index:false,follow:false}};
export default async function Unavailable({searchParams}: {searchParams: Promise<{da?: string | string[]}>}) {
  const {da} = await searchParams;
  return <PageRecovery kind="unavailable" retryHref={recoveryPath(da)}/>;
}
