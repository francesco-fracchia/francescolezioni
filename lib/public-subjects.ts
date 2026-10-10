// Public descriptions use only subjects and conditions already offered on the Site.
export const publicSubjects = {
  matematica: {
    name: 'Matematica',
    title: 'Ripetizioni di matematica a Lodi e online',
    description: 'Lezioni di matematica per superiori e università con Francesco Fracchia, a Lodi e online. Equazioni, funzioni, Analisi 1 e algebra lineare.',
    introduction: 'Esercizi, verifiche e prove d’esame, seguendo il programma della tua classe o del tuo corso.',
    school: ['Equazioni, disequazioni e sistemi', 'Funzioni e grafici', 'Derivate ed esercizi di verifica'],
    university: ['Analisi 1: limiti, continuità, derivate e integrali', 'Algebra lineare e geometria', 'Probabilità e statistica per Informatica'],
    preparation: 'Programma, esercizi o verifiche e data della prova. Puoi scrivermi anche se non hai ancora raccolto tutto.',
    lesson: 'Partiamo dal tuo tentativo. Riprendiamo la teoria, svolgiamo un esempio e poi provi tu, fermandoci sulle basi quando serve.',
    online: 'Lavagna digitale condivisa per seguire ogni passaggio del calcolo.',
    group: 'Compagni della stessa classe o studenti dello stesso corso e appello. Prima verifico programma, preparazione e orari.',
    paths: ['matematica', 'analisi-1'],
  },
  informatica: {
    name: 'Informatica',
    title: 'Ripetizioni di informatica a Lodi e online',
    description: 'Lezioni di informatica per superiori e università con Francesco Fracchia, a Lodi e online. Programmazione, Java, C++, algoritmi e basi di dati.',
    introduction: 'Logica, programmazione e prove d’esame, lavorando sulle consegne e sul codice del tuo corso.',
    school: ['Logica, algebra di Boole e ragionamento sugli algoritmi', 'Variabili, condizioni, cicli e array', 'Funzioni ed esercizi di programmazione', 'Database e SQL; Sistemi e Reti, protocolli e subnetting'],
    university: ['Logica proposizionale e dei predicati, tavole di verità e quantificatori', 'Fondamenti di Informatica, Programmazione 1, Java e C++', 'Algoritmi, strutture dati, ricorsione e complessità', 'Basi di Dati e Architettura degli Elaboratori'],
    preparation: 'Consegna, codice che hai scritto e programma del corso. Anche un errore che non riesci a risolvere.',
    lesson: 'Leggiamo la consegna, impostiamo la soluzione e seguiamo il codice. Provi modifiche e spieghi il risultato per poterlo riutilizzare in altri esercizi.',
    online: 'Schermo condiviso per leggere, provare e modificare il codice insieme.',
    group: 'Stesso linguaggio o corso e appello. Prima verifico programma, preparazione e orari.',
    paths: ['informatica', 'programmazione'],
  },
} as const;

export function getPublicSubject(slug: string) {
  if (slug === 'matematica' || slug === 'informatica') return publicSubjects[slug];
  return null;
}
