export default function PrivacyNotice({purpose}:{purpose:string}) {
  return <p className="form-privacy">{purpose} Per i minorenni usa il recapito di un genitore. Non inviare diagnosi o certificazioni. <a className="text-link" href="/privacy" target="_blank" rel="noopener noreferrer">Leggi l’informativa privacy<span className="sr-only"> (si apre in una nuova scheda)</span></a>.</p>;
}
