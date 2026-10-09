import WhatsAppIcon from '@/components/site/whatsapp-icon';
import type { Metadata } from 'next';
import {publicPageMetadata} from '@/lib/site-seo';
import SubjectTopics from '@/components/site/subject-topics';
import { notFound } from 'next/navigation';
import { MapPin, Monitor } from 'lucide-react';
import { bookingRules } from '@/lib/catalog';
import { studyPaths } from '@/lib/paths';
import { studio, studioCopy } from '@/lib/public-offer';
import { getPublicSubject } from '@/lib/public-subjects';

type Props = { params: Promise<{ materia: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const subject = getPublicSubject((await params).materia);
  return subject ? publicPageMetadata('/lezioni/'+(await params).materia) : {};
}

export default async function SubjectPage({ params }: Props) {
  const slug = (await params).materia;
  const subject = getPublicSubject(slug);
  if (!subject) notFound();
  const paths = studyPaths.filter(path => subject.paths.some(pathSlug => pathSlug === path.slug));

  return <>


    <main id="main" className="wrap subject-page">
      <section className="subject-intro">
        <p className="subject-audience">Con Francesco Fracchia · Superiori e università</p>
        <h1>{subject.title}</h1>
        <p>{subject.introduction}</p>
        <div className="locations"><span><MapPin size={17}/>A Lodi</span><span><Monitor size={17}/>Online</span></div>
        <div className="actions">
          <a className="button dark" href={`/incontro?materia=${slug}`}>Prenota un incontro gratuito</a>
          <a className="button outline subject-whatsapp" href="https://wa.me/393500316324" target="_blank" rel="noopener noreferrer"><WhatsAppIcon/>Scrivimi su WhatsApp</a>
        </div>
        <p className="subject-intro-note">{bookingRules.consultationMinutes} minuti per conoscerci, senza impegno. Puoi anche <a href={`/contatti?materia=${slug}`}>lasciarmi un messaggio</a>.</p>
      </section>

      <section className="subject-topics" aria-labelledby="argomenti-title">
        <h2 id="argomenti-title">Gli argomenti</h2>
        <p>Ci basiamo sul programma della tua scuola o del tuo corso. Questi sono alcuni degli argomenti su cui possiamo lavorare.</p>
        <SubjectTopics school={subject.school} university={subject.university}/>
      </section>

      <section className="subject-lesson">
        <div><h2>Durante la lezione</h2><p>{subject.lesson}</p><p>Tra gli incontri concordiamo gli esercizi e gli argomenti da ripassare. Ti assegno i materiali e rivediamo il lavoro svolto.</p></div>
        <aside><h3>Cosa portare</h3><p>{subject.preparation}</p></aside>
      </section>

      <section className="subject-formats" aria-labelledby="modalita-title">
        <h2 id="modalita-title">In presenza o online</h2>
        <div className="subject-topic-columns">
          <article><h3>{studio.address}, {studio.city}</h3><p className="booking-badge">{studioCopy.status}</p><p>{studioCopy.description}</p><a className="text-link" href={studio.mapsUrl} target="_blank" rel="noopener noreferrer">Apri l’indirizzo su Google Maps</a></article>
          <article><h3>In videochiamata</h3><p>{subject.online}</p><p>Per un chiarimento breve puoi scrivermi su WhatsApp.</p></article>
        </div>
      </section>

      <section className="subject-prices" aria-labelledby="prezzi-title">
        <h2 id="prezzi-title">Quanto costa</h2>
        <p>Ogni lezione dura {bookingRules.lessonMinutes} minuti, con {bookingRules.bufferMinutes} minuti tra un appuntamento e il successivo.</p>
        <dl><div><dt>Lezione individuale</dt><dd><strong>{bookingRules.individualPrice} €</strong> / lezione</dd></div><div><dt>Gruppo da 2 a {bookingRules.maxGroupSize} studenti</dt><dd><strong>{bookingRules.groupPrice} €</strong> a persona / lezione</dd></div></dl>
        <p>{subject.group}</p>
        <p>Se cerchi compagni, la lista è gratuita. Può servire tempo per trovare persone compatibili; ricevi la proposta e decidi se partecipare.</p>
        <div className="actions"><a className="text-link" href="/?richiesta=group">Chiedi un gruppo</a><a className="text-link" href="/prezzi">Pacchetti e pagamenti</a></div>
        <p className="subject-condition">Per le lezioni a pagamento ci accordiamo personalmente e ti comunico le condizioni di cancellazione prima della conferma.</p>
      </section>

      <section className="subject-about">
        <h2>Ciao, sono Francesco.</h2>
        <p>Sono laureato in Informatica e frequento la magistrale. Puoi farmi domande e chiedermi di rispiegare un passaggio: lo riprendiamo insieme.</p><a className="text-link" href="/francesco">La mia esperienza e il rapporto con gli studenti</a>
      </section>

      <section className="subject-programs">
        <h2>Programmi da consultare</h2><p><a href="/esami">Esami universitari: argomenti e numero di lezioni</a> · <a href="/maturita">Ripasso per la maturità</a></p>
        <p>Puoi leggere gli argomenti dei percorsi. I corsi registrati sono in preparazione e non sono ancora in vendita.</p>
        <div className="subject-page-links">{paths.map(path => <a key={path.slug} className="text-link" href={`/percorsi?percorso=${path.slug}`}>{path.name}</a>)}</div>
      </section>

      <section className="subject-contact"><h2>Dimmi cosa devi preparare</h2><p>Puoi scrivermi anche se non sai ancora quante lezioni ti servono.</p><a className="button dark" href={`/contatti?materia=${slug}`}>Chiedi informazioni</a></section>
      <nav className="subject-other" aria-label="Altre lezioni"><a className="text-link" href={slug === 'matematica' ? '/lezioni/informatica' : '/lezioni/matematica'}>Lezioni di {slug === 'matematica' ? 'informatica' : 'matematica'}</a><a className="text-link" href="/catalogo">Lezioni individuali e gruppi</a></nav>
    </main>
  </>;
}
