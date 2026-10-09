import type { Metadata } from 'next';
import {ArrowRight,Calculator,Code2,MapPin,Video} from 'lucide-react';
import WhatsAppIcon from '@/components/site/whatsapp-icon';
import './preparation.css';
export const metadata: Metadata = { title: 'Sito in preparazione', robots: { index: false, follow: false } };
export default function PreparationPage() {
 return <div className="preparation-shell">
  <header className="preparation-header"><img src="/francesco-fracchia-logo.png" alt="Francesco Fracchia — Lezioni private" width={2172} height={724}/><span className="preparation-status"><span aria-hidden="true"/>Sito in preparazione</span></header>
  <main className="preparation-main">
   <section className="preparation-copy"><p className="preparation-eyebrow">Lezioni private · Superiori e università</p><h1>Sto preparando<br/>il nuovo sito<br/><span>delle mie lezioni.</span></h1><p className="preparation-description">Matematica e informatica, a Lodi e online. Qui troverai i programmi, i materiali e il calendario per prenotare gli incontri.</p><p className="preparation-contact">Per informazioni sulle lezioni puoi già scrivermi.</p><a className="preparation-whatsapp" href="https://wa.me/393500316324" target="_blank" rel="noopener noreferrer"><WhatsAppIcon/>Scrivimi su WhatsApp<ArrowRight size={18} aria-hidden="true"/></a><div className="preparation-modes"><span><MapPin size={17} aria-hidden="true"/>In presenza a Lodi</span><span><Video size={18} aria-hidden="true"/>Lezioni online</span></div></section>
   <div className="preparation-art" aria-hidden="true"><div className="preparation-art-heading"><span>Francesco · Lezioni</span><span className="preparation-art-dot"/></div><div className="preparation-math"><span>Matematica</span><strong>f(x) = x²</strong><svg viewBox="0 0 360 165" fill="none"><path d="M35 135H330M180 15V150" stroke="#cbd8e9"/><path d="M63 21Q180 248 297 21" stroke="#456be0" strokeWidth="4" strokeLinecap="round"/><circle cx="180" cy="135" r="5" fill="#456be0"/><path d="M50 70H315M50 105H315M95 20V150M265 20V150" stroke="#e8eef8" strokeDasharray="4 5"/></svg></div><div className="preparation-code"><span>Informatica</span><code><span>const</span> x = 2;<br/><span>const</span> y = x ** 2;<br/>console.log(y);</code></div><div className="preparation-art-subjects"><span><Calculator size={18}/>Esercizi</span><span><Code2 size={19}/>Codice</span></div></div>
  </main>
  <footer className="preparation-footer"><p>Francesco Fracchia<span>Matematica e informatica · Lodi</span></p><a href="/anteprima">Accesso riservato<ArrowRight size={16} aria-hidden="true"/></a></footer>
 </div>;
}
