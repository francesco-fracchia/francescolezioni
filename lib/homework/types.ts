import type { Visibility } from '@/lib/study/types';
export type Assignment={id:string;student_id:string;plan_id:string|null;plan_title:string|null;title:string;subject:string;instructions:string;due_date:string|null;status:Visibility;filename:string|null;mime:string|null;size:number|null;version:number;created_at:string;updated_at:string};
export type Submission={id:string;assignment_id:string;attempt:number;body:string;filename:string|null;mime:string|null;size:number|null;feedback:string;feedback_status:'draft'|'published';review_status:'pending'|'accepted'|'revise';version:number;created_at:string;reviewed_at:string|null};
export type HomeworkData={assignments:Assignment[];submissions:Submission[];truncated:boolean};
export type HomeworkManagementData=HomeworkData&{students:{id:string;name:string;status:string}[];selected:string|null;plans:{id:string;title:string;status:string}[];studentLimit:boolean;planLimit:boolean};
export const reviewLabels={pending:'In attesa di correzione',accepted:'Compito completato',revise:'Da rivedere'};
function romeDate(value:Date){const parts=new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Europe/Rome'}).formatToParts(value),get=(type:string)=>parts.find(p=>p.type===type)?.value;return `${get('year')}-${get('month')}-${get('day')}`;}
export function late(submitted:string,due:string|null){return !!due&&romeDate(new Date(submitted))>due;}
export function pendingDue(due:string|null){return !!due&&romeDate(new Date())>due;}
