import { randomUUID, randomBytes, scrypt } from 'node:crypto';

export async function createFirstTutor(database, email, password, name = 'Francesco Fracchia') {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length > 254) throw new Error('A valid tutor email is required.');
  if (typeof password !== 'string' || [...password].length < 15 || [...password].length > 128 || Buffer.byteLength(password, 'utf8') > 512) throw new Error('The tutor password must contain 15–128 characters.');
  const salt = randomBytes(16);
  const key = await new Promise((resolve, reject) => scrypt(password, salt, 32, { N: 16384, r: 8, p: 5, maxmem: 32 * 1024 * 1024 }, (error, result) => error ? reject(error) : resolve(result)));
  const hash = `scrypt:16384:8:5:${salt.toString('hex')}:${key.toString('hex')}`;
  const now = new Date().toISOString();
  const result = await database.prepare("INSERT INTO accounts(id,email,name,role,password_hash,must_change_password,created_at,updated_at) SELECT ?,?,?,'tutor',?,0,?,? WHERE NOT EXISTS(SELECT 1 FROM accounts WHERE role='tutor')").bind(randomUUID(), email.trim().toLowerCase(), name, hash, now, now).run();
  if (result.meta.changes !== 1) throw new Error('A tutor already exists. Bootstrap never replaces accounts.');
}
