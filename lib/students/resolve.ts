import { bookingDb } from '@/lib/booking/runtime';
import type { Student } from './types';
export async function resolveStudent(person:{studentId?:string;name:string;email:string}){
 const db=bookingDb();if(person.studentId){const s=await db.prepare("SELECT * FROM students WHERE id=? AND status='active'").bind(person.studentId).first<Student>();if(!s)throw Error('STUDENT_INACTIVE');return s;}
 const name=person.name.trim();const email=person.email.toLowerCase().trim();const now=new Date().toISOString();
 await db.prepare('INSERT OR IGNORE INTO students(id,name,email,created_at,updated_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),name,email,now,now).run();
 const s=await db.prepare("SELECT * FROM students WHERE name=? AND email=? AND status='active'").bind(name,email).first<Student>();if(!s)throw Error('STUDENT_INACTIVE');return s;
}
export async function resolveGroup(groupId:string){const db=bookingDb();const group=await db.prepare("SELECT id,name,subject FROM student_groups WHERE id=? AND status='active'").bind(groupId).first<{id:string;name:string;subject:string}>();if(!group)throw Error('GROUP_INACTIVE');const members=await db.prepare("SELECT s.* FROM students s JOIN group_members m ON m.student_id=s.id WHERE m.group_id=? ORDER BY s.name").bind(groupId).all<Student>();if(members.results.length<2||members.results.length>4||members.results.some(s=>s.status!=='active')||new Set(members.results.map(s=>s.email)).size!==members.results.length)throw Error('GROUP_INACTIVE');return {...group,members:members.results};}
