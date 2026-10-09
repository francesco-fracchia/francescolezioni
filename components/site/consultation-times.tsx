'use client';
import {useState} from 'react';
import {consultationTime,type ConsultationSlot} from '@/lib/consultations';
const bands=[{id:'morning',label:'Mattina',from:0,to:12},{id:'afternoon',label:'Pomeriggio',from:12,to:17},{id:'evening',label:'Sera',from:17,to:24}];
const hour=(s:ConsultationSlot)=>Number(consultationTime(s.starts_at).split(':')[0]);
const modeLabel=(s:ConsultationSlot)=>s.mode==='Entrambe'?'Online o in presenza':s.mode==='Lodi'?'In presenza a Lodi':'Online';
export default function ConsultationTimes({slots,selected,onSelect}:{slots:ConsultationSlot[];selected:string;onSelect:(slot:ConsultationSlot|null)=>void}){
 const chosen=slots.find(s=>s.id===selected);
 const groups=bands.map(b=>({...b,slots:slots.filter(s=>hour(s)>=b.from&&hour(s)<b.to)})).filter(b=>b.slots.length);
 const [band,setBand]=useState(()=>groups.find(b=>chosen&&b.slots.some(s=>s.id===chosen.id))?.id||groups[0]?.id);
 const active=groups.find(b=>b.id===band)||groups[0];
 const commonMode=new Set(slots.map(s=>s.mode)).size===1;
 return <div className="consultation-time-picker"><p className="consultation-time-note">Orario di inizio · incontri da 15 minuti{commonMode&&slots[0]?<><br/>{modeLabel(slots[0])}</>:null}</p><div className="consultation-bands" role="group" aria-label="Fascia oraria">{groups.map(b=><button type="button" key={b.id} aria-pressed={b.id===active?.id} onClick={()=>{if(b.id!==active?.id){setBand(b.id);onSelect(null);}}}>{b.label}<span>{b.slots.length}</span></button>)}</div><div className="consultation-time-chips" role="group" aria-label={'Orari disponibili · '+(active?.label||'')}>{active?.slots.map(s=><label key={s.id} className={s.id===selected?'selected':''}><input type="radio" name="slot" value={s.id} checked={s.id===selected} onChange={()=>onSelect(s)} required/><span>{consultationTime(s.starts_at)}{!commonMode&&<small>{modeLabel(s)}</small>}</span><span className="sr-only">–{consultationTime(s.ends_at)} · {modeLabel(s)}</span></label>)}</div></div>;
}
