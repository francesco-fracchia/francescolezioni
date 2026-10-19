'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {consultationDay,consultationDate,consultationTime} from '@/lib/consultations';
import ConsultationDays from './consultation-days';
import WhatsAppIcon from './whatsapp-icon';
import {useSitePreview} from './site-preview-context';
type Slot = {starts_at:string;ends_at:string;mode:'Online'|'Lodi'|'Entrambe'};
type State = {status:'idle'|'loading'} | {status:'error'} | {status:'success';slots:Slot[];limited:boolean};
export default function LessonAvailability() {
  const preview = useSitePreview();
  const [open,setOpen] = useState(false), [state,setState] = useState<State>({status:'idle'});
  const [day,setDay] = useState(''), [mode,setMode] = useState('Tutte');
  const pending = useRef<AbortController|null>(null);
  const panel = useRef<HTMLDetailsElement>(null);
  useEffect(()=>{
    const reveal=()=>{if(window.location.hash==='#orari'&&panel.current)panel.current.open=true;};
    reveal();window.addEventListener('hashchange',reveal);
    return()=>window.removeEventListener('hashchange',reveal);
  },[]);
  const load = useCallback(async () => {
    pending.current?.abort(); const controller = new AbortController(); pending.current = controller; setState({status:'loading'});
    try {
      const response = await fetch('/api/lezioni/disponibilita', {cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(12000)])});
      if (!response.ok) throw Error();
      const data = await response.json() as {slots:Slot[];limited:boolean};
      if (!Array.isArray(data.slots) || data.slots.some(s=>!Number.isFinite(Date.parse(s.starts_at))||!Number.isFinite(Date.parse(s.ends_at))||!['Online','Lodi','Entrambe'].includes(s.mode))) throw Error();
      if (!controller.signal.aborted) setState({status:'success',slots:data.slots,limited:!!data.limited});
    } catch { if (!controller.signal.aborted) setState({status:'error'}); }
  },[]);
  useEffect(()=>{
    if (!open || preview) return;
    let active = true; Promise.resolve().then(()=>{if(active)void load();});
    return ()=>{active=false;pending.current?.abort();};
  },[open,preview,load]);
  const slots = state.status==='success' ? state.slots.filter(s=>mode==='Tutte'||s.mode===mode||s.mode==='Entrambe') : [];
  const days = [...new Set(slots.map(s=>consultationDay(s.starts_at)))], selected = days.includes(day) ? day : days[0];
  return <details ref={panel} id="orari" className="public-disclosure lesson-availability" onToggle={event=>setOpen(event.currentTarget.open)}>
    <summary>Guarda gli orari delle lezioni prima di acquistare</summary>
    <p>Lezioni da 55 minuti. Puoi consultare gli orari senza pagare: la disponibilità si conferma solo quando prenoti.</p>
    {preview ? <p>Nel primo incontro concordiamo programma e disponibilità.</p> : <>
      {(state.status==='loading'||state.status==='idle') && open && <p role="status">Caricamento degli orari…</p>}
      {state.status==='error' && <div><p role="alert">Non riesco a caricare gli orari. Concordiamoli prima di acquistare.</p><button className="button outline" type="button" onClick={()=>void load()}>Riprova gli orari</button></div>}
      {state.status==='success' && <>
        <label className="availability-mode">Modalità<select value={mode} onChange={event=>setMode(event.target.value)}><option>Tutte</option><option>Online</option><option value="Lodi">In presenza a Lodi</option></select></label>
        {!days.length ? <p>Non ci sono orari aperti per questa modalità. Scrivimi per concordare un appuntamento prima di acquistare.</p> : <div className="lesson-availability-picker"><ConsultationDays days={days} selected={selected} onSelect={setDay}/><div><h3>{consultationDate(selected+'T12:00:00.000Z')}</h3><ul className="available-lesson-times" aria-label="Orari consultabili, non riservati">{slots.filter(s=>consultationDay(s.starts_at)===selected).map(s=><li key={s.starts_at+s.ends_at+s.mode}><strong>{consultationTime(s.starts_at)}–{consultationTime(s.ends_at)}</strong><span>{s.mode==='Entrambe'?'Online o a Lodi':s.mode==='Lodi'?'In presenza a Lodi':'Online'}</span></li>)}</ul></div></div>}
        {state.limited&&<p className="form-note">Sono mostrati i primi 200 orari disponibili.</p>}
        <button className="text-link" type="button" onClick={()=>void load()}>Aggiorna gli orari</button>
      </>}
    </>}
    <p><a className="whatsapp-link" href="https://wa.me/393500316324" target="_blank" rel="noopener noreferrer"><WhatsAppIcon/>Concorda un orario su WhatsApp</a></p>
  </details>;
}
