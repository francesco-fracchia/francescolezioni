'use client';
import { useEffect, useRef, useState } from 'react';
import RequestContext from '@/components/management/request-context';
import type { RequestRow } from '@/lib/requests/types';

type Payment = { id: string; name: string; amount: number; status: string; paid_at: string | null };
type Appointment = { id: string; subject: string; starts_at: string; ends_at: string; mode: string; status: string; payment_method?: string; payments?: Payment[] };
type Notice = { id: string; subject: string; recipient: string; body: string; status: string; error: string | null; created_at: string };
type History = { lessons: Appointment[]; bookings: Appointment[]; notifications: Notice[]; requests:RequestRow[]; truncated: { appointments: boolean; notifications: boolean; requests:boolean } };
const paymentLabels: Record<string, string> = { awaiting: 'Da saldare', pending: 'Pagamento in verifica', paid: 'Pagato online', manual_paid: 'Saldo registrato', payment_review: 'Da verificare', expired: 'Scaduto' };
const noticeLabels: Record<string, string> = { prepared: 'Anteprima', queued: 'In attesa', sending: 'Invio in verifica', sent: 'Accettata dal servizio email', failed: 'Invio non confermato', superseded: 'Superata', suppressed: 'Invio disattivato', manual_review: 'Da verificare' };
const date = (value: string) => new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Rome' }).format(new Date(value));
const amount = (value: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value / 100);
function paymentStatus(p: Payment, a: Appointment) {
 if (a.status === 'cancelled' && ['awaiting', 'expired'].includes(p.status)) return 'Non richiesto · lezione cancellata';
 return paymentLabels[p.status] || 'Da verificare';
}
function status(a: Appointment) {
 if (a.status === 'cancelled') return 'Cancellata';
 if (a.status === 'expired') return 'Scaduta';
 if (a.status === 'payment_review') return 'Pagamento da verificare';
 if (['pending', 'awaiting'].includes(a.status)) return 'In attesa di saldo';
 if (a.status === 'confirmed') return 'Confermata';
 return new Date(a.ends_at).getTime() < Date.now() ? 'Trascorsa' : 'Fissata';
}

export default function StudentHistory({ kind, id, name, onClose }: { kind: 'student' | 'group'; id: string; name: string; onClose: () => void }) {
 const heading = useRef<HTMLHeadingElement>(null);
 useEffect(() => { heading.current?.focus(); }, [kind, id]);
 const [data, setData] = useState<History | null>(null);
 const [error, setError] = useState('');
 const [tab, setTab] = useState<'appointments' | 'payments' | 'notifications' | 'requests'>('appointments');
 const [future, setFuture] = useState(false);
 const [revision, setRevision] = useState(0);
 useEffect(() => {
  const controller = new AbortController();
  setData(null); setError('');
  fetch(`/api/gestione/anagrafica/storico?kind=${kind}&id=${encodeURIComponent(id)}`, { signal: controller.signal }).then(async r => {
   if (!r.ok) throw Error('Non è stato possibile caricare lo storico.');
   return await r.json() as History;
  }).then(setData).catch(e => { if (!controller.signal.aborted) setError(e.message); });
  return () => controller.abort();
 }, [kind, id, revision]);
 const appointments = data ? [...data.lessons, ...data.bookings].sort((a, b) => b.starts_at.localeCompare(a.starts_at)) : [];
 const filtered = appointments.filter(a => !future || (new Date(a.starts_at).getTime() > Date.now() && !['cancelled', 'expired'].includes(a.status))).sort((a, b) => future ? a.starts_at.localeCompare(b.starts_at) : b.starts_at.localeCompare(a.starts_at));
 const payments = data?.lessons.flatMap(l => (l.payments || []).map(p => ({ ...p, lesson: l }))) || [];
 return <section className="student-history" aria-labelledby="history-title">
  <div className="history-heading"><div><h2 id="history-title" ref={heading} tabIndex={-1}>{name}</h2><p>{kind === 'group' ? 'Storico del gruppo' : 'Storico dello studente'}</p></div><button className="button outline" onClick={onClose}>Chiudi storico</button></div>
  <div className="history-tabs" role="group" aria-label="Sezione dello storico">{([['appointments', 'Lezioni'], ['payments', 'Saldi'], ['notifications', 'Comunicazioni'],['requests','Richieste e test']] as const).map(([value, label]) => <button className="button outline" aria-pressed={tab === value} key={value} onClick={() => setTab(value)}>{label}</button>)}</div>
  {error ? <div role="alert"><p>{error}</p><button className="button outline" onClick={() => setRevision(v => v + 1)}>Riprova</button></div> : !data ? <p role="status">Caricamento dello storico…</p> : <>
   {tab === 'appointments' && <><label className="checkbox history-filter"><input type="checkbox" checked={future} onChange={e => setFuture(e.target.checked)} />Solo lezioni future attive</label>{data.truncated.appointments && <p>Mostrate le ultime 200 lezioni per tipo di prenotazione.</p>}{!filtered.length && <p>{future ? 'Nessuna lezione futura fissata.' : 'Nessuna lezione collegata a questa scheda.'}</p>}<div className="history-items">{filtered.map(a => <article className="history-appointment" key={a.id}><div><span className="booking-badge">{status(a)}</span><h3>{a.subject}</h3><p>{date(a.starts_at)} · {a.mode.toLowerCase() === 'online' ? 'Online' : 'Lodi'}</p></div><div>{a.payments?.map(p => <p key={p.id}>{kind === 'group' && <strong>{p.name} · </strong>}{amount(p.amount)} · {paymentStatus(p, a)}</p>)}{!a.payments && <p>{a.status === 'confirmed' ? 'Pagamento online confermato' : 'Prenotazione online'}</p>}</div></article>)}</div><a className="text-link" href="/gestione/prenotazioni">Apri calendario per fissare o modificare una lezione</a></>}
   {tab === 'payments' && <><p>Qui trovi il saldo di ciascun partecipante per le lezioni fissate dal calendario. Per le prenotazioni online, il pagamento è nella scheda della lezione.</p>{!payments.length && <p>Nessun saldo individuale registrato.</p>}<div className="history-items">{payments.map(p => <article className="history-appointment" key={p.id}><div><h3>{p.name}</h3><p>{p.lesson.subject} · {date(p.lesson.starts_at)}</p><p>{status(p.lesson)} · {p.lesson.payment_method === 'cash' ? 'Contanti' : p.lesson.payment_method === 'pos' ? 'POS' : p.lesson.payment_method === 'online' ? 'Online' : 'Metodo da verificare'}</p></div><div><strong className="history-price">{amount(p.amount)}</strong><p>{paymentStatus(p, p.lesson)}</p>{p.paid_at && <p>Registrato: {date(p.paid_at)}</p>}{['cancelled', 'expired'].includes(p.lesson.status) && ['paid', 'manual_paid', 'payment_review'].includes(p.status) && <p>Il saldo resta registrato. Concorda con lo studente un recupero o un rimborso.</p>}</div></article>)}</div></>}
   {tab==='requests'&&<>{data.truncated.requests&&<p>Mostrate le ultime 100 richieste.</p>}{!data.requests.length&&<p>Nessuna richiesta collegata a questa scheda.</p>}{data.requests.map(r=><article className="registry-card" key={r.id}><h3>{r.subject}</h3><p>{r.name} · {date(r.created_at)}</p><details><summary>Programma, preferenze e risultato del test</summary><RequestContext row={r}/></details><a className="text-link" href={`/gestione?richiesta=${r.id}`}>Apri richiesta</a></article>)}</>}
   {tab === 'notifications' && <>{data.truncated.notifications && <p>Mostrate le ultime 100 comunicazioni.</p>}{!data.notifications.length && <p>Nessuna comunicazione collegata.</p>}{data.notifications.map(n => <article className="registry-card" key={n.id}><span className="booking-badge">{noticeLabels[n.status] || 'Da verificare'}</span><h3>{n.subject}</h3><p>{n.recipient} · {date(n.created_at)}</p>{n.error && <p>{n.error}</p>}<details><summary>Leggi messaggio</summary><pre className="notification-body">{n.body}</pre></details></article>)}<a className="text-link" href="/gestione/notifiche">Apri registro notifiche</a></>}
  </>}
 </section>;
}
