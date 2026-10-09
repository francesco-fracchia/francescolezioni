import { mkdtemp, cp, readFile, writeFile, rm, lstat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const output = path.resolve(process.argv[2] || 'hostinger-release.zip');
if (!output.endsWith('.zip')) throw new Error('Use a .zip destination');
const temporary = await mkdtemp(path.join(tmpdir(), 'ff-hostinger-source-'));
try {
  const directories = ['app', 'components', 'lib', 'db', 'drizzle', 'scripts', 'build', 'deploy', 'public', 'tests'];
  for (const folder of directories) await cp(folder, path.join(temporary, folder), { recursive: true, filter: async source => {
    if ((await lstat(source)).isSymbolicLink()) throw new Error('The release cannot contain symbolic links');
    return !/^\.env|^\.dev\.vars/.test(path.basename(source));
  } });
  for (const file of ['package-lock.json', 'next.config.ts', 'tsconfig.json', 'cloudflare-env.d.ts', 'postcss.config.mjs', 'eslint.config.mjs', 'proxy.ts', 'README.md', 'PASSAGGIO_CHAT.md']) await cp(file, path.join(temporary, file));
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  // The uploaded release defaults to Node, while this working copy continues
  // supporting the existing private Site's build command.
  pkg.scripts.dev = pkg.scripts['dev:hostinger'];
  pkg.scripts.build = pkg.scripts['build:hostinger'];
  pkg.scripts.start = pkg.scripts['start:hostinger'];
  await writeFile(path.join(temporary, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
  await rm(output, { force: true });
  const result = spawnSync('zip', ['-q', '-r', output, '.'], { cwd: temporary, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('ZIP creation failed');
  console.log(`Hostinger source release created: ${output}. No local credentials, databases, uploads or development builds included.`);
} finally { await rm(temporary, { recursive: true, force: true }); }
