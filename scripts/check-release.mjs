import {writeFile} from 'node:fs/promises';
import {auditRelease} from '../lib/release-audit.mjs';

const args = process.argv.slice(2);
let target, report, local = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--origin' && args[i+1]) target = args[++i];
  else if (args[i] === '--report' && args[i+1]) report = args[++i];
  else if (args[i] === '--local') local = true;
  else throw Error('Uso: npm run check:release -- [--origin https://lezionifrancesco.app] [--local] [--report percorso.json]');
}
const result = await auditRelease({target, local});
console.log(local ? 'COLLAUDO LOCALE: non certifica dominio, DNS o certificato online.' : 'CONTROLLO ANONIMO DEL DOMINIO DEFINITIVO');
for (const check of result.checks) console.log(`${check.passed ? 'OK' : 'ERRORE'} ${check.path}${check.failures.length ? ' — ' + check.failures.join(' ') : ''}`);
console.log(result.passed ? 'Verifica tecnica R12 superata.' : 'Verifica tecnica R12 NON superata. Non attesta l’apertura.');
console.log('Questa verifica non attiva indicizzazione o servizi, non sostituisce la validazione privacy e non garantisce la presenza su Google.');
if (report) await writeFile(report, JSON.stringify(result, null, 2) + '\n', {mode:0o600});
process.exitCode = result.passed ? 0 : 1;
