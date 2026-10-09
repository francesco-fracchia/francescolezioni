"use client";
import {useState} from 'react';
import {Eye,LogOut} from 'lucide-react';
export default function SitePreviewBar(){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function leave(){setBusy(true);setError('');try{const response=await fetch('/api/anteprima',{method:'DELETE'});if(!response.ok)throw Error();window.location.assign('/preparazione');}catch{setError('Non riesco a chiudere l’anteprima. Riprova.');setBusy(false);}}
 return <aside className="site-preview-bar" aria-label="Anteprima riservata"><div><Eye size={18} aria-hidden="true"/><p><strong>Anteprima riservata</strong><span>Prenotazioni e pagamenti sono disattivati.</span></p></div><button type="button" onClick={leave} disabled={busy}><LogOut size={16} aria-hidden="true"/>{busy?'Chiusura…':'Esci dall’anteprima'}</button>{error&&<p role="alert">{error}</p>}</aside>;
}
