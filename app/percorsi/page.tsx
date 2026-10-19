import '@/app/public.css';
import {publicPageMetadata} from '@/lib/site-seo';
import RevisionProgrammes from '@/components/site/revision-programmes';

export function generateMetadata(){return publicPageMetadata('/percorsi');}

export default async function Page({searchParams}:{searchParams:Promise<{percorso?:string|string[]}>}){
 const {percorso}=await searchParams;
 return <RevisionProgrammes key={typeof percorso==='string'?percorso:''} initialSlug={typeof percorso==='string'?percorso:undefined}/>;
}
