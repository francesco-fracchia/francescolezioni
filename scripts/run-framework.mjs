import './sites-env.mjs';
import { fileURLToPath } from 'node:url';
const [command, ...args] = process.argv.slice(2);
// Vercel cannot use Sites bindings or the Hostinger disk-backed database.
// Fail at build time rather than deploy a site whose data routes fail at runtime.
if (process.env.VERCEL === '1') {
  throw new Error('Vercel: external database and private material storage must be configured with a Vercel runtime first. Sites D1/R2 bindings and the Hostinger local SQLite runtime cannot be deployed directly. See deploy/vercel/README.md.');
}
if (command === 'dev') {
  process.env.NODE_ENV = 'development';
  await import('./dev-next.mjs');
} else if (command === 'build' || command === 'start') {
  const cli = new URL('../node_modules/next/dist/bin/next', import.meta.url);
  process.argv = [process.execPath, fileURLToPath(cli), command,
    ...(command === 'build' ? ['--webpack'] : []), ...args];
  await import(cli.href);
} else {
  throw new Error('Expected dev, build or start.');
}
