import type { D1Database } from '@cloudflare/workers-types';
import type { MaterialBucket } from '../storage-types';
export function vercelResourcesConfigured(config?: NodeJS.ProcessEnv): boolean;
export function vercelRuntimeReady(config?: NodeJS.ProcessEnv): boolean;
export function getVercelResources(): { DB: D1Database; BUCKET: MaterialBucket };
