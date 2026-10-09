import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const [command, ...args] = process.argv.slice(2);
if (!['dev', 'build', 'start'].includes(command)) throw new Error('Expected dev, build or start');
process.env.APP_RUNTIME = 'node';
process.env.NODE_ENV = command === 'dev' ? 'development' : 'production';
if (command === 'start') await import('./start-hostinger.mjs');
else {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url)), command, '--webpack', ...args], { stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}
