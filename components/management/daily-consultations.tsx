'use client';
import AvailabilitySettings from '@/app/gestione/prenotazioni/availability-settings';
export default function DailyConsultations({onSaved}:{onSaved:()=>Promise<void>}){return <AvailabilitySettings onChanged={()=>void onSaved()}/>;}
