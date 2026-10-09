import { publicSubjects } from './public-subjects';
import { examPlans, recommendedLessons } from './exam-preparation';

export const publicPages: Record<string, { title: string; description: string; label: string }> = {
 '/': {label:'Home',title:'Ripetizioni di matematica e informatica a Lodi e online | Francesco Fracchia',description:'Lezioni con Francesco Fracchia per superiori e università: 20 € individuali, 15 € a persona in gruppo. Incontro gratuito di 15 minuti, a Lodi o online.'},
 '/catalogo': {label:'Lezioni',title:'Lezioni di matematica e informatica | Francesco Fracchia',description:'Ripetizioni per superiori e università a Lodi e online. Lezioni individuali, gruppi di 2–4, preparazione maturità ed esami universitari.'},
 '/prezzi': {label:'Prezzi',title:'Prezzi e pacchetti delle lezioni | Francesco Fracchia',description:'20 € per 55 minuti, 5 lezioni individuali a 95 €, gruppi a 15 € a persona. Pagamenti in contanti o POS e crediti per chi invita un amico.'},
 '/metodo': {label:'Come lavoro',title:'Metodo delle ripetizioni e supporto DSA | Francesco Fracchia',description:'Teoria, esercizi e correzioni di matematica e informatica. Esperienza con ragazzi con DSA; lavoro da casa nella piattaforma concordato insieme.'},
 '/francesco': {label:'Chi sono',title:'Francesco Fracchia, tutor di matematica e informatica a Lodi',description:'Laureato in Informatica e studente magistrale, seguo superiori e universitari. La mia esperienza nelle ripetizioni e con ragazzi con DSA.'},
 '/lodi': {label:'Lodi e online',title:'Ripetizioni a Lodi, Via San Colombano 43, e online | Francesco Fracchia',description:'Sede confermata in Via San Colombano 43 a Lodi, apertura in preparazione. Online con lavagna digitale per matematica e schermo condiviso per informatica.'},
 '/domande': {label:'Domande frequenti',title:'Lezioni: prezzi, pagamenti, gruppi e bonus inviti | Francesco Fracchia',description:'Risposte per studenti e genitori su pagamenti, DSA, incontri gratuiti, materiali, lezioni online, pacchetti e crediti invita un amico.'},
 '/privacy': {label:'Dati e privacy',title:'Dati e privacy | Francesco Fracchia',description:'Informazioni sui dati raccolti per richieste, incontri gratuiti, test e area studente di Francesco Fracchia.'},
 '/piattaforma': {label:'La piattaforma',title:'Area studente: esercizi, materiali e correzioni | Francesco Fracchia',description:'Piattaforma di Francesco Fracchia: materiali assegnati, esercizi da casa e correzioni. Il lavoro tra le lezioni si concorda nel primo incontro.'},
 '/percorsi': {label:'Corsi registrati',title:'Programmi dei corsi di matematica e informatica | Francesco Fracchia',description:'Consulta gli argomenti dei corsi di matematica e informatica. Video e materiali in preparazione; i corsi registrati non sono ancora in vendita.'},
 '/esami': {label:'Esami universitari',title:'Preparazione esami universitari: programmi e lezioni | Francesco Fracchia',description:'Analisi 1, programmazione, algoritmi e altri esami: argomenti, numero iniziale di lezioni e costo orientativo. A Lodi e online.'},
 '/maturita': {label:'Maturità',title:'Preparazione maturità: matematica e informatica | Francesco Fracchia',description:'Ripasso per la maturità, a Lodi e online. Un primo blocco di 5 lezioni individuali a 95 €, esercizi e correzioni concordati sul programma.'},
 '/contatti': {label:'Contatti',title:'Contatti per le ripetizioni a Lodi e online | Francesco Fracchia',description:'Scrivi a Francesco per matematica e informatica, dal modulo o su WhatsApp. Puoi chiedere informazioni per tuo figlio o per un esame universitario.'},
 '/incontro': {label:'Incontro gratuito',title:'Prenota un incontro gratuito di 15 minuti | Francesco Fracchia',description:'Scegli giorno, orario e modalità online o a Lodi. 15 minuti per conoscerci e guardare il programma, senza impegno e senza pagamenti.'},
 '/acquista': {label:'Acquista lezioni',title:'Lezioni singole e pacchetti | Francesco Fracchia',description:'Una lezione individuale a 20 € o 5 a 95 €. Acquisti dal tuo account studente e scegli gli appuntamenti disponibili dopo il pagamento.'},
 '/invita': {label:'Invita un amico',title:'Invita un amico: crediti da 5 € o 10 € a testa | Francesco Fracchia',description:'Dopo tre lezioni pagate: 5 € a testa per l’invito individuale o 10 € a testa studiando in gruppo insieme. Premi alternativi, con condizioni.'},
};
for (const [slug, subject] of Object.entries(publicSubjects)) publicPages['/lezioni/'+slug] = {label:subject.name,title:subject.title+' | Francesco Fracchia',description:subject.description};
for (const plan of examPlans) publicPages['/esami/'+plan.slug] = {label:plan.name,title:plan.name+' — programma e lezioni | Francesco Fracchia',description:`Ripasso di ${plan.name}, a Lodi e online. Proposta iniziale da ${recommendedLessons(plan)} lezioni, adattabile al programma del docente e alla tua preparazione.`};

export function publicBreadcrumbs(path: string) {
 const page=publicPages[path];
 if (!page || path==='/') return [];
 const parent=path.startsWith('/esami/')?'/esami':path.startsWith('/lezioni/')?'/catalogo':null;
 return [{href:'/',label:'Home'},...(parent?[{href:parent,label:publicPages[parent].label}]:[]),{href:path,label:page.label}];
}
