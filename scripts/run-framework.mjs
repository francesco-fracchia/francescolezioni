import './sites-env.mjs';
import { fileURLToPath } from 'node:url';
const [command, ...args] = process.argv.slice(2);
if (process.env.VERCEL === '1') {
  await import('./run-vercel.mjs');
  process.exit(process.exitCode ?? 0);
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
