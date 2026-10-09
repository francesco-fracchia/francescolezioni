"use client";
import {useState,type FormEvent} from 'react';
import {ArrowRight} from 'lucide-react';
export default function PreviewLogin({local,configured}:{local:boolean;configured:boolean}){
 const [password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();if(busy)return;setBusy(true);setError('');try{const response=await fetch('/api/anteprima',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});const result=await response.json();if(!response.ok)throw Error(result.error||'Accesso non riuscito.');window.location.assign('/');}catch(error){setError(error instanceof Error?error.message:'Accesso non riuscito. Riprova.');setBusy(false);}}
 if(!configured)return <p role="status">L’accesso riservato non è ancora attivo.</p>;
 return <form onSubmit={submit}>{!local&&<label htmlFor="preview-password">Password dell’anteprima<input id="preview-password" name="password" type="password" autoComplete="current-password" value={password} onChange={event=>setPassword(event.target.value)} required maxLength={256} aria-describedby={error?'preview-login-error':undefined}/></label>}{error&&<p id="preview-login-error" className="preview-login-error" role="alert">{error}</p>}<button type="submit" disabled={busy}>{busy?'Apertura…':local?'Apri anteprima locale':'Apri anteprima'}{!busy&&<ArrowRight size={17} aria-hidden="true"/>}</button></form>;
}
