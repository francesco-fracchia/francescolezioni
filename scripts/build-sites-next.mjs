import './sites-env.mjs';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

process.env.APP_RUNTIME = 'cloudflare';

const skip = process.argv.includes('--skip-next-build');
const cli = fileURLToPath(new URL('../node_modules/@opennextjs/cloudflare/dist/cli/index.js', import.meta.url));
const result = spawnSync(process.execPath, [cli, 'build',
  '--config', 'wrangler.jsonc', ...(skip ? ['--skipNextBuild'] : [])], { stdio: 'inherit' });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

// Sites keeps the same logical DB/BUCKET and owns production resource wiring.
// Only generated runtime files and public assets enter the deployment archive.
await rm('dist', { recursive: true, force: true });
await mkdir('dist/server', { recursive: true });
await cp('.open-next/assets', 'dist/client', { recursive: true });
// OpenNext normally embeds .env file defaults. Our deployment uses only the
// hosting panel's runtime secrets, never the developer's local configuration.
await writeFile('.open-next/cloudflare/next-env.mjs',
  'export const production = {};\nexport const development = {};\nexport const test = {};\n');
const wrangler = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url));
const bundled = spawnSync(process.execPath, [wrangler, 'deploy', 'build/sites-next-worker.mjs',
  '--dry-run', '--config', 'wrangler.jsonc', '--outdir', 'dist/server'], { stdio: 'inherit' });
if (bundled.error) throw bundled.error;
if (bundled.status !== 0) process.exit(bundled.status ?? 1);
await rm('dist/server/sites-next-worker.js.map', { force: true });
await rm('dist/server/README.md', { force: true });
await writeFile('dist/server/index.js', 'export { default } from "./sites-next-worker.js";\nexport * from "./sites-next-worker.js";\n');
await mkdir('dist/.openai', { recursive: true });
await cp('.openai/hosting.json', 'dist/.openai/hosting.json');
await cp('drizzle', 'dist/.openai/drizzle', { recursive: true });
