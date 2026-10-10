'use client';
import {useState} from 'react';

export default function PlatformExample(){
 const [view,setView]=useState<'exercise'|'correction'>('exercise');
 return <section className="platform-example" aria-label="Esempio dell’area studente">
  <div className="path-tabs" role="group" aria-label="Esempio dell’area studente">
   <button aria-pressed={view==='exercise'} onClick={()=>setView('exercise')}>La consegna</button>
   <button aria-pressed={view==='correction'} onClick={()=>setView('correction')}>La correzione</button>
  </div>
  {view==='exercise'?<article>
   <h3>Risolvi x² = 9</h3>
   <p>Scrivi i passaggi e verifica tutte le soluzioni sostituendole nell’equazione.</p>
  </article>:<article>
   <h3>Manca una soluzione</h3>
   <p className="example-answer">Tentativo: <b>«x = 3, perché 3² = 9»</b>.</p>
   <p>Anche −3 funziona, perché (−3)² = 9. Le soluzioni sono quindi x = 3 e x = −3.</p>
   <p>Il quadrato di un numero negativo è positivo. Prova con x² = 16 e controlla entrambe le soluzioni.</p>
  </article>}
 </section>;
}
