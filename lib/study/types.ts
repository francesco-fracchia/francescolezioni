export type Visibility='draft'|'published'|'archived';
export type Plan={id:string;student_id:string;title:string;subject:string;objective:string;target_date:string|null;starting_point:string;topics:string;next_steps:string;status:Visibility;version:number;created_at:string;updated_at:string};
export type Summary={id:string;student_id:string;appointment_kind:'lesson'|'booking';appointment_id:string;title:string;topics:string;practice:string;next_steps:string;status:Visibility;version:number;created_at:string;updated_at:string;subject:string;starts_at:string;ends_at:string;appointment_status:string};
export type Appointment={kind:'lesson'|'booking';id:string;subject:string;starts_at:string;ends_at:string;status:string};
export type StudyData={plans:Plan[];summaries:Summary[];truncated:{plans:boolean;summaries:boolean}};
export type ManagementStudyData=StudyData&{students:{id:string;name:string;status:string}[];selected:string|null;appointments:Appointment[];appointmentLimit:boolean;studentLimit:boolean};
export const visibilityLabels:Record<Visibility,string>={draft:'Bozza',published:'Visibile allo studente',archived:'Archiviato'};
export const civilDate=(value:string)=>new Intl.DateTimeFormat('it-IT',{dateStyle:'long',timeZone:'Europe/Rome'}).format(new Date(value+'T12:00:00Z'));
export const lessonDate=(value:string)=>new Intl.DateTimeFormat('it-IT',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Rome'}).format(new Date(value));
