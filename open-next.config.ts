import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// Pages render per request; this small private deployment needs no ISR cache,
// cache bucket or queue. DB and material storage keep their existing bindings.
export default defineCloudflareConfig();
