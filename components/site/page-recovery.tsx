'use client';
import BrandLogo from '@/components/site/brand-logo';
import WhatsAppIcon from './whatsapp-icon';
import {recoveryStyles} from '@/lib/page-recovery';

type Props = {
  kind: 'missing' | 'error' | 'unavailable';
  retryHref?: string;
  onRetry?: () => void;
};

export default function PageRecovery({kind, retryHref = '/', onRetry}: Props) {
  const missing = kind === 'missing';
  const title = missing ? 'Questa pagina non c’è' : kind === 'unavailable'
    ? 'Il sito non è disponibile al momento' : 'Non riesco a caricare questa pagina';
  return <main className="page-recovery" aria-labelledby="recovery-title">
    <style>{recoveryStyles}</style>
    <a className="recovery-brand-link" href="/" aria-label="Francesco Fracchia, pagina iniziale"><BrandLogo className="recovery-brand"  alt="Francesco Fracchia — Lezioni private"/></a>
    <p className="recovery-code">{missing ? 'Pagina non trovata · 404' : 'Problema temporaneo'}</p>
    <h1 id="recovery-title">{title}</h1>
    <p className="recovery-description">{missing
      ? 'Il collegamento potrebbe essere errato o la pagina potrebbe essere stata spostata. Puoi ripartire dalla home oppure scrivermi.'
      : 'Puoi riprovare tra poco. Se il problema continua, scrivimi su WhatsApp.'}</p>
    <div className="recovery-actions">
      {!missing && (onRetry
        ? <button className="recovery-action recovery-primary" type="button" onClick={onRetry}>Riprova</button>
        : <a className="recovery-action recovery-primary" href={retryHref} onClick={event => {
            // A proxy rewrite keeps the original address in the browser. Reload
            // it without copying private booking/payment query tokens into UI.
            if (kind === 'unavailable' && window.location.pathname !== '/indisponibile') {
              event.preventDefault();
              window.location.reload();
            }
          }}>Riprova</a>)}
      <a className={'recovery-action' + (missing ? ' recovery-primary' : '')} href="/">Torna alla home</a>
    </div>
    <a className="recovery-contact" href="https://wa.me/393500316324" target="_blank" rel="noopener noreferrer"><WhatsAppIcon/>Scrivimi su WhatsApp</a>
  </main>;
}
