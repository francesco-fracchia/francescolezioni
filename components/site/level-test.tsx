"use client";
import { useState, useEffect, useRef, useReducer } from "react";
import { tests } from "@/lib/catalog";
import {assessmentReducer, initialAssessment, assessmentReview} from '@/lib/assessment';
import type { Assessment } from "./types";
export default function Test({
  onFinish,
  onRequest,
}: {
  onFinish: (a: Assessment) => void;
  onRequest: () => void;
}) {
  const [test, setTest] = useState("Matematica superiori");
  const title=useRef<HTMLHeadingElement>(null);
  const previousScreen=useRef("intro");
  const [started, setStarted] = useState(false);
  const [state, dispatch] = useReducer(assessmentReducer, tests[test].length, initialAssessment);
  const [student, setStudent] = useState("");
  const questions = tests[test];
  const {answers, complete: done, question: index} = state;
  const choice = answers[index];
  const screen=started?done?'result':String(index):"intro";
  useEffect(()=>{if(previousScreen.current!==screen){previousScreen.current=screen;title.current?.focus();}},[screen]);
  const review = assessmentReview(questions, answers);
  const {score} = review;
  useEffect(() => { if (done) onFinish({test,score,answers: answers as number[],student}); }, [done, test, score, answers, student, onFinish]);
  if (!started)
    return (
      <>
        <div className="eyebrow">Test gratuito</div>
        <h2 ref={title} tabIndex={-1} id="dialog-title">Cinque domande sulle basi</h2>
        <p>
          Bastano pochi minuti per rispondere a cinque domande. Il risultato dà un’indicazione sulle basi, non un voto.
        </p>
        <label>
          Che cosa stai studiando?
          <select value={test} onChange={(e) => {setTest(e.target.value);dispatch({type:'reset',count:tests[e.target.value].length});}}>
            {Object.keys(tests).map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          Classe o corso di laurea
          <input
            maxLength={200}
            value={student}
            onChange={(e) => setStudent(e.target.value)}
            placeholder="Es. 3ª ITIS oppure Informatica"
          />
        </label>
        <p className="form-note">
          Questi test riguardano alcuni concetti di base. Per gli altri esami guardiamo il programma durante l’incontro gratuito.
        </p>
        <button className="button dark" onClick={() => setStarted(true)}>
          Inizia il test
        </button>
      </>
    );
  if (done)
    return (
      <>
        <div className="eyebrow">Risultato del test</div>
        <h2 ref={title} tabIndex={-1} id="dialog-title">
          {score >= 80
            ? "Conosci le basi del test"
            : score >= 40
              ? "Alcuni concetti sono da ripassare"
              : "Le basi del test sono da ripassare"}
        </h2>
        <div className="test-score">
          {score}%<span>{test}</span>
        </div>
        <p className="assessment-counts">Corrette: {review.correct} · Errate: {review.incorrect} · Non lo so: {review.unknown}</p>
        <p>
          Il risultato riguarda soltanto i cinque concetti del test. Non valuta tutta la tua preparazione e non indica quante lezioni ti servono.
        </p>
        <div className="review-list">
          {review.items.map((q) => (
            <div key={q.topic}>
              <b>
                {q.outcome === 'correct' ? "✓" : q.outcome === 'unknown' ? "?" : "○"} {q.topic}
              </b>
              <span>
                {q.outcome === 'correct' ? 'Risposta corretta' : q.outcome === 'unknown' ? 'Hai scelto “Non lo so”' : 'Risposta errata'}
              </span>
              {q.outcome === 'incorrect' && <p>La tua risposta: {q.answer}</p>}
              <p>{q.explanation}</p>
            </div>
          ))}
        </div>
        <p>
          <b>Dopo il test:</b>{" "}
          {score >= 80
            ? "puoi esercitarti sugli argomenti del tuo programma e sulle prove."
            : "puoi ripassare i concetti indicati e poi fare esercizi su quegli argomenti."}{" "}
          Guardiamo insieme il programma prima di decidere le lezioni.
        </p>
        <button
          className="button dark"
          onClick={() => {
            onFinish({ test, score, answers: answers as number[], student });
            onRequest();
          }}
        >
          Incontro gratuito
        </button>
        <button className="button outline" onClick={()=>dispatch({type:'review'})}>Rivedi le risposte</button>
        <button
          className="text-link"
          onClick={() => {
            setStarted(false);
            dispatch({type:'reset',count:questions.length});
          }}
        >
          Rifai il test
        </button>
      </>
    );
  const q = questions[index];
  return (
    <>
      <div className="eyebrow">
        {test} / {index + 1} DI {questions.length}
      </div>
      <progress aria-label="Avanzamento del test" value={index} max={questions.length} />
      <h2 ref={title} tabIndex={-1} id="dialog-title">{q.text}</h2>
      <div className="quiz-options">
        {[...q.options, "Non lo so"].map((o, i) => (
          <button
            key={o}
            className={choice === i ? "selected" : ""}
            aria-pressed={choice === i}
            onClick={() => dispatch({type:'answer',value:i,optionCount:q.options.length})}
          >
            {o}
          </button>
        ))}
      </div>
      <div className="actions assessment-navigation"><button type="button" className="button outline" disabled={index===0} onClick={()=>dispatch({type:'previous'})}>Domanda precedente</button><button
        disabled={choice === null}
        className="button dark"
        onClick={() => dispatch({type:'next'})}
      >
        {index === questions.length - 1
          ? "Vedi il risultato"
          : "Continua"}
      </button></div>
      <p className="form-note">
        Alla fine del test trovi le spiegazioni. Non c’è un limite di tempo.
      </p>
    </>
  );
}
