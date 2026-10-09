"use client";
import {useState} from 'react';
import {Plus} from 'lucide-react';
import {faqEntries as entries} from '@/lib/public-faq';

export default function FAQ(){const [query,setQuery]=useState('');const filtered=entries.filter(([q,a])=>(q+' '+(typeof a==='string'?a:'')).toLocaleLowerCase('it').includes(query.toLocaleLowerCase('it').trim()));return <><label className="public-search">Cerca una domanda<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Per esempio: pagamento, DSA, online"/></label><div className="faq public-faq">{filtered.map(([q,a])=><details key={q}><summary>{q}<Plus size={18}/></summary><p>{q==='Quante lezioni mi servono per un esame universitario?'?<>Nelle <a href="/esami">proposte per gli esami</a>{a.slice('Nelle proposte per gli esami'.length)}</>:a}</p></details>)}</div>{!filtered.length&&<p role="status">Non ho trovato una risposta qui. Puoi scrivermi e spiegarmi cosa vuoi sapere.</p>}</>;}