import {bookingRules} from './catalog';

export type ExamBlock={title:string;lessons:number};
export type ExamPlan={slug:string;name:string;description:string;blocks:ExamBlock[]};
// Starting proposals for revision after attending the course, not estimates for learning an entire subject from zero.
export const examPlans:ExamPlan[]=[
 {slug:'analisi-1',name:'Analisi 1',description:'Ripasso di teoria ed esercizi, fino alle prove d’appello. Se algebra e funzioni sono da ricostruire, serve tempo aggiuntivo.',blocks:[{title:'Prerequisiti, funzioni e dominio',lessons:1},{title:'Limiti e continuità',lessons:2},{title:'Derivate e studio di funzione',lessons:2},{title:'Integrali',lessons:2},{title:'Prova d’esame e correzione',lessons:1}]},
 {slug:'algebra-lineare',name:'Algebra Lineare e Geometria',description:'Sistemi, matrici e geometria seguendo il programma del docente. Dedichiamo tempo ai passaggi e alla loro giustificazione.',blocks:[{title:'Sistemi lineari e matrici',lessons:2},{title:'Spazi vettoriali, basi e dimensione',lessons:2},{title:'Applicazioni lineari e autovalori',lessons:2},{title:'Geometria ed esercizi d’esame',lessons:2}]},
 {slug:'fondamenti-informatica',name:'Fondamenti di Informatica',description:'Riprendiamo i concetti richiesti dal tuo corso e li applichiamo agli esercizi. Il programma può cambiare molto tra atenei.',blocks:[{title:'Logica, rappresentazione dei dati e basi',lessons:2},{title:'Algoritmi e lettura del codice',lessons:2},{title:'Esercizi del corso e prove d’esame',lessons:2}]},
 {slug:'algoritmi',name:'Algoritmi',description:'Analisi degli algoritmi e scelta delle strutture dati, con esercizi e ragionamento sulla complessità.',blocks:[{title:'Complessità e ricorsione',lessons:2},{title:'Ricerca e ordinamento',lessons:2},{title:'Strutture dati',lessons:2},{title:'Grafi e tecniche richieste dal programma',lessons:2},{title:'Prove d’esame e correzione',lessons:2}]},
 {slug:'programmazione-1',name:'Programmazione 1',description:'Esercizi nel linguaggio usato dal corso: dalla lettura della consegna alla verifica del programma.',blocks:[{title:'Variabili, condizioni e cicli',lessons:2},{title:'Array, stringhe e funzioni',lessons:2},{title:'Ricorsione ed esercizi del corso',lessons:2},{title:'Prove d’esame, errori e test',lessons:2}]},
 {slug:'java',name:'Programmazione 2 / Java',description:'Programmazione a oggetti ed esercizi Java. Usiamo il codice del corso per capire cosa succede e perché.',blocks:[{title:'Classi, oggetti e incapsulamento',lessons:2},{title:'Ereditarietà e polimorfismo',lessons:2},{title:'Collezioni ed eccezioni',lessons:2},{title:'Esercizi e prove d’esame',lessons:2}]},
 {slug:'cpp',name:'C++',description:'Codice, memoria e programmazione a oggetti secondo il livello richiesto dal docente.',blocks:[{title:'Sintassi, funzioni e riferimenti',lessons:2},{title:'Puntatori e gestione della memoria',lessons:2},{title:'Classi e strutture dati del corso',lessons:2},{title:'Esercizi, test e prove d’esame',lessons:2}]},
 {slug:'basi-di-dati',name:'Basi di Dati',description:'Dal modello dei dati alle interrogazioni SQL, lavorando sulle consegne e sulle prove del tuo corso.',blocks:[{title:'Modello relazionale e progettazione',lessons:2},{title:'Algebra relazionale e SQL',lessons:2},{title:'Normalizzazione',lessons:1},{title:'Esercizi e prove d’esame',lessons:2}]},
 {slug:'architettura',name:'Architettura degli Elaboratori',description:'Rappresentazione dei dati, processore e memoria. Scegliamo gli esercizi in base al programma effettivo.',blocks:[{title:'Rappresentazione dei dati e logica',lessons:2},{title:'Processore e istruzioni',lessons:2},{title:'Memoria e organizzazione del sistema',lessons:2},{title:'Esercizi e prove d’esame',lessons:2}]},
 {slug:'probabilita-statistica',name:'Probabilità e Statistica per Informatica',description:'Ripasso dei concetti e degli esercizi richiesti dal corso, con attenzione a come scegliere e interpretare il calcolo.',blocks:[{title:'Probabilità e probabilità condizionata',lessons:2},{title:'Variabili aleatorie e distribuzioni',lessons:2},{title:'Statistica prevista dal programma',lessons:2},{title:'Esercizi e prove d’esame',lessons:2}]},
 {slug:'fisica-1',name:'Fisica 1',description:'Impostazione dei problemi e ripasso degli argomenti previsti dal tuo corso. Prima controlliamo insieme il programma.',blocks:[{title:'Cinematica e dinamica',lessons:2},{title:'Lavoro, energia e quantità di moto',lessons:2},{title:'Altri argomenti del programma',lessons:2},{title:'Problemi d’esame e correzione',lessons:2}]},
];
export const getExamPlan=(slug:string)=>examPlans.find(p=>p.slug===slug)||null;
export const recommendedLessons=(plan:ExamPlan)=>plan.blocks.reduce((sum,b)=>sum+b.lessons,0);
export function examEstimate(plan:ExamPlan,indices:number[],extra:number){
 const selected=plan.blocks.filter((_,i)=>indices.includes(i));const lessons=selected.reduce((sum,b)=>sum+b.lessons,0)+extra;
 const packages=Math.floor(lessons/5),singles=lessons%5;
 return {selected,lessons,packages,singles,individual:packages*95+singles*bookingRules.individualPrice,group:lessons*bookingRules.groupPrice};
}
export function examContactMessage(params:{piano?:string|string[];argomenti?:string|string[];extra?:string|string[]}){
 if(typeof params.piano!=='string'||typeof params.argomenti!=='string')return '';
 const plan=getExamPlan(params.piano);if(!plan||!/^(?:\d(?:,\d)*)?$/.test(params.argomenti))return '';
 const indices=params.argomenti?[...new Set(params.argomenti.split(',').map(Number))]:[];if(indices.some(i=>i>=plan.blocks.length))return '';
 const extra=typeof params.extra==='string'&&/^(?:[0-9]|10)$/.test(params.extra)?Number(params.extra):0;
 const estimate=examEstimate(plan,indices,extra);
 if(!estimate.lessons)return '';
 return `Vorrei informazioni sul ripasso di ${plan.name}. ${estimate.selected.length?'Argomenti selezionati: '+estimate.selected.map(b=>b.title).join('; ')+'.':'Vorrei concentrarmi sulle esercitazioni.'}${extra?` Ho aggiunto ${extra} ${extra===1?'lezione':'lezioni'} di esercizio.`:''} La proposta indica ${estimate.lessons} ${estimate.lessons===1?'lezione':'lezioni'}; vorrei confrontarla con il mio programma e la data dell’appello.`;
}
