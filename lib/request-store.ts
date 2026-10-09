import { env } from '@/lib/runtime-env';
export async function saveRequest(record: {id:string;kind:string;name:string;email:string;subject:string;details:string;assessment:string|null}) {
 if (!env.DB) throw new Error('Database unavailable');
 await env.DB.prepare('INSERT INTO requests (id,kind,name,email,subject,details,assessment,status,created_at,consent_version) VALUES (?,?,?,?,?,?,?, ?,?,?)').bind(record.id,record.kind,record.name,record.email,record.subject,record.details,record.assessment,'new',new Date().toISOString(),'2026-10-04').run();
}

// The same requests archive holds the brief first contact, with no appointment.
export async function findRequest(id:string) {
 if(!env.DB)throw new Error('Database unavailable');
 return env.DB.prepare('SELECT kind,name,email,subject,details,assessment FROM requests WHERE id=?').bind(id).first<{kind:string;name:string;email:string;subject:string;details:string;assessment:string|null}>();
}
