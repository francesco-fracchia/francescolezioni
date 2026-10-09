import { createRemoteDatabase } from './database.mjs';
import { createRemoteBucket } from './bucket.mjs';
const keys = ['CF_ACCOUNT_ID', 'CF_D1_DATABASE_ID', 'CF_D1_API_TOKEN', 'R2_BUCKET_NAME', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'];
export function vercelResourcesConfigured(config = process.env) {
  return keys.every(key => !!config[key]?.trim());
}
export function vercelRuntimeReady(config = process.env) {
  return config.VERCEL_RUNTIME_READY === '1' && vercelResourcesConfigured(config);
}
let resources;
export function getVercelResources() {
  if (!vercelResourcesConfigured()) throw new Error('Vercel data services are not configured');
  if (!resources) resources = {
    DB: createRemoteDatabase({ accountId: process.env.CF_ACCOUNT_ID, databaseId: process.env.CF_D1_DATABASE_ID, token: process.env.CF_D1_API_TOKEN }),
    BUCKET: createRemoteBucket({ accountId: process.env.CF_ACCOUNT_ID, bucket: process.env.R2_BUCKET_NAME, accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY }),
  };
  return resources;
}
