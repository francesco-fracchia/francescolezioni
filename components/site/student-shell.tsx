import type {ReactNode} from 'react';
import {Eye,GraduationCap} from 'lucide-react';
export default function StudentShell({children,preview=false,account=false}:{children:ReactNode;preview?:boolean;account?:boolean}){
 return <div className="student-shell"><header className="student-header"><a href="/" className="student-brand"><img src="/francesco-fracchia-logo.png" alt="Francesco Fracchia" width={2172} height={724}/></a><span className="student-area-label">{preview?<Eye size={18} aria-hidden="true"/>:<GraduationCap size={20} aria-hidden="true"/>}{preview?'Anteprima studente':'Area studente'}</span><div>{preview?<a href="/gestione/oggi">Torna all’area tutor</a>:account?<a href="/account">Il mio account</a>:<a href="/">Sito pubblico</a>}</div></header>{preview&&<div className="student-preview-banner"><strong>Stai guardando l’area di uno studente · sola lettura</strong><span>Le modifiche si fanno nell’area tutor.</span><a href="/studente">Cambia studente</a></div>}{children}</div>;
}
