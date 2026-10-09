import type { D1Database } from "@cloudflare/workers-types";
import type { MaterialBucket } from './lib/storage-types';

declare global {
 namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    REQUEST_OWNER_EMAIL?: string;
    STRIPE_SECRET_KEY?: string;
    PAYMENT_LIVE_ENABLED?: string;
    RESEND_API_KEY?: string;
    EMAIL_FROM?: string;
    EMAIL_REPLY_TO?: string;
    NOTIFICATIONS_MODE?: string;
    STRIPE_WEBHOOK_SECRET?: string;
    SITE_ORIGIN?: string;
    PUBLIC_SITE_INDEXING?: string;
    BOOKING_OWNER_USER_ID?: string;
    BOOKING_SCHEDULE_ENABLED?: string;
    BUCKET?: MaterialBucket;
  }
}

 interface CloudflareEnv extends Cloudflare.Env {}
}
