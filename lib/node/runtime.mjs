import path from 'node:path';
import { mkdirSync, realpathSync, lstatSync } from 'node:fs';
import { openDatabase } from './database.mjs';
import { createMaterialBucket } from './bucket.mjs';

export function dataDirectory(value = process.env.APP_DATA_DIR) {
  if (!value || !path.isAbsolute(value)) throw new Error('APP_DATA_DIR must be an absolute persistent path outside the deployment.');
  const requested = path.resolve(value);
  const project = realpathSync(process.cwd());
  if (requested === project || requested.startsWith(project + path.sep) || /(^|\/)(public_html|hbuilds|\.next|public)(\/|$)/.test(requested)) {
    throw new Error('APP_DATA_DIR must not be inside the application or public/build folders.');
  }
  mkdirSync(requested, { recursive: true, mode: 0o700 });
  if (lstatSync(requested).isSymbolicLink()) throw new Error('APP_DATA_DIR cannot be a symbolic link');
  const root = realpathSync(requested);
  if (root === project || root.startsWith(project + path.sep) || /(^|\/)(public_html|hbuilds|\.next|public)(\/|$)/.test(root)) {
    throw new Error('APP_DATA_DIR must not be inside the application or public/build folders.');
  }
  return root;
}
const resourceKey = Symbol.for('ff.platform.node.resources');
export function getNodeResources() {
  const root = dataDirectory();
  const current = globalThis[resourceKey];
  if (current) {
    if (current.root !== root) throw new Error('APP_DATA_DIR changed while the application was running. Restart first.');
    return current;
  }
  const DB = openDatabase(path.join(root, 'platform.sqlite'));
  try {
    // Requests never initialize the schema. Deployment runs the migrations.
    DB.sql.prepare('SELECT id, live_mode FROM lesson_packages LIMIT 0').all();
    DB.sql.prepare('SELECT id FROM accounts LIMIT 0').all();
    const resources = { root, DB, BUCKET: createMaterialBucket(path.join(root, 'materials')) };
    globalThis[resourceKey] = resources;
    return resources;
  } catch (error) { DB.close(); throw error; }
}
