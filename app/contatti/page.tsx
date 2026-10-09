import {publicPageMetadata} from '@/lib/site-seo';
import {examContactMessage} from '@/lib/exam-preparation';
import ContactForm from '@/components/site/contact-form';
import { referralSelection } from '@/lib/referrals/rules';
import { publicSubjectSelection } from '@/lib/public-subject-selection';
export function generateMetadata(){return publicPageMetadata('/contatti');}
export default async function Page({searchParams}:{searchParams:Promise<{materia?:string|string[];invito?:string|string[];piano?:string|string[];argomenti?:string|string[];extra?:string|string[]}>}){const params=await searchParams,initialMessage=examContactMessage(params),subject=publicSubjectSelection(params.materia),referralCode=referralSelection(params.invito);return <><main className="wrap contact-page"><ContactForm key={subject+referralCode+initialMessage} standalone initialMessage={initialMessage} subject={subject} referralCode={referralCode}/></main></>;}
