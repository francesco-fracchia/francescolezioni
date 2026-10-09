import { requestDetails,detailText } from '@/lib/requests/types';
import type { Candidate } from './types';

export function normalize(value:string){return value.trim().toLocaleLowerCase('it-IT').replace(/\s+/g,' ');}
export function waitingCandidate(r:Pick<Candidate,'kind'|'details'|'group_id'|'status'>){const d=requestDetails(r.details);return r.kind==='group'&&d.groupRequest==='matching'&&!r.group_id&&['new','contacted','matching'].includes(r.status);}
export function preferredSize(r:Candidate){const s=detailText(requestDetails(r.details),'groupSize');return s==='Coppia'?2:s==='Fino a 3 studenti'?3:s==='Fino a 4 studenti'?4:null;}
export function possibleModes(r:Candidate){const mode=detailText(requestDetails(r.details),'mode');return mode==='Entrambe'?['Online','Lodi']:['Online','Lodi'].includes(mode)?[mode]:[];}
export function groupProblems(rows:Candidate[],mode?:string){
 const errors:string[]=[];
 if(rows.length<2||rows.length>4)errors.push('Seleziona da 2 a 4 richieste.');
 if(rows.some(r=>!waitingCandidate(r)))errors.push('Una richiesta non è più nella lista di abbinamento.');
 if(new Set(rows.map(r=>normalize(r.subject))).size>1)errors.push('Le richieste riguardano materie diverse.');
 const types=rows.map(r=>detailText(requestDetails(r.details),'studentType')).filter(Boolean);
 if(new Set(types.map(normalize)).size>1)errors.push('Gli studenti appartengono a percorsi superiori e università diversi.');
 if(rows.some(r=>preferredSize(r)!==null&&rows.length>preferredSize(r)!))errors.push('La dimensione supera una preferenza indicata: concorda prima un aggiornamento della richiesta.');
 if(rows.some(r=>!r.student_id||r.student_status!=='active'))errors.push('Collega ogni richiesta a una scheda studente attiva.');
 if(rows.some(r=>r.existing_group_id))errors.push('Uno studente appartiene già a un gruppo attivo della stessa materia. Verifica il gruppo nell’anagrafica.');
 const linked=rows.filter(r=>r.student_id);
 if(new Set(linked.map(r=>r.student_id)).size<linked.length)errors.push('Due richieste appartengono allo stesso studente.');
 if(new Set(linked.map(r=>normalize(r.student_email||''))).size<linked.length)errors.push('I partecipanti devono avere email diverse in anagrafica.');
 const modes=['Online','Lodi'].filter(m=>rows.every(r=>possibleModes(r).includes(m)));
 if(!modes.length)errors.push('Non risulta una modalità comune: verifica le preferenze con gli studenti.');
 if(mode&&!modes.includes(mode))errors.push('La modalità proposta non corrisponde alle preferenze di tutti.');
 return [...new Set(errors)];
}
export function compareCandidates(a:Candidate,b:Candidate){
 const da=requestDetails(a.details),db=requestDetails(b.details);
 const fields=['program','level','goal','availability'] as const;
 return fields.map(key=>{const x=detailText(da,key),y=detailText(db,key);const unknown=!x||!y||(key==='level'&&(x==='Da valutare insieme'||y==='Da valutare insieme'));return {key,status:unknown?'missing':normalize(x)===normalize(y)?'same':'review'};});
}
// Only source fields relevant to an approval: internal notes never enter a proposal.
export function snapshot(r:Candidate):Candidate{return {id:r.id,kind:r.kind,name:r.name,email:r.email,subject:r.subject,details:r.details,assessment:r.assessment,status:r.status,created_at:r.created_at,student_id:r.student_id,group_id:r.group_id,student_name:r.student_name,student_email:r.student_email,student_status:r.student_status,existing_group_id:r.existing_group_id};}
