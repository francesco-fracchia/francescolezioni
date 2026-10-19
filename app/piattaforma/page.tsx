import '@/app/public.css';
import {publicPageMetadata} from '@/lib/site-seo';
import {BookOpen,FileDown,LockKeyhole} from 'lucide-react';
import PlatformExample from '@/components/site/platform-example';
export function generateMetadata(){return publicPageMetadata('/piattaforma');}
export default function Platform(){return <main className="wrap subject-page">
 <section className="subject-intro"><h1>La tua area studente</h1><p>Qui ritrovi appuntamenti e materiali. Se vuoi esercitarti anche a casa, puoi consegnare il lavoro e leggere le correzioni.</p></section>
 <section className="reading-split"><div><h2>Consegni il lavoro</h2><p>Trovi piano, esercizi e riepiloghi. Puoi scrivere i passaggi e allegare il tuo lavoro, anche il codice di informatica.</p></div><div><h2>Rileggi le correzioni</h2><p>I miei commenti restano insieme alla consegna, per riprovare l’esercizio o riprenderlo a lezione.</p></div></section>
 <PlatformExample/>
 <section className="reading-split"><div><h2>Materiali assegnati</h2><p>Appunti ed esercizi divisi per argomento. Puoi segnare quelli completati.</p><a className="text-link" href="/percorsi">Programmi di ripasso</a></div><ul className="material-formats"><li><BookOpen aria-hidden="true"/><span><strong>Spiegazioni</strong>Da leggere nella tua area.</span></li><li><FileDown aria-hidden="true"/><span><strong>File</strong>Materiali assegnati da scaricare.</span></li></ul></section>
 <section className="reading-split"><div><span className="public-icon-badge"><LockKeyhole aria-hidden="true"/></span><h2>Accesso personale</h2><p>Assegno io l’accesso. Un genitore autorizzato può consultare la scheda dello studente.</p></div><div><dl className="reading-facts"><div><dt>Appuntamenti</dt><dd>Le lezioni fissate.</dd></div><div><dt>Videochiamate</dt><dd>Il link quando lo aggiungo.</dd></div><div><dt>Pagamenti</dt><dd>I saldi delle lezioni.</dd></div></dl></div></section>
 <p><a className="text-link" href="/metodo">Come si svolgono le lezioni e il lavoro da casa</a></p>
 <div className="actions"><a className="button dark" href="/incontro">Incontro gratuito</a><a className="button outline" href="/contatti">Chiedi informazioni</a></div>
 </main>;}
