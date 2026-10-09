'use client';
import {Video} from 'lucide-react';
import {meetUrl} from '@/lib/lesson-calendar-export';
import type {StudentAppointment} from '@/lib/learning/types';
export default function MeetingLink({appointment,now}:{appointment:StudentAppointment;now:number}){
 if(appointment.mode!=='Online'||appointment.status!==(appointment.kind==='lesson'?'planned':'confirmed')||Date.parse(appointment.ends_at)<=now)return null;
 const url=meetUrl(appointment.video_url);
 return <div className="student-meeting-link">{url?<><a className="button dark" href={url} target="_blank" rel="noreferrer"><Video size={18}/>Entra nella lezione</a><p>Si apre Google Meet in una nuova scheda.</p></>:<p>Francesco aggiungerà qui il link della videochiamata. Se la lezione sta per iniziare e non lo trovi, contattalo.</p>}</div>;
}
