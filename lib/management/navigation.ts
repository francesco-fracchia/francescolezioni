export const managementGroups = [
 {label:'Attività',items:[{href:'/gestione/oggi',label:'Oggi',icon:'today'},{href:'/gestione',label:'Richieste',icon:'requests'},{href:'/gestione/prenotazioni',label:'Calendario e saldi',icon:'calendar'},{href:'/gestione/incontri',label:'Incontri gratuiti',icon:'free'}]},
 {label:'Studenti',items:[{href:'/gestione/anagrafica',label:'Studenti e gruppi',icon:'students'},{href:'/gestione/abbinamenti',label:'Forma un gruppo',icon:'groups'}]},
 {label:'Didattica',items:[{href:'/gestione/formazione',label:'Corsi e materiali',icon:'courses'},{href:'/gestione/compiti',label:'Compiti e correzioni',icon:'homework'},{href:'/gestione/piani',label:'Piani e riepiloghi',icon:'plans'}]},
 {label:'Offerte e crediti',items:[{href:'/gestione/pacchetti',label:'Pacchetti di lezioni',icon:'packages'},{href:'/gestione/inviti',label:'Inviti e crediti',icon:'referrals'}]},
 {label:'Impostazioni',items:[{href:'/gestione/account',label:'Account e accessi',icon:'accounts'},{href:'/gestione/modelli',label:'Modelli di testo',icon:'templates'},{href:'/gestione/notifiche',label:'Registro email',icon:'mail'},{href:'/gestione/esportazione',label:'Copia dei dati',icon:'export'}]},
] as const;
export function managementSection(path:string){return managementGroups.find(g=>g.items.some(i=>i.href===path))?.label||'Gestione';}
