import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';
import { spawnSync } from 'node:child_process';
import { rotatePreviewPassword } from '../lib/node/preview-recovery.mjs';

if (!process.stdin.isTTY || process.argv.length !== 2) throw new Error('Apri un terminale interattivo. Non passare password come argomento.');
let muted = false;
const output = new Writable({ write(chunk, encoding, callback) { if (!muted) process.stdout.write(chunk, encoding); callback(); } });
const prompt = createInterface({ input: process.stdin, output, terminal: true });
const ask = label => new Promise((resolve, reject) => {
  const cancel = () => { muted = false; reject(new Error('Operazione annullata.')); };
  prompt.once('SIGINT', cancel);
  muted = false;
  prompt.question(label, value => { prompt.removeListener('SIGINT', cancel); muted = false; process.stdout.write('\n'); resolve(value); });
  muted = true;
});
try {
  const password = await ask('Nuova password anteprima (20–256 caratteri, nascosta): ');
  if (password !== await ask('Ripeti la password: ')) throw new Error('Le password non coincidono.');
  prompt.close();
  const childEnv = Object.fromEntries(['HOME', 'PATH', 'TMPDIR', 'LANG', 'LC_ALL', 'TERM', 'USER', 'LOGNAME'].filter(key => process.env[key]).map(key => [key, process.env[key]]));
  console.log('Aggiorno soltanto SITE_PREVIEW_PASSWORD in Production; il sito resta privato.');
  await rotatePreviewPassword(password, (args, input) => {
    const result = spawnSync('npx', ['--yes', '--package=vercel@62.1.0', 'vercel', ...args], { input, encoding: 'utf8', env: childEnv, maxBuffer: 5 * 1024 * 1024 });
    // Provider logs stay captured: never echo a password or an uncertain response.
    return { status: result.status, stdout: result.stdout || '' };
  });
  console.log('Nuova password salvata e deploy avviato. Quando Vercel mostra Ready, entra su https://francescolezioni.vercel.app/anteprima con la nuova password.');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Operazione non confermata. Controlla Vercel prima di riprovare.');
  process.exitCode = 1;
} finally { muted = false; prompt.close(); }
