import {publicPageMetadata} from '@/lib/site-seo';
import {publicSlotSelection} from '@/lib/public-slot-selection';
import ConsultationBooking from '@/components/site/consultation-booking';
import { referralSelection } from '@/lib/referrals/rules';
import { publicSubjectSelection } from '@/lib/public-subject-selection';
export function generateMetadata(){return publicPageMetadata('/incontro');}
export default async function Page({searchParams}:{searchParams:Promise<{materia?:string|string[];invito?:string|string[];orario?:string|string[]}>}){const params=await searchParams,subject=publicSubjectSelection(params.materia),referralCode=referralSelection(params.invito),initialSlot=publicSlotSelection(params.orario);return <><main className="wrap booking-page consultation-page"><ConsultationBooking key={subject+referralCode+initialSlot} standalone initialSlot={initialSlot} subject={subject} referralCode={referralCode}/></main></>;}
