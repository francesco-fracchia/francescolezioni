export const schoolSubjects = ['Matematica', 'Informatica', 'Sistemi e Reti'];
export const universitySubjects = ['Analisi 1', 'Algebra Lineare e Geometria', 'Fondamenti di Informatica', 'Algoritmi', 'Programmazione 1', 'Programmazione 2 / Java', 'C++', 'Basi di Dati', 'Architettura degli Elaboratori', 'Probabilità e Statistica per Informatica', 'Fisica 1'];
export const bookingRules = { lessonMinutes: 55, bufferMinutes: 5, consultationMinutes: 15, maxGroupSize: 4, individualPrice: 20, groupPrice: 15 };
export type Question = { topic: string; text: string; options: string[]; correct: number; explanation: string };
export const tests: Record<string, Question[]> = {
 'Matematica superiori': [
 {topic:'Equazioni',text:'Quanto vale x in 3x + 6 = 18?',options:['2','4','6','8'],correct:1,explanation:'Sottrai 6 e dividi per 3: x = 4.'},
 {topic:'Potenze',text:'Quanto vale 2³ · 2²?',options:['2⁵','2⁶','4⁵','2¹'],correct:0,explanation:'Con la stessa base si sommano gli esponenti.'},
 {topic:'Sistemi',text:'Se x + y = 7 e x − y = 1, quanto vale x?',options:['3','4','6','7'],correct:1,explanation:'Sommando le equazioni: 2x = 8.'},
 {topic:'Secondo grado',text:'Quali sono le soluzioni di x² − 5x + 6 = 0?',options:['1 e 6','−2 e −3','2 e 3','0 e 5'],correct:2,explanation:'Si fattorizza in (x − 2)(x − 3).'},
 {topic:'Funzioni',text:'La retta y = 2x − 3 interseca l’asse y in…',options:['2','−3','3','0'],correct:1,explanation:'Sull’asse y si ha x = 0, quindi y = −3.'}],
 'Informatica superiori': [
 {topic:'Variabili',text:'Dopo x = 3 e x = x + 2, quanto vale x?',options:['2','3','5','6'],correct:2,explanation:'L’assegnazione aggiorna x con 3 + 2.'},
 {topic:'Condizioni',text:'Quale condizione verifica che n sia pari?',options:['n > 2','n % 2 == 0','n / 2 == 0','n == 2'],correct:1,explanation:'Il resto della divisione per 2 è zero.'},
 {topic:'Cicli',text:'Quante iterazioni esegue for (i = 0; i < 4; i++)?',options:['3','4','5','0'],correct:1,explanation:'I valori di i sono 0, 1, 2, 3.'},
 {topic:'Array',text:'In un array con indici da zero, il terzo elemento ha indice…',options:['1','2','3','4'],correct:1,explanation:'Il primo indice è 0, il terzo è 2.'},
 {topic:'SQL',text:'Quale istruzione legge dati da una tabella?',options:['INSERT','DELETE','SELECT','UPDATE'],correct:2,explanation:'SELECT recupera le righe richieste.'}],
 'Analisi 1': [
 {topic:'Prerequisiti',text:'Qual è il dominio reale di log(x − 1)?',options:['x ≥ 1','x > 1','x ≠ 1','Tutti i reali'],correct:1,explanation:'L’argomento del logaritmo deve essere positivo.'},
 {topic:'Limiti',text:'Quanto vale lim per x → 0 di sin(x)/x?',options:['0','1','∞','Non esiste'],correct:1,explanation:'È il limite notevole fondamentale, con x in radianti.'},
 {topic:'Derivate',text:'La derivata di x³ è…',options:['x²','3x','3x²','x⁴/4'],correct:2,explanation:'La regola di potenza dà 3x².'},
 {topic:'Continuità',text:'Una funzione derivabile in un punto è anche continua lì?',options:['Sì','No','Solo se positiva','Solo se lineare'],correct:0,explanation:'La derivabilità implica la continuità.'},
 {topic:'Integrali',text:'Una primitiva di 2x è…',options:['2','x²','2x²','log(x)'],correct:1,explanation:'La derivata di x² è 2x.'}],
 'Programmazione': [
 {topic:'Funzioni',text:'Che cosa rappresenta il valore di ritorno di una funzione?',options:['Il nome','Il risultato restituito','Il numero di righe','Sempre un intero'],correct:1,explanation:'È il risultato che la funzione restituisce al chiamante.'},
 {topic:'Complessità',text:'Una ricerca lineare su n elementi ha complessità nel caso peggiore…',options:['O(1)','O(log n)','O(n)','O(n²)'],correct:2,explanation:'Può dover visitare tutti gli n elementi.'},
 {topic:'Ricorsione',text:'A cosa serve il caso base?',options:['A ordinare dati','A terminare la ricorsione','A duplicare chiamate','A creare variabili'],correct:1,explanation:'Ferma la catena di chiamate ricorsive.'},
 {topic:'Oggetti',text:'L’incapsulamento permette di…',options:['Nascondere dettagli interni','Eliminare ogni metodo','Evitare ogni classe','Duplicare dati'],correct:0,explanation:'Espone un’interfaccia controllata e protegge lo stato interno.'},
 {topic:'Strutture dati',text:'Una pila segue il principio…',options:['FIFO','LIFO','Ordinamento crescente','Accesso casuale'],correct:1,explanation:'L’ultimo elemento inserito è il primo estratto.'}]
};
