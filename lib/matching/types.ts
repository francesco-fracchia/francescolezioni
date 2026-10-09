import type { RequestRow } from '@/lib/requests/types';

export type Candidate = RequestRow & { student_name:string|null; student_email:string|null; student_status:string|null; existing_group_id:string|null };
export type Proposal = {id:string;name:string;subject:string;mode:string;availability:string;notes:string;checks:string;members:string;status:'draft'|'approved'|'dismissed';group_id:string|null;approval_key:string|null;created_at:string;updated_at:string};
export const reviewLabels={program:'Programma e argomenti',level:'Preparazione e livello',goal:'Obiettivo e data',availability:'Disponibilità condivisa',mode:'Modalità e dimensione'};
export type ReviewKey=keyof typeof reviewLabels;
