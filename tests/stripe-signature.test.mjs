import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { validStripeSignature } from '../lib/booking/signature.ts';
test('authentic raw payload only; tampering and stale deliveries rejected', async()=>{
 const now=Date.now();const t=Math.floor(now/1000);const raw='{"type":"checkout.session.completed"}';const secret='test-webhook-secret';const sig=createHmac('sha256',secret).update(`${t}.${raw}`).digest('hex');
 assert.equal(await validStripeSignature(raw,`t=${t},v1=${sig}`,secret,now),true);
 assert.equal(await validStripeSignature(raw+' ',`t=${t},v1=${sig}`,secret,now),false);
 assert.equal(await validStripeSignature(raw,`t=${t},v1=${sig}`,secret,now+301000),false);
 assert.equal(await validStripeSignature(raw,`t=${t},v1=abcd`,secret,now),false);
});
