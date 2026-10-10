// Public descriptions use only subjects and conditions already offered on the Site.
export const publicSubjects = {
  matematica: {
    name: 'Matematica',
    title: 'Ripetizioni di matematica a Lodi e online',
    description: 'Lezioni di matematica per superiori e università con Francesco Fracchia, a Lodi e online. Equazioni, funzioni, Analisi 1 e algebra lineare.',
    introduction: 'Le lezioni seguono il programma della tua classe o del tuo corso universitario. Possiamo lavorare sugli esercizi che ti hanno assegnato o sulle prove degli appelli precedenti, riprendendo la teoria quando serve per capire come arrivare alla soluzione.',
    school: ['Equazioni, disequazioni e sistemi', 'Funzioni e grafici', 'Derivate ed esercizi di verifica'],
    university: ['Analisi 1: limiti, continuità, derivate e integrali', 'Algebra lineare e geometria', 'Probabilità e statistica per Informatica'],
    preparation: 'Il programma del corso, un esercizio su cui hai dubbi e la data della verifica o dell’appello sono utili per capire da dove partire. Puoi contattarmi anche se non hai ancora raccolto tutto.',
    lesson: 'Per capire dove nasce la difficoltà guardiamo come hai provato a risolvere l’esercizio. Possiamo riprendere la spiegazione e svolgere un esempio prima che tu provi di nuovo, dedicando tempo anche alle basi se sono quelle che rendono difficile il lavoro.',
    online: 'Scrivo i passaggi sulla lavagna digitale, che vedi durante la videochiamata. Seguiamo il calcolo riga per riga e puoi interrompermi quando qualcosa non è chiaro.',
    group: 'Un gruppo può funzionare, per esempio, con compagni che preparano la stessa verifica o studenti dello stesso corso universitario e appello. Confronto programma, preparazione e orari prima di proporlo.',
    paths: ['matematica', 'analisi-1'],
  },
  informatica: {
    name: 'Informatica',
    title: 'Ripetizioni di informatica a Lodi e online',
    description: 'Lezioni di informatica per superiori e università con Francesco Fracchia, a Lodi e online. Programmazione, Java, C++, algoritmi e basi di dati.',
    introduction: 'Possiamo preparare gli esercizi del tuo corso, una verifica o una prova d’esame, lavorando anche sul codice che hai già scritto. Durante la lezione lo leggiamo e lo proviamo insieme, per capire gli errori e il ragionamento necessario a risolvere il problema.',
    school: ['Logica, algebra di Boole e ragionamento sugli algoritmi', 'Variabili, condizioni, cicli e array', 'Funzioni ed esercizi di programmazione', 'Database e SQL; Sistemi e Reti, protocolli e subnetting'],
    university: ['Logica proposizionale e dei predicati, tavole di verità e quantificatori', 'Fondamenti di Informatica, Programmazione 1, Java e C++', 'Algoritmi, strutture dati, ricorsione e complessità', 'Basi di Dati e Architettura degli Elaboratori'],
    preparation: 'Il testo dell’esercizio, il codice che hai scritto e il programma del corso ci aiutano a organizzare il lavoro. Puoi mostrarmi anche un errore di cui non capisci la causa, perché lo cercheremo insieme.',
    lesson: 'Dopo aver letto la consegna, ragioniamo su come impostare la soluzione e seguiamo il codice controllando cosa succede ai valori. Ti chiedo anche di provare delle modifiche e spiegare il risultato, in modo che tu sappia riutilizzare quello che abbiamo visto in altri esercizi.',
    online: 'Condivido lo schermo per leggere e modificare il codice insieme. Puoi mostrarmi il tuo lavoro e fermarmi su una riga, un errore o un concetto da riprendere.',
    group: 'Per esempio, compagni che usano lo stesso linguaggio o universitari dello stesso corso e appello. Prima di formare il gruppo verifico che programmi, preparazione e orari siano compatibili.',
    paths: ['informatica', 'programmazione'],
  },
} as const;

export function getPublicSubject(slug: string) {
  if (slug === 'matematica' || slug === 'informatica') return publicSubjects[slug];
  return null;
}
