import '@/app/operations.css';
import '@/app/workspace.css';
import BrandLogo from '@/components/site/brand-logo';
import { getAccount } from '@/lib/auth/session';
import Login from './login';
export const dynamic='force-dynamic';
export default async function Page(){const account=await getAccount();return <><header><a className="brand" href="/"><BrandLogo className="brand-logo"  alt="Francesco Fracchia"/></a><a href="/">Torna al sito</a></header><main className="wrap booking-page"><h1>Accesso alla tua area</h1>{account?<section className="booking-empty"><p>Hai effettuato l’accesso come {account.name} · {account.role==='tutor'?'Tutor':account.role==='guardian'?'Genitore':'Studente'}.</p><a className="button dark" href={account.must_change_password?'/account':account.role==='tutor'?'/gestione':'/studente'}>{account.must_change_password?'Imposta password':account.role==='tutor'?'Apri area tutor':'Apri area studente'}</a><a className="text-link" href="/account">Gestisci account</a></section>:<Login/>}</main></>}
