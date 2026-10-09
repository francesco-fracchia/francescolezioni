"use client";
import {useState} from 'react';
import {Clock,Users,UserRound} from 'lucide-react';
import CardArt from './card-art';
import type {OpenDialog} from './types';
export default function Prices({open}:{open:OpenDialog}){const [groupSize,setGroupSize]=useState(2);return <>      <section id="prezzi" className="section wrap">
        <div className="section-heading">
          <div>
            <h2>
              Prezzi delle lezioni
              <br />
              <span>individuali e di gruppo</span>
            </h2>
          </div>
          <p>
            Lezioni individuali e gruppi di 2–4 studenti.
            <br />
            In presenza a Lodi e online.
          </p>
        </div>
        <div className="price-grid">
          <article className="price-card">
            <CardArt kind="individual" />
            <h2>Individuale</h2>
            <div className="price">
              20 €<span>/ lezione</span>
            </div>
            <p className="duration">
              <Clock size={16} /> 55 minuti
            </p>
            <p className="package-price-note"><strong>5 lezioni a 95 €</strong>, pagate insieme, quindi 19 € per lezione. Concordiamo prima programma e condizioni. Dopo l’acquisto puoi fissare gli orari aperti. Il credito invito non si somma al pacchetto.</p><p>Il ritmo della lezione dipende da quello che ti serve. Possiamo fermarci su un passaggio e riprenderlo prima di andare avanti.</p>
            <p>Lavoriamo sugli esercizi del tuo programma e organizziamo lo studio in base alla verifica o all’esame che devi preparare.</p>
            <a className="button dark" href="/acquista">Singola lezione o pacchetto</a>
            <button className="text-link calendar-link" onClick={() => open("contact")}>Chiedi informazioni</button>
          </article>
          <article className="price-card group-price">
            <CardArt kind="group" />
            <h2>Lezioni di gruppo</h2>
            <div className="price">
              15 €<span>/ persona</span>
            </div>
            <p className="duration">
              <Clock size={16} /> 55 minuti <span>·</span>
              <Users size={16} /> Da 2 a 4 studenti
            </p>
            <p>
              Lavorate sugli stessi argomenti. Ciascuno può fare domande e svolgere esercizi.
            </p>
            <p>Prima di proporre un gruppo controllo che programmi e preparazione siano compatibili. Puoi lasciare gratuitamente la tua disponibilità e decidere se partecipare quando ricevi una proposta.</p>
            <div className="group-explorer">
              <div className="group-explorer-top"><span>Quanti siete?</span><div className="group-size-options" aria-label="Numero di studenti">{[2,3,4].map(size => <button key={size} aria-pressed={groupSize === size} onClick={() => setGroupSize(size)}>{size}</button>)}</div></div>
              <div className="group-people" aria-hidden="true">{Array.from({length:4},(_,i) => <span key={i} className={i < groupSize ? 'present' : ''}><UserRound size={22}/></span>)}</div>
              <p className="group-total"><b>15 €</b> a persona · {groupSize} studenti</p><p className="group-example" aria-live="polite">{groupSize===2?'Per esempio, due compagni che preparano la stessa verifica.':groupSize===3?'Per esempio, tre universitari dello stesso corso, con un appello comune.':'Per esempio, quattro compagni con lo stesso programma da ripassare.'}</p>
            </div>
            <div className="actions">
              <button className="button dark" onClick={() => open("group")}>
                Cerco un gruppo
              </button>
              <button
                className="button outline"
                onClick={() => open("group", undefined, true)}
              >
                Ho già un compagno
              </button>
            </div>
          </article>
        </div>
        <p className="price-footnote">
          Ogni lezione dura 55 minuti. Lascio 5 minuti tra un appuntamento e il successivo.
        </p>
      </section>
      <section className="group-note wrap"><h2>Come trovare un gruppo</h2><p>Se non hai già un compagno, lasciami programma e disponibilità nella lista gratuita. Ti scrivo quando trovo studenti con una preparazione e orari compatibili. Per l’università controllo anche ateneo, docente e appello. Ricevi la proposta e decidi se partecipare. Può servire tempo per trovare persone compatibili, quindi l’iscrizione alla lista non garantisce che si formi un gruppo.</p></section>
</>;}
