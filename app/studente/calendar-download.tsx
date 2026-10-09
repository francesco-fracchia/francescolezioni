'use client';
import { useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import { lessonCalendar,meetUrl } from '@/lib/lesson-calendar-export';
import { studio } from '@/lib/public-offer';
import type { StudentAppointment } from '@/lib/learning/types';

export default function CalendarDownload({ appointment }: { appointment: StudentAppointment }) {
  const [error,setError] = useState('');
  function download() {
    try {
      setError('');
      const location = appointment.mode === 'Lodi' ? `${studio.address}, ${studio.city}` : meetUrl(appointment.video_url)?'Online · Google Meet':'Online · collegamento comunicato da Francesco';
      const file = new Blob([lessonCalendar(appointment, location)], {type:'text/calendar;charset=utf-8'});
      const href = URL.createObjectURL(file), link = document.createElement('a');
      link.href = href; link.download = `lezione-${appointment.kind}-${appointment.id}.ics`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(href), 60000);
    } catch(e) { setError(e instanceof Error ? e.message : 'File non disponibile. Ricarica le lezioni.'); }
  }
  return <div className="student-calendar-download"><button className="button outline" onClick={download}><CalendarPlus size={18}/>Aggiungi al calendario</button>{error&&<p className="error" role="alert">{error}</p>}</div>;
}
