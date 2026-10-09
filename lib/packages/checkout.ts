import {bookingDb,paymentConfig,stripe} from '@/lib/booking/runtime';
import {LearningError} from '@/lib/learning/access';

type Purchase={id:string;student_id:string;amount:number;units:number;status:string;payment_method:string;stripe_session:string|null;checkout_expires_at:number|null;live_mode:number};
export async function reconcilePurchase(id:string){
 const db=bookingDb(),p=await db.prepare('SELECT * FROM lesson_packages WHERE id=?').bind(id).first<Purchase>();
 if(!p||p.payment_method!=='online'||p.status!=='awaiting'||!p.stripe_session)return;
 const s=await stripe(`checkout/sessions/${encodeURIComponent(p.stripe_session)}`) as unknown as {id:string;livemode:boolean;payment_status:string;amount_total:number;currency:string;metadata:{package_id:string}};
 if(s.id!==p.stripe_session||s.livemode!==!!paymentConfig().live||s.livemode!==!!p.live_mode||s.amount_total!==p.amount||s.currency!=='eur'||s.metadata?.package_id!==id)throw new LearningError('Il pagamento richiede una verifica.',409);
 if(s.payment_status==='paid')await db.prepare("UPDATE lesson_packages SET status='active',paid_at=? WHERE id=? AND status='awaiting' AND stripe_session=? AND payment_method='online'").bind(new Date().toISOString(),id,s.id).run();
}
export async function openPurchase(id:string,studentId:string,units:1|5){
 const config=paymentConfig();if(!config.ready)throw new LearningError('I pagamenti online non sono ancora disponibili.',503);
 const db=bookingDb(),now=new Date().toISOString();
 await db.prepare("INSERT INTO lesson_packages(id,student_id,amount,units,unit_amount,payment_method,created_at,live_mode) SELECT ?,id,?,?,?,'online',?,? FROM students WHERE id=? AND status='active' ON CONFLICT(id) DO NOTHING").bind(id,units===5?9500:2000,units,units===5?1900:2000,now,config.live?1:0,studentId).run();
 const read=()=>db.prepare('SELECT * FROM lesson_packages WHERE id=? AND student_id=?').bind(id,studentId).first<Purchase>();
 let p=await read();if(!p||p.units!==units||p.payment_method!=='online'||!!p.live_mode!==!!config.live)throw new LearningError('Acquisto non disponibile.',409);
 await reconcilePurchase(id);p=await read();if(!p||p.status!=='awaiting')throw new LearningError('Acquisto già saldato o chiuso. Aggiorna la pagina.',409);
 if(p.stripe_session){
  const previous=await stripe(`checkout/sessions/${encodeURIComponent(p.stripe_session)}`) as unknown as {status:string;payment_status:string;url:string};
  if(previous.payment_status==='paid')throw new LearningError('Pagamento ricevuto. Aggiorna la pagina.',409);
  if(previous.status==='open'){if(!previous.url?.startsWith('https://checkout.stripe.com/'))throw Error('CHECKOUT_URL');return previous.url;}
  if(previous.status!=='expired')throw new LearningError('Contatta Francesco per verificare il pagamento.',409);
  await db.prepare("UPDATE lesson_packages SET stripe_session=NULL,checkout_expires_at=NULL WHERE id=? AND stripe_session=? AND status='awaiting'").bind(id,p.stripe_session).run();
 }
 await db.prepare("UPDATE lesson_packages SET checkout_expires_at=? WHERE id=? AND status='awaiting' AND checkout_expires_at IS NULL AND stripe_session IS NULL").bind(Math.floor(Date.now()/60000)*60+1860,id).run();
 p=await read();if(!p||p.status!=='awaiting'||!p.checkout_expires_at)throw new LearningError('Aggiorna la pagina prima di riprovare.',409);
 const student=await db.prepare("SELECT email FROM students WHERE id=? AND status='active'").bind(studentId).first<{email:string}>();if(!student)throw new LearningError('Studente non disponibile.',409);
 const expiry=p.checkout_expires_at,returnUrl=`${config.origin}/acquista?acquisto=${id}&studente=${studentId}`;
 const body=new URLSearchParams({mode:'payment',locale:'it','payment_method_types[0]':'card','line_items[0][price_data][currency]':'eur','line_items[0][price_data][unit_amount]':String(p.amount),'line_items[0][price_data][product_data][name]':units===5?'5 lezioni individuali · 55 minuti ciascuna':'Lezione individuale · 55 minuti','line_items[0][quantity]':'1',customer_email:student.email,'metadata[package_id]':id,success_url:returnUrl,cancel_url:returnUrl,expires_at:String(expiry)});
 const s=await stripe('checkout/sessions',body,`${id}-${expiry}`);
 if(s.livemode!==!!config.live||!s.url?.startsWith('https://checkout.stripe.com/'))throw Error('CHECKOUT_MISMATCH');
 const saved=await db.prepare("UPDATE lesson_packages SET stripe_session=? WHERE id=? AND status='awaiting' AND checkout_expires_at=? AND (stripe_session IS NULL OR stripe_session=?)").bind(s.id,id,expiry,s.id).run();
 if(!saved.meta.changes)throw new LearningError('Lo stato è cambiato. Aggiorna la pagina.',409);
 return s.url;
}
