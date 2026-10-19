import {MapPin,Phone} from 'lucide-react';
import {publicBusiness} from '@/lib/public-business';
import {studio} from '@/lib/public-offer';
import WhatsAppIcon from './whatsapp-icon';

export default function PublicFooter({inert=false}:{inert?:boolean}){return <footer className="public-footer" inert={inert||undefined}>
  <div className="wrap footer-main">
    <div className="footer-contact"><strong>{publicBusiness.name}</strong><p>Matematica e informatica.<br/>A Lodi e online, su appuntamento.</p>
      <a className="text-link whatsapp-link" href={'https://wa.me/'+publicBusiness.phone.slice(1)} target="_blank" rel="noopener noreferrer"><WhatsAppIcon/>Scrivimi su WhatsApp</a>
      <a className="footer-phone" href={'tel:'+publicBusiness.phone}><Phone size={17} aria-hidden="true"/>{publicBusiness.phoneLabel}</a>
    </div>
    <div className="footer-link-group"><h2>Lezioni e studio</h2><nav aria-label="Lezioni e studio"><a href="/lezioni/matematica">Matematica</a><a href="/lezioni/informatica">Informatica</a><a href="/esami">Esami universitari</a><a href="/maturita">Preparazione alla maturità</a><a href="/prezzi">Prezzi e pacchetti</a><a href="/percorsi">Programmi di ripasso</a></nav></div>
    <div className="footer-link-group"><h2>Informazioni e accesso</h2><nav aria-label="Informazioni e accesso"><a href="/incontro">Incontro gratuito</a><a href="/studente">Accedi all’area studente</a><a href="/piattaforma">Area studente: un esempio</a><a href="/domande">Domande frequenti</a><a href="/invita">Invita un amico · bonus</a><a href="/contatti">Contatti</a><a href="/privacy">Dati e privacy</a></nav></div>
  </div>
  <div className="wrap footer-business"><div><h2>Sede operativa</h2><address><MapPin size={17} aria-hidden="true"/><span>{studio.address}<br/>{studio.city}</span></address><a href="/lodi">Sede e lezioni online</a></div>
    <div><h2>Dati dell’attività</h2><p>{publicBusiness.name}<br/><span>P. IVA {publicBusiness.vatNumber}</span></p></div>
  </div>
</footer>;}
