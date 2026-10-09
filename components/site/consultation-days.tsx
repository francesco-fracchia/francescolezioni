"use client";
import { consultationDate } from '@/lib/consultations';

export default function ConsultationDays({days,selected,onSelect}:{days:string[];selected:string;onSelect:(day:string)=>void}) {
 const month=selected.slice(0,7),months=[...new Set(days.map(day=>day.slice(0,7)))],index=months.indexOf(month);
 const [year,number]=month.split('-').map(Number);
 const first=new Date(Date.UTC(year,number-1,1)),offset=(first.getUTCDay()+6)%7,count=new Date(Date.UTC(year,number,0)).getUTCDate();
 const label=new Intl.DateTimeFormat('it-IT',{month:'long',year:'numeric',timeZone:'UTC'}).format(first);
 function move(direction:number){const next=months[index+direction];if(next)onSelect(days.find(day=>day.startsWith(next))!);}
 return <div className="consultation-calendar">
  <div className="consultation-month"><button type="button" className="button outline" aria-label="Mese precedente" disabled={index<=0} onClick={()=>move(-1)}>←</button><strong aria-live="polite">{label}</strong><button type="button" className="button outline" aria-label="Mese successivo" disabled={index>=months.length-1} onClick={()=>move(1)}>→</button></div>
  <div className="consultation-day-grid">
   {['Lun','Mar','Mer','Gio','Ven','Sab','Dom'].map(day=><span className="calendar-weekday" key={day}>{day}</span>)}
   {Array.from({length:offset},(_,i)=><span key={'blank-'+i}/>)}
   {Array.from({length:count},(_,i)=>{const day=month+'-'+String(i+1).padStart(2,'0'),available=days.includes(day);return <button key={day} type="button" disabled={!available} aria-pressed={day===selected} aria-label={consultationDate(day+'T12:00:00.000Z')+(available?' · orari disponibili':' · nessun orario')} onClick={()=>onSelect(day)}>{i+1}</button>;})}
  </div><p className="form-note">Puoi scegliere i giorni con orari disponibili.</p>
 </div>;
}
