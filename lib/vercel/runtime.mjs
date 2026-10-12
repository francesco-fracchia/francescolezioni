import { createRemoteDatabase } from './database.mjs';
import { createRemoteBucket } from './bucket.mjs';
import { createTursoDatabase, tursoConfigured } from './turso.mjs';
const databaseKeys = ['CF_ACCOUNT_ID', 'CF_D1_DATABASE_ID', 'CF_D1_API_TOKEN'];
const archiveKeys = ['CF_ACCOUNT_ID', 'R2_BUCKET_NAME', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'];
export function vercelDatabaseConfigured(config = process.env) {
  // An incomplete Turso configuration must not fall back to another database.
  if (config.TURSO_DATABASE_URL || config.TURSO_AUTH_TOKEN) return tursoConfigured(config);
  return databaseKeys.every(key => !!config[key]?.trim());
}
export function vercelResourcesConfigured(config = process.env) {
  return vercelDatabaseConfigured(config) && archiveKeys.every(key => !!config[key]?.trim());
}
export function vercelRuntimeReady(config = process.env) {
  return config.VERCEL_RUNTIME_READY === '1' && vercelResourcesConfigured(config);
}
let resources;
export function getVercelResources() {
  if (!vercelResourcesConfigured()) throw new Error('Vercel data services are not configured');
  if (!resources) resources = {
    DB: process.env.TURSO_DATABASE_URL ? createTursoDatabase({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN }) : createRemoteDatabase({ accountId: process.env.CF_ACCOUNT_ID, databaseId: process.env.CF_D1_DATABASE_ID, token: process.env.CF_D1_API_TOKEN }),
    BUCKET: createRemoteBucket({ accountId: process.env.CF_ACCOUNT_ID, bucket: process.env.R2_BUCKET_NAME, accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY }),
  };
  return resources;
}
