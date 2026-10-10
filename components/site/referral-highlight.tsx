import { Users, Gift } from 'lucide-react';
import { rewardAmount } from '@/lib/referrals/rules';
export default function ReferralHighlight(){
 return <section className="referral-highlight" aria-labelledby="referral-highlight-title">
  <div><span className="public-card-label"><Gift size={19} aria-hidden="true"/>Invita un amico</span><h2 id="referral-highlight-title">Un credito per entrambi</h2><a className="text-link" href="/invita">Uso del credito e condizioni</a></div>
  <div className="referral-highlight-rewards">
   <article><strong>{rewardAmount('individual')/100} € a testa</strong><p>Dopo le prime 3 lezioni individuali svolte e pagate dal tuo amico.</p></article>
   <article><Users size={21} aria-hidden="true"/><strong>{rewardAmount('group')/100} € a testa</strong><p>Dopo 3 lezioni di gruppo insieme, svolte e pagate da entrambi.</p><small>Credito da usare sui gruppi.</small></article>
   <p className="referral-highlight-note">Solo per nuovi studenti invitati. Un solo premio, da usare sulle lezioni successive.</p>
  </div>
 </section>;
}
