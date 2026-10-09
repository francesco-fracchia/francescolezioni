import {publicPageMetadata} from '@/lib/site-seo';
import ContactForm from '@/components/site/contact-form';
import ReferralTerms from '@/components/site/referral-terms';
import { referralSelection } from '@/lib/referrals/rules';
import { validateReferral } from '@/lib/referrals/server';
export const dynamic='force-dynamic';
export function generateMetadata(){return publicPageMetadata('/invita');}
export default async function Page({searchParams}:{searchParams:Promise<{codice?:string|string[]}>}){
 const params=await searchParams;const selected=referralSelection(params.codice);let code='',error='';
 if(params.codice){if(!selected)error='Questo codice invito non è valido.';else try{await validateReferral(selected);code=selected;}catch{error='Il codice invito non è disponibile. Puoi comunque contattarmi senza codice.';}}
 return <><main className="wrap referral-page"><h1>Invita un amico</h1><p>Puoi fare lezione con un compagno per preparare la stessa verifica o lo stesso esame, a Lodi o online.</p><p>In coppia o in gruppo la quota è di <strong>15 € a persona</strong>, invece di 20 € per una lezione individuale. Prima guardiamo il programma e concordiamo gli orari.</p>{error&&<p className="error" role="alert">{error}</p>}{code&&<p className="referral-code-note">Codice invito: <strong>{code}</strong>. È già inserito nel modulo e nel collegamento all’incontro gratuito.</p>}<ReferralTerms/><div className="actions"><a className="button dark" href={'/incontro'+(code?'?invito='+code:'')}>Prenota un incontro gratuito</a><a className="button outline" href="#contatto">Chiedi informazioni</a></div><section id="contatto"><ContactForm key={code} referralCode={code}/></section></main></>;
}
