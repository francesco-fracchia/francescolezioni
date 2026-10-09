import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
import path from 'node:path';

const nodeRuntime = process.env.APP_RUNTIME === 'node';

const nextConfig: NextConfig = {
  // Preserve the real request origin, including loopback hosts in local QA.
  skipProxyUrlNormalize: true,
  ...(nodeRuntime ? {} : { output: 'standalone' as const }),
  env: { APP_RUNTIME: nodeRuntime ? 'node' : 'cloudflare' },
  outputFileTracingRoot: process.cwd(),
  turbopack: { root: process.cwd() },
  images: { unoptimized: true },
  webpack(config, { webpack }) {
    // Workers must never bundle SQLite or filesystem code. The Node build
    // includes the adapter; the existing private Site keeps its D1/R2 bindings.
    if (!nodeRuntime) {
      config.resolve.alias['@/lib/node/runtime.mjs'] = path.resolve('lib/node/unavailable.mjs');
      config.plugins.push(new webpack.NormalModuleReplacementPlugin(
        /(?:^|\/)node\/runtime\.mjs$/,
        path.resolve('lib/node/unavailable.mjs'),
      ));
    }
    return config;
  },
  async headers() {
    return ['/gestione/:path*','/studente/:path*','/api/:path*','/account','/accesso','/prenota','/pagamento'].map(source => ({
      source, headers: [{ key:'X-Robots-Tag', value:'noindex, nofollow, noarchive' }],
    }));
  },
};

export default async function config(phase: string) {
  if (phase === PHASE_DEVELOPMENT_SERVER && !nodeRuntime) {
    await initOpenNextCloudflareForDev({
      configPath: 'wrangler.jsonc',
      persist: { path: '.wrangler/state/v3' },
    });
  }
  return nextConfig;
}
