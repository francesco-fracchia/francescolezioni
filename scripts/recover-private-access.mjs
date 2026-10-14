import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const [email, ...extra] = process.argv.slice(2);
if (!process.stdin.isTTY || !email || extra.length) throw new Error('Usa un terminale interattivo: recover-private-access.mjs EMAIL_TUTOR.');
console.log('1/2 — Nuova password del pannello tutor. I caratteri digitati non vengono mostrati.');
const tutor = spawnSync(process.execPath, [fileURLToPath(new URL('./vercel-database.mjs', import.meta.url)), 'reset-tutor', email], { stdio: 'inherit' });
if (tutor.status !== 0) {
  console.error('Recupero tutor non confermato. La password dell’anteprima non è stata modificata.');
  process.exitCode = 1;
} else {
  console.log('2/2 — Nuova password dell’anteprima del sito (può essere diversa).');
  const preview = spawnSync(process.execPath, [fileURLToPath(new URL('./vercel-preview-password.mjs', import.meta.url))], { stdio: 'inherit' });
  process.exitCode = preview.status === 0 ? 0 : 1;
  if (preview.status !== 0) console.error('La password tutor è già aggiornata. Per completare solo l’anteprima: node scripts/vercel-preview-password.mjs');
}
