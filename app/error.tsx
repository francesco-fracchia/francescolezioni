'use client';
import PageRecovery from '@/components/site/page-recovery';

export default function PageError({retry}: {error: unknown; retry: () => void}) {
  return <><title>Pagina non disponibile | Francesco Fracchia</title><meta name="robots" content="noindex, nofollow"/><PageRecovery kind="error" onRetry={retry}/></>;
}
