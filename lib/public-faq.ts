import {paymentCopy} from './booking/payment-copy';
import {cancellationCopy} from './booking/cancellation-copy';
import {studio,studioCopy} from './public-offer';
export const faqEntries: [string,string][] = [
            ["Dove si terranno le lezioni a Lodi?", studioCopy.description + ' L’indirizzo è ' + studio.address + ', ' + studio.city + '. Puoi fare lezione anche online.'],
            ["Posso contattarti per mio figlio?", "Certo, indicami la classe, la materia e cosa deve preparare tuo figlio. Se è minorenne, compilate la richiesta insieme e lasciate il contatto del genitore."],
            ["Come si pagano le lezioni?", paymentCopy.offline+' '+paymentCopy.online+' Il pacchetto di 5 lezioni individuali costa 95 € e si paga insieme, dopo aver concordato condizioni e appuntamenti. Le richieste e l’incontro gratuito non richiedono pagamenti. La pagina di acquisto permette di scegliere una singola lezione o il pacchetto e prenotare gli orari aperti dopo la conferma del pagamento.'],
            ["Cosa portare alla prima lezione?", "Il programma della materia, il libro o gli appunti e gli esercizi o le verifiche su cui lavorare. Puoi dirmi prima cosa devi preparare, così sappiamo da dove partire."],
            ["Segui anche ragazzi con DSA?", "Ho seguito molti ragazzi con DSA. Uso anche schemi e riprendo i passaggi con il tempo necessario, tenendo conto degli strumenti e delle abitudini di studio dello studente."],
            [
              "Come si svolgono le lezioni online?",
              "Per collegarti ti serve un computer con internet, microfono e videocamera, e il materiale della materia a portata di mano. In matematica scrivo sulla lavagna digitale, mentre in informatica condividiamo lo schermo per lavorare sul codice. Prima della lezione ci accordiamo sul collegamento e controlliamo che tu riesca ad accedere, poi trovi il link nell’area studente quando lo aggiungo.",
            ],
            [
              "A cosa serve il test gratuito?",
              "Il test serve a controllare alcuni concetti di base. È gratuito e riguarda solo alcuni argomenti, quindi non è un esame su tutto il programma. Guardiamo il risultato insieme per decidere cosa riprendere.",
            ],
            [
              "Come funziona il primo incontro gratuito?",
              "Dura 15 minuti. Mi mostri il programma e parliamo di cosa devi preparare e delle difficoltà che incontri. Non ti impegna a prenotare lezioni.",
            ],
            ["Quante lezioni mi servono per un esame universitario?", 'Nei programmi di ripasso trovi esempi di piani per chi ha già seguito il corso. Il numero effettivo dipende dalle tue basi, dal programma del docente e dalla data dell’esame. Puoi fare meno lezioni, saltare argomenti o aggiungere esercitazioni.'],
            ["Materiali e correzioni sono compresi?", "Gli esercizi da casa sono facoltativi. Scegliamo le consegne che seguirò, per esempio due esercizi di matematica o un programma da correggere. Materiali, tentativi e commenti restano nell’area studente; per un dubbio breve puoi scrivermi su WhatsApp."],
            [
              "Come funzionano prenotazioni e cancellazioni?",
              ['L’incontro gratuito viene confermato dopo la scelta dell’orario e la prenotazione. Per cancellare o spostare una lezione scrivimi su WhatsApp.',cancellationCopy.student,cancellationCopy.tutor,cancellationCopy.package,cancellationCopy.returned,cancellationCopy.reschedule].join(' '),
            ],
 ["Quanto costano e quanto durano le lezioni?", "Ogni lezione dura 55 minuti. L’individuale costa 20 €, il gruppo da 2 a 4 studenti costa 15 € a persona. Il pacchetto di 5 lezioni individuali costa 95 €; le condizioni e gli appuntamenti si concordano prima del pagamento."],
 ["Come funziona il bonus invita un amico?", "Se l’amico è un nuovo studente, dopo tre lezioni individuali svolte e pagate ricevete 5 € di credito a testa. Se fate tre lezioni di gruppo insieme, svolte e pagate da entrambi, il credito è di 10 € a testa e si usa solo sui gruppi. I premi sono alternativi. Il codice si indica prima della prima lezione a pagamento. Il credito dura 12 mesi; se ne usano fino a 5 € a persona per lezione, senza altri sconti o pacchetti."],
 ["Come troviamo i compagni per un gruppo?", "Potete presentarvi insieme oppure lasciare programma e disponibilità nella lista gratuita. Controllo argomenti, preparazione e orari prima di proporre un gruppo da 2 a 4 persone. Per l’università confronto anche corso, docente e appello. La richiesta non conferma il gruppo, perché può servire un po’ di tempo per trovare compagni compatibili."],
];
