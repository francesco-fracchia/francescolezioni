import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getNodeResources } from '@/lib/node/runtime.mjs';

// Resolve bindings at use time, inside the current request. Importing a page
// during `next build` must not read a database or capture another user's context.
// This is the only provider boundary used by the application.
export const env = new Proxy({} as Cloudflare.Env, {
  get(_target, key: keyof Cloudflare.Env) {
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
