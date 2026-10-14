import { randomUUID, randomBytes, scrypt } from 'node:crypto';

function tutorEmail(email) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length > 254) throw new Error('A valid tutor email is required.');
  return email.trim().toLowerCase();
}

async function tutorPasswordHash(password) {
  if (typeof password !== 'string' || [...password].length < 15 || [...password].length > 128 || Buffer.byteLength(password, 'utf8') > 512) throw new Error('The tutor password must contain 15–128 characters.');
  const salt = randomBytes(16);
  const key = await new Promise((resolve, reject) => scrypt(password, salt, 32, { N: 16384, r: 8, p: 5, maxmem: 32 * 1024 * 1024 }, (error, result) => error ? reject(error) : resolve(result)));
  return `scrypt:16384:8:5:${salt.toString('hex')}:${key.toString('hex')}`;
}

export async function createFirstTutor(database, email, password, name = 'Francesco Fracchia') {
  email = tutorEmail(email);
  const hash = await tutorPasswordHash(password);
  const now = new Date().toISOString();
  const result = await database.prepare("INSERT INTO accounts(id,email,name,role,password_hash,must_change_password,created_at,updated_at) SELECT ?,?,?,'tutor',?,0,?,? WHERE NOT EXISTS(SELECT 1 FROM accounts WHERE role='tutor')").bind(randomUUID(), email.trim().toLowerCase(), name, hash, now, now).run();
  if (result.meta.changes !== 1) throw new Error('A tutor already exists. Bootstrap never replaces accounts.');
}

// Owner-operated maintenance only, never a public password-recovery endpoint.
export async function resetTutorPassword(database, email, password) {
  email = tutorEmail(email);
  const hash = await tutorPasswordHash(password);
  const account = await database.prepare("SELECT id,password_hash,auth_version FROM accounts WHERE email=? AND role='tutor' AND status='active'").bind(email).first();
  if (!account) throw new Error('An active tutor with this email was not found. No account was changed.');
  const results = await database.batch([
    database.prepare("UPDATE accounts SET password_hash=?,must_change_password=0,auth_version=auth_version+1,updated_at=? WHERE id=? AND email=? AND role='tutor' AND status='active' AND password_hash=? AND auth_version=?")
      .bind(hash, new Date().toISOString(), account.id, email, account.password_hash, account.auth_version),
    database.prepare('DELETE FROM account_sessions WHERE account_id=? AND EXISTS(SELECT 1 FROM accounts WHERE id=? AND password_hash=? AND auth_version=?)')
      .bind(account.id, account.id, hash, account.auth_version + 1),
  ]);
  if (results[0].meta.changes !== 1) throw new Error('Tutor account changed during recovery. No automatic retry.');
}
