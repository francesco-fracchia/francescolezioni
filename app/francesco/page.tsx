import '@/app/public.css';
import Portrait from '@/components/site/portrait';
import {publicPageMetadata} from '@/lib/site-seo';
import {MessagesSquare} from 'lucide-react';
import WhatsAppIcon from '@/components/site/whatsapp-icon';
export function generateMetadata(){return publicPageMetadata('/francesco');}
export default function Page(){return <main className="wrap subject-page profile-page">
 <section className="subject-intro profile-intro"><Portrait className="profile-portrait" placement="profile"/><div><h1>Ciao, sono Francesco.</h1><p>Insegno informatica al Volta di Lodi. Mi sono laureato in Informatica e frequento la magistrale; al Volta ho studiato Informatica e Telecomunicazioni.</p></div></section>
 <section className="reading-split profile-story"><div><h2>Le lezioni</h2></div><div><p>Nelle lezioni di matematica e informatica partiamo da quello che stai facendo a scuola o all’università. Possiamo riprendere un argomento, esercitarci per una verifica o seguire il programma di un esame. Decidiamo insieme da dove cominciare.</p><a className="text-link" href="/metodo">Come lavoro a lezione</a></div></section>
 <section className="reading-split"><div><span className="public-icon-badge"><MessagesSquare aria-hidden="true"/></span><h2>Un passo alla volta</h2></div><div><p>Se qualcosa non è chiaro, ci fermiamo e lo riguardiamo con calma. Puoi fare domande e chiedermi di riprendere un passaggio, anche se lo abbiamo già affrontato.</p></div></section>
 <section className="reading-split"><div><h2>DSA e modo di studiare</h2></div><div><p>Quando ci sono esigenze legate ai DSA, concordiamo il lavoro tenendo conto delle abitudini di studio e degli strumenti già usati a scuola. Tempi e materiali si possono adattare a ciò che è utile.</p></div></section>
 <section className="conversation-panel"><h2>Scrivimi</h2><p>Dimmi la materia, la classe o l’esame da preparare. Puoi contattarmi anche per tuo figlio.</p><div className="actions"><a className="button dark" href="https://wa.me/393500316324" target="_blank" rel="noopener noreferrer"><WhatsAppIcon/>Scrivimi su WhatsApp</a><a className="button outline" href="/incontro">Incontro gratuito</a></div></section>
 </main>;}
