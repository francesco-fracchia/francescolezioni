export type RequestRow = { id:string;kind:string;name:string;email:string;subject:string;details:string;assessment:string|null;status:string;created_at:string;student_id:string|null;group_id:string|null;last_contact_at?:string|null;next_action?:string;next_action_date?:string|null;source?:string;followup_notes?:string;followup_version?:number|null };
export function requestDetails(value:string):Record<string,unknown> {
 try { const parsed=JSON.parse(value); return parsed && typeof parsed==='object' && !Array.isArray(parsed) ? parsed : {}; } catch { return {}; }
}
export function detailText(details:Record<string,unknown>,key:string) { return typeof details[key]==='string' ? details[key] as string : ''; }
