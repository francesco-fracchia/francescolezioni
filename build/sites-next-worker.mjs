import worker from '../.open-next/worker.js';
export * from '../.open-next/worker.js';

// Next reconstructs Request.url from Host. Use the actual Worker request URL,
// not an inbound/proxy header, so origin checks remain strict and consistent.
export default {
  ...worker,
  fetch(request, env, ctx) {
    const url = new URL(request.url);
    const headers = new Headers(request.headers);
    headers.set('host', url.host);
    headers.set('x-forwarded-host', url.host);
    headers.set('x-forwarded-proto', url.protocol.slice(0, -1));
    return worker.fetch(new Request(request, { headers }), env, ctx);
  },
};
