import WhatsAppIcon from './whatsapp-icon';
export default function ResponseExpectation({matching = false,email}: {matching?: boolean;email?:string}) {
  return <div className="response-expectation"><p>Ti rispondo{email&&<> a <strong>{email}</strong></>} entro 1 giorno lavorativo.{matching && ' Per trovare un gruppo con programma e orari compatibili può servire più tempo.'}</p><p>Se la verifica o l’esame sono vicini, <a className="whatsapp-link" href="https://wa.me/393500316324" target="_blank" rel="noopener noreferrer"><WhatsAppIcon/>scrivimi su WhatsApp</a> indicando la data.</p></div>;
}
