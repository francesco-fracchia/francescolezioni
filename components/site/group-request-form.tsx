'use client';
import {useRef,useState,type FormEvent} from 'react';
import {Check} from 'lucide-react';
import {useFormSafety} from '@/components/forms/form-safety';
import {readFormResponse,showFormError,validateFields,FormResponseError} from '@/components/forms/form-feedback';
import {schoolSubjects,universitySubjects} from '@/lib/catalog';
import PrivacyNotice from './privacy-notice';
import ResponseExpectation from './response-expectation';
import {useSitePreview} from './site-preview-context';
import type {Assessment,GroupSize} from './types';
const labels:Record<string,string>={name:'Nome',email:'Email',phone:'Telefono',subject:'Materia',goal:'Obiettivo',availability:'Giorni e orari',mode:'Modalità',studentType:'Studi',institution:'Scuola o ateneo',year:'Classe o anno',teacher:'Docente',program:'Argomenti',deadline:'Scadenza',level:'Preparazione',groupSize:'Numero di studenti',companion:'Hai già dei compagni?',participant1:'Compagno 1',participant2:'Compagno 2',participant3:'Compagno 3',participantLevel1:'Preparazione del compagno 1',participantLevel2:'Preparazione del compagno 2',participantLevel3:'Preparazione del compagno 3',sharedProgram:'Programma del gruppo',groupNotes:'Note sul gruppo'};
const reviewGroups=[{title:'Contatti',keys:['name','email','phone']},{title:'Programma',keys:['subject','goal','studentType','institution','year','teacher','program','deadline','level']},{title:'Disponibilità e gruppo',keys:['availability','mode','companion','groupSize','participant1','participantLevel1','participant2','participantLevel2','participant3','participantLevel3','sharedProgram','groupNotes']}];
export default function GroupRequestForm({subject,assessment,hasCompanion,groupSize}:{subject:string;assessment:Assessment|null;hasCompanion:boolean;groupSize:GroupSize}){
 const preview=useSitePreview(),formRef=useRef<HTMLFormElement>(null),heading=useRef<HTMLHeadingElement>(null);
 const [step,setStep]=useState(0),[review,setReview]=useState<Record<string,string>>({}),[companions,setCompanions]=useState(hasCompanion),[state,setState]=useState<'idle'|'saving'|'success'|'error'>('idle'),[error,setError]=useState('');
 const attempt=useRef<{id:string;body:string}|null>(null),safety=useFormSafety(formRef,'group:'+subject,state!=='success');
 function edit(field?:string){setStep(0);requestAnimationFrame(()=>{const target=field?formRef.current?.elements.namedItem(field):null;if(target instanceof HTMLElement){for(let parent=target.parentElement;parent;parent=parent.parentElement)if(parent instanceof HTMLDetailsElement)parent.open=true;target.focus();target.scrollIntoView({block:'center'});}else{heading.current?.focus();heading.current?.scrollIntoView({block:'start'});}});}
 function next(){if(!formRef.current||!validateFields(formRef.current.querySelector('[data-group-fields]')!))return;
  setReview(Object.fromEntries(Array.from(new FormData(formRef.current)).map(([key,value])=>[key,String(value)])));setStep(1);
  requestAnimationFrame(()=>{heading.current?.focus();heading.current?.scrollIntoView({block:'start'});});
 }
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();if(preview||!formRef.current)return;
  const form=formRef.current;if(!validateFields(form)){if(form.querySelector('[data-group-fields] [aria-invalid="true"]'))edit();return;}
  const f=new FormData(form),get=(key:string)=>String(f.get(key)||'').trim();
  const body=JSON.stringify({kind:'group',name:get('name'),email:get('email'),subject:get('subject'),consent:f.get('consent')==='on',website:get('website'),assessment,details:{studentType:get('studentType'),institution:get('institution'),year:get('year'),teacher:get('teacher'),program:get('program'),goal:get('goal'),deadline:get('deadline'),availability:get('availability'),mode:get('mode'),level:get('level'),groupSize:get('groupSize'),companion:companions,phone:get('phone'),groupRequest:companions?'existing':'matching',participants:companions?[1,2,3].map(n=>({name:get('participant'+n),level:get('participantLevel'+n)})).filter(p=>p.name||p.level):[],sharedProgram:companions?get('sharedProgram'):'',groupNotes:companions?get('groupNotes'):''}});
  if(attempt.current?.body!==body)attempt.current={id:crypto.randomUUID(),body};if(!safety.begin())return;setState('saving');setError('');
  try{await readFormResponse(await fetch('/api/requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:attempt.current.id,...JSON.parse(body)})}));safety.saved();setState('success');}
  catch(e){setState('error');if(e instanceof FormResponseError&&Object.keys(e.fieldErrors).some(key=>key!=='consent'))edit();setError(showFormError(e,form));}
  finally{safety.end();}
 }
 if(state==='success')return <section className="success" aria-live="polite"><span className="success-icon"><Check size={32}/></span><h2 id="dialog-title">Richiesta ricevuta</h2><p>{companions?'Ti ricontatto per concordare programma e disponibilità del gruppo.':'Ti ricontatto per capire cosa stai cercando. Ti proporrò un gruppo quando trovo compagni compatibili.'} Nessuna lezione è ancora prenotata.</p><ResponseExpectation matching={!companions}/></section>;
 return <><h2 id="dialog-title">{companions?'Studiare con i tuoi compagni':'Troviamo un gruppo'}</h2><p>Bastano un recapito, la materia, cosa vuoi preparare e quando sei disponibile. Gli altri dettagli possiamo definirli insieme.</p><form ref={formRef} onSubmit={submit} noValidate>
  <h3 ref={heading} className="request-step-title" tabIndex={-1}>{step===0?'La tua richiesta':'Controlla e invia'}</h3>
  <p className="form-note">Passaggio {step+1} di 2</p>
  <fieldset disabled={state==='saving'} hidden={step!==0} data-group-fields className="group-first-contact">
   <div className="form-grid"><label>Nome<input name="name" autoComplete="name" required minLength={2} maxLength={100}/></label><label>Email<input name="email" type="email" autoComplete="email" required maxLength={254}/></label>
   <label className="full">Materia / esame<select name="subject" defaultValue={subject||'Matematica'}>{[...new Set([...schoolSubjects,...universitySubjects,'Altro esame'])].map(s=><option key={s}>{s}</option>)}</select></label>
   <label className="full">Cosa vuoi preparare?<input name="goal" required minLength={2} maxLength={1000} placeholder="Es. una verifica sulle equazioni o l’esame di Analisi 1"/></label>
   <label className="full">Giorni e fasce orarie disponibili<input name="availability" required minLength={2} maxLength={1000} placeholder="Es. lunedì e giovedì pomeriggio"/></label>
   <label className="full">Modalità<select name="mode"><option>Online</option><option>Lodi</option><option>Entrambe</option></select></label></div>
   <details className="group-optional-details"><summary>Aggiungi dettagli sul programma (facoltativo)</summary><div className="form-grid">
    <label>Telefono (facoltativo)<input name="phone" type="tel" autoComplete="tel" maxLength={40}/></label>
    <label>Studi (facoltativo)<select name="studentType" defaultValue=""><option value="">Da definire</option><option>Superiori</option><option>Università</option></select></label>
    <label>Scuola o ateneo (facoltativo)<input name="institution" maxLength={200}/></label><label>Classe o anno (facoltativo)<input name="year" maxLength={100}/></label>
    <label className="full">Docente (facoltativo)<input name="teacher" maxLength={100}/></label><label className="full">Programma e argomenti (facoltativo)<textarea name="program" maxLength={3000}/></label>
    <label>Data verifica / appello (facoltativo)<input name="deadline" type="date"/></label><label>Preparazione (facoltativo)<select name="level" defaultValue=""><option value="">Da valutare insieme</option><option>Ho bisogno delle basi</option><option>Devo consolidare</option><option>Voglio esercitarmi</option></select></label>
   </div></details>
   <details className="group-optional-details"><summary>Aggiungi dettagli sui compagni (facoltativo)</summary><p>Puoi inviare la richiesta anche senza conoscere ancora i nomi o il numero di partecipanti.</p>
    <label className="checkbox"><input name="companion" type="checkbox" checked={companions} onChange={e=>setCompanions(e.target.checked)}/>Ho già uno o più compagni</label>
    <label>Numero di studenti (facoltativo)<select name="groupSize" defaultValue={groupSize===2?'Coppia':`Fino a ${groupSize} studenti`}><option value="">Da concordare</option><option>Coppia</option><option>Fino a 3 studenti</option><option>Fino a 4 studenti</option></select></label>
    {companions&&<><p className="form-note">Non inserire email o numeri di telefono dei compagni.</p>{[1,2,3].map(n=><fieldset className="request-companion" key={n}><legend>Compagno {n} (facoltativo)</legend><label>Nome o iniziali<input name={'participant'+n} maxLength={100}/></label><label>Classe, corso e preparazione<input name={'participantLevel'+n} maxLength={200}/></label></fieldset>)}
    <label>Programma condiviso (facoltativo)<select name="sharedProgram" defaultValue=""><option value="">Da verificare insieme</option><option>Sì, stesso programma</option><option>In parte: da verificare insieme</option><option>Programmi diversi</option></select></label><label>Note sul gruppo (facoltativo)<textarea name="groupNotes" maxLength={2000}/></label></>}
   </details>
  </fieldset>
  <section hidden={step!==1}>
   <div className="request-review-groups">{reviewGroups.map(group=><section key={group.title} aria-label={group.title}><div className="request-review-heading"><h4>{group.title}</h4><button className="text-link" type="button" disabled={state==='saving'} onClick={()=>edit(group.title==='Contatti'?'name':group.title==='Programma'?(review.program?'program':'goal'):'availability')}>Modifica<span className="sr-only"> {group.title.toLowerCase()}</span></button></div><dl className="request-review">{group.keys.filter(key=>key==='companion'||review[key]?.trim()).filter(key=>companions||!/^participant|sharedProgram|groupNotes/.test(key)).map(key=><div key={key}><dt>{labels[key]}</dt><dd>{key==='companion'?companions?'Sì':'No':key==='deadline'?review[key].split('-').reverse().join('/'):review[key]}</dd></div>)}</dl></section>)}</div>
   {assessment&&<p>Test incluso: {assessment.test} · {assessment.score}%.</p>}
   <PrivacyNotice purpose="Uso questi dati per valutare la richiesta e ricontattarti."/><label className="checkbox"><input name="consent" type="checkbox" required disabled={state==='saving'}/>Ho letto l’informativa privacy.</label>
  </section>
  <label className="honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off"/></label>
  {error&&<p role="alert" className="error">{error}</p>}
  {preview&&<p className="form-note">Durante l’anteprima la richiesta non viene inviata.</p>}
  <div className="wizard-actions">{step===0?<button key="next" type="button" className="button dark" onClick={event=>{event.preventDefault();next();}}>Controlla la richiesta</button>:<><button type="button" className="button outline" disabled={state==='saving'} onClick={()=>edit()}>Indietro</button><button key="submit" type="submit" className="button dark" disabled={preview||state==='saving'}>{state==='saving'?'Invio in corso…':'Invia la richiesta'}</button></>}</div>
  <p className="form-note">Nessun pagamento e nessuna prenotazione automatica.</p>
 </form><ResponseExpectation matching={!companions}/></>;
}
