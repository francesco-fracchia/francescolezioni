import { headers } from 'next/headers';
import { createHash,randomBytes } from 'node:crypto';
import { bookingDb } from '@/lib/booking/runtime';

export const sessionCookie='ff_session';
export const sessionLifetime=12*60*60*1000;
export const authHeaders={'Cache-Control':'private, no-store','Vary':'Cookie'};
export type Account={id:string;name:string;email:string;role:'tutor'|'student'|'guardian';status:string;must_change_password:number;auth_version:number;session_hash:string};
export const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
export const newSessionToken=()=>randomBytes(32).toString('base64url');
export function readToken(value:string){const values=value.split(';').map(s=>s.trim()).filter(s=>s.startsWith(sessionCookie+'=')).map(s=>s.slice(sessionCookie.length+1));return values.length===1&&/^[A-Za-z0-9_-]{43}$/.test(values[0])?values[0]:null;}
export async function getAccount(request?:Request):Promise<Account|null>{
 const h=request?.headers||await headers();const token=readToken(h.get('cookie')||'');if(!token)return null;
 return bookingDb().prepare("SELECT a.id,a.name,a.email,a.role,a.status,a.must_change_password,a.auth_version,s.token_hash session_hash FROM accounts a JOIN account_sessions s ON s.account_id=a.id AND s.auth_version=a.auth_version WHERE s.token_hash=? AND s.expires_at>? AND a.status='active'").bind(digest(token),Date.now()).first<Account>();
}
export function cookie(request:Request,token:string|null){return `${sessionCookie}=${token||''}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${token?sessionLifetime/1000:0}${new URL(request.url).protocol==='https:'?'; Secure':''}`;}
export function sameAuthOrigin(request:Request){return request.headers.get('origin')===new URL(request.url).origin&&request.headers.get('sec-fetch-site')!=='cross-site';}
export function safeDestination(value:string|null){if(!value||!value.startsWith('/')||value.startsWith('//')||/[\\\r\n]/.test(value))return null;const url=new URL(value,'https://app.local');if(url.origin!=='https://app.local'||!(/^\/(studente|gestione)(\/|$)/.test(url.pathname)||url.pathname==='/acquista'))return null;return url.pathname+url.search;}
