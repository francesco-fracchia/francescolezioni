import type { D1Database } from '@cloudflare/workers-types';
export function privateAccessAllowed(request: Request, database: D1Database, visibility?: string): Promise<boolean>;
