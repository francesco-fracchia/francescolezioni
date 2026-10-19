'use client';
import PageRecovery from '@/components/site/page-recovery';

// Independent of the root layout, its providers, global CSS and data services.
export default function GlobalError() {
  return <html lang="it"><head><title>Sito non disponibile | Francesco Fracchia</title><meta name="robots" content="noindex, nofollow"/></head><body style={{margin:0}}><PageRecovery kind="unavailable" onRetry={() => window.location.reload()}/></body></html>;
}
