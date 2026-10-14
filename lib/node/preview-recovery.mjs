const scope = 'francesco-fracchias-projects-c76d7b23';
const project = 'prj_EZPm8E8G08d0LcWFUpqEFA5UJtdR';

// Explicit owner command: the password travels on stdin, never in argv or logs.
export async function rotatePreviewPassword(password, run) {
  if (typeof password !== 'string' || password.length < 20 || password.length > 256 || password !== password.trim() || /[\r\n\0]/.test(password)) {
    throw new Error('Usa da 20 a 256 caratteri, senza spazi iniziali o finali.');
  }
  const options = ['--scope', scope, '--non-interactive'];
  const inspection = await run(['inspect', 'https://francescolezioni.vercel.app', '--json', ...options]);
  let deployment;
  try { deployment = JSON.parse(inspection.stdout); } catch { throw new Error('Non riesco a verificare il progetto Vercel. Nessuna password modificata.'); }
  if (inspection.status !== 0 || deployment.name !== 'francescolezioni' || deployment.contextName !== scope || deployment.target !== 'production' || deployment.readyState !== 'READY' || !/^dpl_[A-Za-z0-9]+$/.test(deployment.id)) {
    throw new Error('Progetto o deploy Vercel non corrispondente. Nessuna password modificata.');
  }
  const update = await run(['env', 'update', 'SITE_PREVIEW_PASSWORD', 'production', '--type', 'secret', '--yes', '--project', project, ...options], password);
  if (update.status !== 0) throw new Error('Aggiornamento Vercel non confermato. Controlla la variabile nel pannello prima di riprovare.');
  const redeploy = await run(['redeploy', deployment.id, '--target', 'production', '--no-wait', ...options]);
  if (redeploy.status !== 0) throw new Error('Password salvata su Vercel, ma deploy non confermato. Esegui Redeploy dal pannello Vercel; non serve reinserire la password.');
}
