import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getNodeResources } from '@/lib/node/runtime.mjs';
import { getVercelResources } from '@/lib/vercel/runtime.mjs';

// Resolve bindings at use time, inside the current request. Importing a page
// during `next build` must not read a database or capture another user's context.
// This is the only provider boundary used by the application.
export const env = new Proxy({} as Cloudflare.Env, {
  get(_target, key: keyof Cloudflare.Env) {
    if (process.env.APP_RUNTIME === 'vercel') {
      if (key === 'DB' || key === 'BUCKET') return getVercelResources()[key];
      // Preview deployments never enable indexing or live communication.
      if (process.env.VERCEL_ENV !== 'production') {
        if (key === 'PUBLIC_SITE_INDEXING') return 'false';
        if (key === 'NOTIFICATIONS_MODE') return 'preview';
        if (key === 'PAYMENT_LIVE_ENABLED') return '0';
        if (key === 'STRIPE_SECRET_KEY' || key === 'STRIPE_WEBHOOK_SECRET' || key === 'RESEND_API_KEY') return undefined;
      }
      return process.env[key];
    }
    if (process.env.APP_RUNTIME === 'node') {
      if (key === 'DB' || key === 'BUCKET') return getNodeResources()[key];
      return process.env[key];
    }
    const value = (getCloudflareContext().env as Cloudflare.Env)[key];
    // OpenNext's Node dev proxy supplies resource bindings; Next itself loads
    // local .env configuration. Production values come solely from the host.
    if (value === undefined && process.env.NODE_ENV === 'development' && key !== 'DB' && key !== 'BUCKET') {
      return process.env[key];
    }
    return value;
  },
});
