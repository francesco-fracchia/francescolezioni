import {env} from '@/lib/runtime-env';
import {paymentConfig} from '@/lib/booking/runtime';
import {emailConfig} from '@/lib/notifications/runtime';
import {paymentMode,unconfiguredRuntimeStatus,type RuntimeStatus} from './runtime-status';
// Explicit public projection: never serialize paymentConfig(), keys or tokens.
export function currentRuntimeStatus():RuntimeStatus {
  try {
    const payments=paymentConfig(),email=emailConfig(),visibility=env.SITE_VISIBILITY;
    return {visibility:visibility==='public'?'public':visibility==='private'?'private':'unknown',emailMode:email.ready?'live':env.NOTIFICATIONS_MODE==='preview'?'preview':'disabled',paymentMode:paymentMode(!!payments.ready,payments.live)};
  }catch{return {...unconfiguredRuntimeStatus};}
}
