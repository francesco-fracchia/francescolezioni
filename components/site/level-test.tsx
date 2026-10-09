"use client";
import { useState, useEffect } from "react";
import { tests } from "@/lib/catalog";
import type { Assessment } from "./types";
export default function Test({
  onFinish,
  onRequest,
}: {
  onFinish: (a: Assessment) => void;
  onRequest: () => void;
}) {
  const [test, setTest] = useState("Matematica superiori");
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<number[]>([]);
  const [choice, setChoice] = useState<number | null>(null);
  const [student, setStudent] = useState("");
  const questions = tests[test];
  const done = answers.length === questions.length;
  const score = Math.round(
    (answers.filter((a, i) => a === questions[i].correct).length /
      questions.length) *
      100,
  );
  useEffect(() => { if (done) onFinish({test,score,answers,student}); }, [done, test, score, answers, student, onFinish]);
  if (!started)
    return (
      <>
        <div className="eyebrow">Test gratuito</div>
        <h2 id="dialog-title">Cinque domande sulle basi</h2>
        <p>
          Bastano pochi minuti per rispondere a cinque domande. Il risultato dà un’indicazione sulle basi, non un voto.
        </p>
        <label>
          Che cosa stai studiando?
          <select value={test} onChange={(e) => setTest(e.target.value)}>
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
        <h2 id="dialog-title">
          {score >= 80
            ? "Conosci le basi del test"
            : score >= 40
              ? "Alcuni concetti sono da ripassare"
              : "Le basi del test sono da ripassare"}
        </h2>
        <div className="test-score">
          {score}%<span>{test}</span>
        </div>
        <p>
          Il risultato riguarda soltanto i cinque concetti del test. Non valuta tutta la tua preparazione e non indica quante lezioni ti servono.
        </p>
        <div className="review-list">
          {questions.map((q, i) => (
            <div key={q.topic}>
              <b>
                {answers[i] === q.correct ? "✓" : "○"} {q.topic}
              </b>
              <span>
                {answers[i] === q.correct
                  ? "Risposta corretta"
                  : "Da ripassare"}
              </span>
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
            onFinish({ test, score, answers, student });
            onRequest();
          }}
        >
          Richiedi 15 minuti gratuiti
        </button>
        <button
          className="text-link"
          onClick={() => {
            setStarted(false);
            setAnswers([]);
            setChoice(null);
          }}
        >
          Rifai il test
        </button>
      </>
    );
  const q = questions[answers.length];
  return (
    <>
      <div className="eyebrow">
        {test} / {answers.length + 1} DI {questions.length}
      </div>
      <progress value={answers.length} max={questions.length} />
      <h2 id="dialog-title">{q.text}</h2>
      <div className="quiz-options">
        {[...q.options, "Non lo so"].map((o, i) => (
          <button
            key={o}
            className={choice === i ? "selected" : ""}
            onClick={() => setChoice(i)}
          >
            {o}
          </button>
        ))}
      </div>
      <button
        disabled={choice === null}
        className="button dark"
        onClick={() => {
          setAnswers([...answers, choice!]);
          setChoice(null);
        }}
      >
        {answers.length === questions.length - 1
          ? "Vedi il risultato"
          : "Continua"}
      </button>
      <p className="form-note">
        Alla fine del test trovi le spiegazioni. Non c’è un limite di tempo.
      </p>
    </>
  );
}
