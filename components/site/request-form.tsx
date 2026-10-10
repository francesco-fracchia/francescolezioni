"use client";
import { useRef, useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { studioCopy } from "@/lib/public-offer";
import { schoolSubjects, universitySubjects } from "@/lib/catalog";
import {useSitePreview} from "./site-preview-context";
import type { Assessment, RequestKind as Kind, GroupSize } from "./types";
export default function RequestForm({
  kind,
  subject,
  assessment,
  hasCompanion = false,
  initialGroupSize = 2,
}: {
  kind: Kind;
  subject: string;
  assessment: Assessment | null;
  hasCompanion?: boolean;
  initialGroupSize?: GroupSize;
}) {
  const preview = useSitePreview();
  const [studentType, setStudentType] = useState(
    universitySubjects.includes(subject) ? "Università" : "Superiori",
  );
  const [state, setState] = useState<"idle" | "saving" | "success" | "error">(
    "idle",
  );
  const [step, setStep] = useState(0);
  const [companions, setCompanions] = useState(hasCompanion);
  const formRef = useRef<HTMLFormElement>(null);
  const steps = ['Contatti', 'Programma', 'Disponibilità', 'Riepilogo'];
  function next() {
    const controls = formRef.current?.querySelectorAll<HTMLInputElement>(`[data-step="${step}"] input, [data-step="${step}"] select, [data-step="${step}"] textarea`);
    for (const control of controls || []) if (!control.reportValidity()) return;
    setStep(step + 1);
  }
  const [message, setMessage] = useState("");
  const id = useRef<string | null>(null);
  const titles = {
    "pre-registration": "Pre-iscrizione per novembre",
    group: "Richiesta di abbinamento a un gruppo",
    consultation: "Incontro gratuito di 15 minuti",
    lesson: "Richiedi una lezione",
  };
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (preview) return;
    const invalid = Array.from(e.currentTarget.querySelectorAll<HTMLInputElement>('input,select,textarea')).find(el => !el.checkValidity());
    if (invalid) { const section = invalid.closest('[data-step]'); setStep(Number(section?.getAttribute('data-step') || 3)); setTimeout(() => invalid.reportValidity(), 0); return; }
    const f = new FormData(e.currentTarget);
    setState("saving");
    id.current ??= crypto.randomUUID();
    const get = (s: string) => String(f.get(s) || "");
    const payload = {
      id: id.current,
      kind,
      name: get("name"),
      email: get("email"),
      subject: get("subject"),
      consent: f.get("consent") === "on",
      website: get("website"),
      assessment,
      details: {
        studentType,
        institution: get("institution"),
        year: get("year"),
        teacher: get("teacher"),
        program: get("program"),
        goal: get("goal"),
        deadline: get("deadline"),
        availability: get("availability"),
        mode: get("mode"),
        level: get("level"),
        groupSize: get("groupSize"),
        companion: f.get("companion") === "on",
        phone: get("phone"),
        groupRequest: companions ? 'existing' : 'matching',
        participants: [1,2,3].map(n=>({name:get(`participant${n}`),level:get(`participantLevel${n}`)})).filter(p=>p.name),
        sharedProgram: get("sharedProgram"),
        groupNotes: get("groupNotes"),
      },
    };
    try {
      const r = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(data.error);
      setState("success");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Riprova tra poco.");
    }
  }
  if (state === "success")
    return (
      <div className="success">
        <span className="success-icon">
          <Check size={32} />
        </span>
        <h2 id="dialog-title">Richiesta ricevuta.</h2>
        <p>
          {kind === "group"
            ? companions ? "Ho ricevuto la richiesta del gruppo. Verifico programma, partecipanti e disponibilità, poi ricontatto il referente. La lezione non è ancora confermata." : "Sei nella lista di abbinamento. Verifico programma, livello e disponibilità e ti contatto quando ho una proposta compatibile. Puoi decidere se partecipare."
            : "Ti ricontatterò ai recapiti che hai lasciato per accordarci."}
        </p>
        <p className="form-note">
          {kind === "consultation" || kind === "lesson"
            ? "L’appuntamento non è ancora confermato e non devi pagare nulla."
            : "La pre-iscrizione non richiede pagamenti."}
        </p>
      </div>
    );
  return (
    <>
      <h2 id="dialog-title">{kind==='group'&&companions?'Richiedi una lezione di gruppo':titles[kind]}</h2>
      <p>
        {kind === "group"
          ? "Dimmi cosa devi studiare e quando sei disponibile. Confronto programma e preparazione prima di proporti un gruppo."
          : "Lasciami un recapito, gli argomenti e le tue disponibilità. Ti ricontatto per guardare la richiesta e concordare giorno e orario."}
      </p>
      <ol className="form-steps" aria-label="Passaggi della richiesta">{steps.map((title,i)=><li key={title} aria-current={step===i?'step':undefined}><span>{i+1}</span>{title}</li>)}</ol>
      <form ref={formRef} onSubmit={submit} noValidate>
        <section className="form-grid" data-step="0" hidden={step!==0}>
          <label>
            Nome
            <input
              name="name"
              autoComplete="name"
              required
              minLength={2}
              maxLength={100}
            />
          </label>
          <label>
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
            />
          </label>
          <label>
            Telefono (facoltativo)
            <input name="phone" type="tel" autoComplete="tel" maxLength={40} />
          </label>
          <label>
            Studi alle
            <select
              value={studentType}
              onChange={(e) => setStudentType(e.target.value)}
            >
              <option>Superiori</option>
              <option>Università</option>
            </select>
          </label>
        </section>
        <section className="form-grid" data-step="1" hidden={step!==1}>
          <label className="full">
            Materia / esame
            <select name="subject" defaultValue={subject}>
              {[...schoolSubjects, ...universitySubjects, "Altro esame"].map(
                (s) => (
                  <option key={s}>{s}</option>
                ),
              )}
            </select>
          </label>
          <label>
            {studentType === "Superiori" ? "Scuola / indirizzo" : "Università"}
            <input name="institution" maxLength={200} />
          </label>
          <label>
            {studentType === "Superiori" ? "Classe" : "Corso di laurea / anno"}
            <input name="year" maxLength={100} />
          </label>
          {studentType === "Università" && (
            <label className="full">
              Docente (facoltativo)
              <input name="teacher" maxLength={100} />
            </label>
          )}
          <label className="full">
            Programma e argomenti da preparare
            <textarea
              name="program"
              required
              minLength={2}
              maxLength={3000}
              placeholder="Es. equazioni di secondo grado, esercizi con parametri…"
            />
          </label>
          <label>
            Obiettivo
            <input
              name="goal"
              maxLength={1000}
              placeholder="Verifica, recupero, esame…"
            />
          </label>
          <label>
            Data verifica / appello
            <input name="deadline" type="date" />
          </label>
        </section>
        <section className="form-grid" data-step="2" hidden={step!==2}>
          <p className="full form-note">{studioCopy.requestNote}</p>
          <label>
            Modalità
            <select name="mode">
              <option>Online</option>
              <option>Lodi</option>
              <option>Entrambe</option>
            </select>
          </label>
          <label>
            Quanto conosci il programma?
            <select name="level">
              <option>Da valutare insieme</option>
              <option>Ho bisogno delle basi</option>
              <option>Devo consolidare</option>
              <option>Voglio esercitarmi</option>
            </select>
          </label>
          <label className="full">
            Giorni e fasce orarie disponibili
            <input
              name="availability"
              required
              minLength={2}
              maxLength={1000}
              placeholder="Es. lunedì e giovedì, 16–19"
            />
          </label>
          {kind === "group" && (
            <>
              <label className="full">
                Numero di studenti preferito
                <select name="groupSize" defaultValue={initialGroupSize===2?'Coppia':`Fino a ${initialGroupSize} studenti`}>
                  <option>Coppia</option>
                  <option>Fino a 3 studenti</option>
                  <option>Fino a 4 studenti</option>
                </select>
              </label>
              <label className="checkbox full">
                <input
                  name="companion"
                  type="checkbox"
                  checked={companions}
                  onChange={e=>setCompanions(e.target.checked)}
                />
                Siamo già un gruppo / ho un compagno
              </label>
              {companions && <>
                <p className="full form-note">Tu sarai il referente del gruppo. Indica gli altri partecipanti, al massimo 3, senza inserire le loro email o i numeri di telefono.</p>
                {[1,2,3].map(n=><label key={n} className="full">Compagno {n}{n>1?' (facoltativo)':''}<input name={`participant${n}`} maxLength={100} required={n===1&&companions} placeholder="Nome o iniziali"/><input name={`participantLevel${n}`} maxLength={200} placeholder="Classe / corso e argomenti da ripassare" aria-label={`Preparazione del compagno ${n}`}/></label>)}
                <label className="full">Avete lo stesso programma?<select name="sharedProgram"><option>Sì, stesso programma</option><option>In parte: da verificare insieme</option><option>Programmi diversi</option></select></label>
                <label className="full">Altre informazioni sul gruppo<textarea name="groupNotes" maxLength={2000} placeholder="Docente o appello comune, differenze di livello, disponibilità condivise…"/></label>
              </>}
            </>
          )}
        </section>
        <section data-step="3" hidden={step!==3}>
          <h3>Controlla e invia</h3>
          <p>Puoi tornare ai passaggi precedenti senza perdere i dati.</p>
          <dl className="request-review">{['name','email','subject','program','availability','mode'].map((key,i)=><div key={key}><dt>{['Nome','Email','Materia','Programma','Disponibilità','Modalità'][i]}</dt><dd>{String(new FormData(formRef.current || undefined).get(key)||'—')}</dd></div>)}</dl>
        <label className="honeypot" aria-hidden="true">
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
        {assessment && (
          <p className="form-note">
            La richiesta include il risultato del test: {assessment.test}, {assessment.score}%.
          </p>
        )}
        <div className="form-privacy">
          Uso i dati per gestire la richiesta e ricontattarti. Gli altri studenti non possono vederli. Se sei minorenne, compila il modulo con un genitore e indica il suo contatto.
        </div>
        <label className="checkbox">
          <input name="consent" type="checkbox" required />
          Ho letto queste informazioni e acconsento a essere ricontattato per la
          richiesta.
        </label>
        {state === "error" && (
          <p role="alert" className="error">
            {message}
          </p>
        )}
        </section>
        {preview&&<p className="form-note" role="status">Stai consultando l’anteprima. Puoi provare il modulo, ma l’invio delle richieste sarà disponibile all’apertura del sito.</p>}
        <div className="wizard-actions">{step>0&&<button type="button" className="button outline" onClick={()=>setStep(step-1)}>Indietro</button>}{step<3?<button type="button" className="button dark" onClick={next}>Continua</button>:<button
          className="button dark"
          disabled={preview || state === "saving"}
          type="submit"
        >
          {state === "saving"
            ? "Salvataggio…"
            : kind === "group"
              ? companions ? "Invia la richiesta del gruppo" : "Invia la richiesta di abbinamento"
              : "Invia la richiesta"}
        </button>}</div>
        <p className="form-note">
          {kind === "consultation"
            ? "L’incontro dura 15 minuti ed è gratuito. Non è una lezione di prova."
            : kind === "lesson"
              ? "55 minuti · 20 € individuale. Nessun addebito dal sito."
              : "Nessun pagamento e nessuna prenotazione automatica."}
        </p>
      </form>
    </>
  );
}
