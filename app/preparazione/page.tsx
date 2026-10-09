import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Sito in preparazione', robots: { index: false, follow: false } };
export default function PreparationPage() {
  return <main className="wrap booking-page"><img className="brand-logo" src="/francesco-fracchia-logo.png" alt="Francesco Fracchia" width={2172} height={724}/><h1>Il sito è in preparazione</h1><p>La piattaforma non è ancora aperta. Prenotazioni e accesso alle aree riservate saranno disponibili al termine della configurazione.</p></main>;
}
