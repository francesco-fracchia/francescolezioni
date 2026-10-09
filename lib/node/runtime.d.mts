import type { D1Database } from '@cloudflare/workers-types';
import type { MaterialBucket } from '../storage-types';
export function dataDirectory(value?: string): string;
export function getNodeResources(): { root: string; DB: D1Database; BUCKET: MaterialBucket };
