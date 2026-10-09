// Public descriptions use only subjects and conditions already offered on the Site.
export const publicSubjects = {
  matematica: {
    name: 'Matematica',
    title: 'Ripetizioni di matematica a Lodi e online',
    description: 'Lezioni di matematica per superiori e università con Francesco Fracchia, a Lodi e online. Equazioni, funzioni, Analisi 1 e algebra lineare.',
    introduction: 'Porta gli esercizi della classe o le prove degli appelli precedenti. Guardiamo dove ti blocchi, riprendiamo la teoria che serve e provi a svolgere gli esercizi.',
    school: ['Equazioni, disequazioni e sistemi', 'Funzioni e grafici', 'Derivate ed esercizi di verifica'],
    university: ['Analisi 1: limiti, continuità, derivate e integrali', 'Algebra lineare e geometria', 'Probabilità e statistica per Informatica'],
    preparation: 'Il programma del corso, un esercizio su cui hai dubbi e la data della verifica o dell’appello sono utili per capire da dove partire. Puoi contattarmi anche se non hai ancora raccolto tutto.',
    lesson: 'Ti chiedo come hai provato a risolvere l’esercizio. Riprendiamo il passaggio che non torna, svolgiamo un esempio e poi ne provi un altro. Se manca una base, ci fermiamo lì prima di proseguire.',
    online: 'Scrivo i passaggi sulla lavagna digitale, che vedi durante la videochiamata. Seguiamo il calcolo riga per riga e puoi interrompermi quando qualcosa non è chiaro.',
    group: 'Un gruppo può funzionare, per esempio, con compagni che preparano la stessa verifica o studenti dello stesso corso universitario e appello. Confronto programma, preparazione e orari prima di proporlo.',
    paths: ['matematica', 'analisi-1'],
  },
  informatica: {
    name: 'Informatica',
    title: 'Ripetizioni di informatica a Lodi e online',
    description: 'Lezioni di informatica per superiori e università con Francesco Fracchia, a Lodi e online. Programmazione, Java, C++, algoritmi e basi di dati.',
    introduction: 'Possiamo partire da un esercizio da consegnare, dal codice che non funziona o da una prova d’esame. Lo leggiamo insieme e ricostruiamo i passaggi, così puoi provare a risolvere il problema tu.',
    school: ['Variabili, condizioni, cicli e array', 'Funzioni ed esercizi di programmazione', 'Database e SQL; Sistemi e Reti, protocolli e subnetting'],
    university: ['Fondamenti di Informatica, Programmazione 1, Java e C++', 'Algoritmi, strutture dati, ricorsione e complessità', 'Basi di Dati e Architettura degli Elaboratori'],
    preparation: 'Porta il testo dell’esercizio, il codice che hai scritto e il programma del corso. Se compare un errore, lo guardiamo insieme: non serve aver già capito da cosa dipende.',
    lesson: 'Prima leggiamo la consegna e decidiamo come affrontarla. Poi seguiamo il codice, controlliamo i valori e cerchiamo gli errori. Ti chiedo di provare modifiche e spiegare cosa succede, senza limitarci a copiare una soluzione.',
    online: 'Condivido lo schermo per leggere e modificare il codice insieme. Puoi mostrarmi il tuo lavoro e fermarmi su una riga, un errore o un concetto da riprendere.',
    group: 'Per esempio, compagni che usano lo stesso linguaggio o universitari dello stesso corso e appello. Prima di formare il gruppo verifico che programmi, preparazione e orari siano compatibili.',
    paths: ['informatica', 'programmazione'],
  },
} as const;

export function getPublicSubject(slug: string) {
  if (slug === 'matematica' || slug === 'informatica') return publicSubjects[slug];
  return null;
}
