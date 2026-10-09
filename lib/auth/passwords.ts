import { scrypt,timingSafeEqual,randomBytes } from 'node:crypto';

// OWASP's 16 MiB alternative to the default 128 MiB scrypt profile.
// Uses the runtime implementation rather than JavaScript cryptography.
const options={N:16384,r:8,p:5,maxmem:32*1024*1024};
const prefix='scrypt:16384:8:5';
function derive(password:string,salt:Buffer){return new Promise<Buffer>((resolve,reject)=>scrypt(password,salt,32,options,(error,key)=>error?reject(error):resolve(key)));}
export function acceptablePassword(password:string){return [...password].length>=15&&[...password].length<=128&&Buffer.byteLength(password,'utf8')<=512;}
export function temporaryPassword(){return randomBytes(24).toString('base64url');}
export async function hashPassword(password:string){const salt=randomBytes(16);const key=await derive(password,salt);return `${prefix}:${salt.toString('hex')}:${key.toString('hex')}`;}
export async function verifyPassword(password:string,encoded:string|null){
 const match=encoded?.match(/^scrypt:16384:8:5:([a-f0-9]{32}):([a-f0-9]{64})$/);
 const salt=match?Buffer.from(match[1],'hex'):Buffer.alloc(16);
 const expected=match?Buffer.from(match[2],'hex'):Buffer.alloc(32);
 const actual=await derive(password,salt);
 return timingSafeEqual(expected,actual)&&!!match;
}
