import {z} from 'zod';
export const templateKinds={message:'Messaggio',task:'Compito',plan:'Piano di studio',summary:'Riepilogo della lezione'};
export type TemplateKind=keyof typeof templateKinds;
export const templateFields:Record<TemplateKind,{name:string;label:string;required?:boolean;max:number}[]>={
 message:[{name:'body',label:'Testo del messaggio',required:true,max:4000}],
 task:[{name:'title',label:'Titolo del compito',required:true,max:160},{name:'subject',label:'Materia / esame',required:true,max:160},{name:'instructions',label:'Istruzioni ed esercizi',required:true,max:10000}],
 plan:[{name:'title',label:'Titolo',required:true,max:160},{name:'subject',label:'Materia / esame',required:true,max:160},{name:'objective',label:'Obiettivo',required:true,max:4000},{name:'startingPoint',label:'Situazione iniziale',max:4000},{name:'topics',label:'Argomenti',max:4000},{name:'nextSteps',label:'Prossimi passi',max:4000}],
 summary:[{name:'title',label:'Titolo',required:true,max:160},{name:'topics',label:'Argomenti affrontati',required:true,max:4000},{name:'practice',label:'Esercizi da svolgere',max:4000},{name:'nextSteps',label:'Prossimi passi',max:4000}],
};
export function contentSchema(kind:TemplateKind){return z.object(Object.fromEntries(templateFields[kind].map(f=>[f.name,z.string().trim().min(f.required?(f.max===160?2:1):0).max(f.max)]))).strict();}
export type TutorTemplate={id:string;name:string;kind:TemplateKind;content:string;status:'active'|'archived';version:number};
export function templateValues(kind:TemplateKind,content:string):Record<string,string>{try{const p=contentSchema(kind).safeParse(JSON.parse(content));return p.success?p.data as Record<string,string>:{};}catch{return {};}}
export function messageText(body:string,name:string,subject:string){return body.replaceAll('{nome}',name).replaceAll('{materia}',subject);}
