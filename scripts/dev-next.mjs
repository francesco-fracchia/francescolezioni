import './sites-env.mjs';
import { createServer } from 'node:http';
import { AsyncLocalStorage } from 'node:async_hooks';
import next from 'next';
import { createLocalSitesAuth } from '../build/local-sites-auth.mjs';

// The owner sign-in simulation is confined to this loopback-only dev server.
// It is never imported by Next's production server or the published Worker.
const port = 5173;
const hostname = '127.0.0.1';
// Next's CLI normally installs this before loading the dev config. Our custom
// loopback server needs the same initialization for OpenNext's local bindings.
globalThis.AsyncLocalStorage ??= AsyncLocalStorage;
const app = next({ dev: true, hostname, port, webpack: true });
await app.prepare();
const handle = app.getRequestHandler();
const localAuth = createLocalSitesAuth();
const server = createServer((request, response) => {
  localAuth(request, response, () => handle(request, response));
});
// Next attaches its own HMR upgrade handler to request.socket.server.
// Attaching a second handler processes the same socket twice.
server.listen(port, hostname, () => {
  console.log(`Next.js preview: http://${hostname}:${port}`);
});
async function stop() {
  server.close();
  await app.close();
  process.exit(0);
}
process.once('SIGTERM', stop);
process.once('SIGINT', stop);
