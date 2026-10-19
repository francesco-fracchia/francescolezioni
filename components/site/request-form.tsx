"use client";
import {readFormResponse,showFormError,validateFields,FormResponseError} from '@/components/forms/form-feedback';
import ResponseExpectation from './response-expectation';
import PrivacyNotice from './privacy-notice';
import {useFormSafety} from '@/components/forms/form-safety';
import { useEffect, useRef, useState, type FormEvent } from "react";
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
  const [review, setReview] = useState<Record<string,string>>({});
  const [companions, setCompanions] = useState(hasCompanion);
  const formRef = useRef<HTMLFormElement>(null);
  const safety=useFormSafety(formRef,kind+':'+subject,state!=='success');
  const steps = ['Contatti', 'Programma', 'Disponibilità', 'Riepilogo'];
  const reviewLabels:Record<string,string>={name:'Nome',email:'Email',phone:'Telefono',studentType:'Studi',institution:'Scuola o ateneo',year:'Classe o anno',teacher:'Docente',subject:'Materia',program:'Programma',goal:'Obiettivo',deadline:'Scadenza',availability:'Giorni e orari',mode:'Modalità',level:'Preparazione',groupSize:'Numero di studenti',companion:'Hai già dei compagni?',participant1:'Compagno 1',participant2:'Compagno 2',participant3:'Compagno 3',participantLevel1:'Preparazione del compagno 1',participantLevel2:'Preparazione del compagno 2',participantLevel3:'Preparazione del compagno 3',sharedProgram:'Programma del gruppo',groupNotes:'Note sul gruppo'};
  const reviewGroups=[
    {title:'Contatti',step:0,keys:['name','email','phone']},
    {title:'Programma',step:1,keys:['studentType','institution','year','teacher','subject','program','goal','deadline']},
    {title:'Disponibilità',step:2,keys:['availability','mode','level',...(kind==='group'?['groupSize','companion',...(companions?['participant1','participantLevel1','participant2','participantLevel2','participant3','participantLevel3','sharedProgram','groupNotes']:[])]:[])]},
  ];
  const previousStep=useRef(step);
  useEffect(()=>{
    if(previousStep.current===step)return;
    previousStep.current=step;
    const heading=formRef.current?.querySelector<HTMLElement>(`[data-step="${step}"] h3`);
    heading?.focus({preventScroll:true});
    heading?.scrollIntoView({block:'start',behavior:'instant'});
  },[step]);
  function next() {
    const controls = formRef.current?.querySelectorAll<HTMLInputElement>(`[data-step="${step}"] input, [data-step="${step}"] select, [data-step="${step}"] textarea`);
    if(controls?.length&&!validateFields(formRef.current!.querySelector(`[data-step="${step}"]`)!))return;
    if (step === 2 && formRef.current) {
      const fields = new FormData(formRef.current);
      setReview({...Object.fromEntries(Array.from(fields).map(([key,value]) => [key,String(value)])),studentType,companion:companions?'Sì':'No'});
    }
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
    const invalid = Array.from(e.currentTarget.querySelectorAll<HTMLInputElement>('input,select,textarea')).find(el => !el.validity.valid);
    if (invalid) { const section = invalid.closest('[data-step]'); setStep(Number(section?.getAttribute('data-step') || 3)); setTimeout(() => validateFields(formRef.current!), 0); return; }
    const f = new FormData(e.currentTarget);
    if(!safety.begin())return;
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
      const data = (await readFormResponse(r)) as { error?: string };
      if (!r.ok) throw new Error(data.error);
      safety.saved();setState("success");
    } catch (error) {
      setState("error");
      if(error instanceof FormResponseError){const first=Object.keys(error.fieldErrors)[0],control=Array.from(formRef.current?.elements||[]).find(el=>el instanceof HTMLInputElement||el instanceof HTMLSelectElement||el instanceof HTMLTextAreaElement?el.name===first:false);if(control)setStep(Number(control.closest('[data-step]')?.getAttribute('data-step')||3));}
      setMessage(showFormError(error,formRef.current));
    }finally{safety.end();}
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
        <ResponseExpectation matching={kind==='group'&&!companions}/>
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
      <ResponseExpectation matching={kind==='group'&&!companions}/>
      <ol className="form-steps" aria-label="Passaggi della richiesta">{steps.map((title,i)=><li key={title} aria-current={step===i?'step':undefined}><span>{i+1}</span>{title}</li>)}</ol>
      <form ref={formRef} onSubmit={submit} noValidate>
        <section className="form-grid" data-step="0" hidden={step!==0} aria-label="I tuoi contatti">
          <h3 className="request-step-title full" tabIndex={-1}>I tuoi contatti</h3>
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
        <section className="form-grid" data-step="1" hidden={step!==1} aria-label="Il programma da preparare">
          <h3 className="request-step-title full" tabIndex={-1}>Il programma da preparare</h3>
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
        <section className="form-grid" data-step="2" hidden={step!==2} aria-label="Giorni e orari">
          <h3 className="request-step-title full" tabIndex={-1}>Giorni e orari</h3>
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
                {[1,2,3].map(n=><fieldset key={n} className="request-companion full">
                  <legend>Compagno {n}{n>1?' (facoltativo)':''}</legend>
                  <label>Nome o iniziali<input name={`participant${n}`} maxLength={100} required={n===1&&companions}/></label>
                  <label>Classe, corso e preparazione<input name={`participantLevel${n}`} maxLength={200} placeholder="Classe / corso e argomenti da ripassare"/></label>
                </fieldset>)}
                <label className="full">Avete lo stesso programma?<select name="sharedProgram"><option>Sì, stesso programma</option><option>In parte: da verificare insieme</option><option>Programmi diversi</option></select></label>
                <label className="full">Altre informazioni sul gruppo<textarea name="groupNotes" maxLength={2000} placeholder="Docente o appello comune, differenze di livello, disponibilità condivise…"/></label>
              </>}
            </>
          )}
        </section>
        <section data-step="3" hidden={step!==3}>
          <h3 className="request-step-title" tabIndex={-1}>Controlla e invia</h3>
          <p>Puoi tornare ai passaggi precedenti senza perdere i dati.</p>
          <div className="request-review-groups">{reviewGroups.map(group=><section key={group.title} aria-label={group.title}>
            <div className="request-review-heading"><h4>{group.title}</h4><button type="button" className="text-link" onClick={()=>setStep(group.step)}>Modifica<span className="sr-only"> {group.title.toLowerCase()}</span></button></div>
            <dl className="request-review">{group.keys.filter(key=>review[key]?.trim()).map(key=><div key={key}><dt>{reviewLabels[key]}</dt><dd>{key==='deadline'?review[key].split('-').reverse().join('/'):review[key]}</dd></div>)}</dl>
          </section>)}</div>
        <label className="honeypot" aria-hidden="true">
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
        {assessment && (
          <p className="form-note">
            La richiesta include il risultato del test: {assessment.test}, {assessment.score}%.
          </p>
        )}
        <PrivacyNotice purpose="Uso questi dati per valutare la richiesta e ricontattarti."/>
        <label className="checkbox">
          <input name="consent" type="checkbox" required />
          Ho letto l’informativa privacy.
        </label>
        {state === "error" && (
          <p role="alert" className="error">
            {message}
          </p>
        )}
        </section>
        {preview&&<p className="form-note" role="status">Stai consultando l’anteprima. Puoi provare il modulo, ma l’invio delle richieste sarà disponibile all’apertura del sito.</p>}
        <div className="wizard-actions">{step>0&&<button type="button" className="button outline" disabled={state==="saving"} onClick={()=>setStep(step-1)}>Indietro</button>}{step<3?<button type="button" className="button dark" onClick={event=>{event.preventDefault();next();}}>Continua</button>:<button
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
            ? "L’incontro dura 15 minuti ed è gratuito."
            : kind === "lesson"
              ? "55 minuti · 20 € individuale. Nessun addebito dal sito."
              : "Nessun pagamento e nessuna prenotazione automatica."}
        </p>
      </form>
    </>
  );
}
