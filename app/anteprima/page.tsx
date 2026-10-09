import type {Metadata} from 'next';
import {headers} from 'next/headers';
import {ArrowLeft,LockKeyhole} from 'lucide-react';
import {localPreviewAllowed,previewConfigured} from '@/lib/site-preview.mjs';
import PreviewLogin from './preview-login';
import '../preparazione/preparation.css';
export const metadata:Metadata={title:'Anteprima riservata',robots:{index:false,follow:false}};
export default async function Page(){
 const host=(await headers()).get('host')||'invalid.local';
 const local=localPreviewAllowed({url:'http://'+host});
 return <div className="preparation-shell"><header className="preparation-header"><img src="/francesco-fracchia-logo.png" alt="Francesco Fracchia — Lezioni private" width={2172} height={724}/><span className="preparation-status">Accesso riservato</span></header><main className="preview-login-main"><section className="preview-login-card"><span className="preview-login-icon"><LockKeyhole size={23} aria-hidden="true"/></span><h1>Anteprima del sito</h1><p>Qui puoi rivedere le pagine prima della pubblicazione. Le prenotazioni e i pagamenti restano disattivati.</p><PreviewLogin local={local} configured={local||previewConfigured()}/><a href="/preparazione" className="preview-login-back"><ArrowLeft size={15} aria-hidden="true"/>Torna alla pagina iniziale</a></section></main></div>;
}
