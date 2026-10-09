import { env } from '@/lib/runtime-env';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getAccount } from '@/lib/auth/session';
export async function isRequestOwner(){const account=await getAccount();if(account)return account.role==='tutor'&&!account.must_change_password;const user=await getChatGPTUser();return !!user&&!!env.REQUEST_OWNER_EMAIL&&user.email.toLowerCase()===env.REQUEST_OWNER_EMAIL.toLowerCase();}
