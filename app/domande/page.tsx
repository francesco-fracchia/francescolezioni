import {publicPageMetadata} from '@/lib/site-seo';
import FAQ from '@/components/site/faq';
export function generateMetadata(){return publicPageMetadata('/domande');}
export default function Page(){return <main className="wrap subject-page"><section className="subject-intro"><h1>Informazioni sulle lezioni</h1><p>Pagamenti, prenotazioni, materiali e lezioni online. Apri la domanda che ti interessa oppure cercala qui sotto.</p></section><FAQ/><p>Per il programma di tuo figlio o per un dubbio sul tuo esame, <a className="text-link" href="/contatti">scrivimi direttamente</a>.</p></main>;}
