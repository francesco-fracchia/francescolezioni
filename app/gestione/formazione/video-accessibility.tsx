'use client';
import {useRef, useState, type FormEvent} from 'react';
import NativeDialog from '@/components/dialogs/native-dialog';
import {useFormSafety} from '@/components/forms/form-safety';
import {readFormResponse, safeFormMessage} from '@/components/forms/form-feedback';
import {captionsIssue, captionsTranscript, encodeVideoAccessibility, readVideoAccessibility, videoTextLimit} from '@/lib/learning/video-accessibility';
import type {Material} from '@/lib/learning/types';

export default function VideoAccessibilityEditor({material, onClose, onSaved}: {material: Material; onClose: () => void; onSaved: () => Promise<boolean>}) {
 const initial = readVideoAccessibility(material.body);
 const [captions, setCaptions] = useState(initial?.captions || ''), [transcript, setTranscript] = useState(initial?.transcript || '');
 const [expectedBody, setExpectedBody] = useState(material.body);
 const [busy, setBusy] = useState(false), [reading, setReading] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
 const form = useRef<HTMLFormElement>(null), safety = useFormSafety(form, material.id);
 async function importCaptions(file?: File) {
  if (!file) return;
  setError('');setMessage('');
  if (!file.name.toLowerCase().endsWith('.vtt') || file.size > 120000) {setError('Scegli un file .vtt con al massimo 30.000 caratteri.');return;}
  setReading(true);
  try {const text = await file.text(), issue = captionsIssue(text);if (issue) throw Error(issue);setCaptions(text);}
  catch (reason) {setError(safeFormMessage(reason));}
  finally {setReading(false);}
 }
 async function save(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();if (!safety.begin()) return;
  setBusy(true);setError('');setMessage('');
  try {
   try {
    await readFormResponse(await fetch('/api/gestione/formazione/video', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:material.id,expectedBody,captions,transcript})}), form.current);
   } catch (reason) {setError(safeFormMessage(reason));return;}
   // The write is confirmed, even when the subsequent list refresh fails.
   safety.saved();setExpectedBody(encodeVideoAccessibility(captions,transcript));setMessage('Sottotitoli e trascrizione salvati.');
   let refreshed = false;try {refreshed = await onSaved();} catch { /* Retry only the read from the manager. */ }
   if (!refreshed) setMessage('Sottotitoli e trascrizione salvati. L’elenco non si è aggiornato: puoi aggiornarlo dopo aver chiuso questa finestra.');
  } finally {safety.end();setBusy(false);}
 }
 return <NativeDialog title={'Testi del video · '+material.title} onClose={onClose} busy={busy||reading} className="video-accessibility-editor" headerClassName="video-editor-header" closeClassName="video-editor-close">
  <form ref={form} onSubmit={save}><fieldset disabled={busy||reading}>
   <p>Carica i sottotitoli WebVTT e controlla la trascrizione prima di rendere disponibile il video.</p>
   <label>Importa sottotitoli da un file .vtt<input type="file" accept=".vtt,text/vtt" onChange={event=>void importCaptions(event.target.files?.[0])}/></label>
   <label>Sottotitoli WebVTT<textarea name="captions" maxLength={videoTextLimit} rows={8} value={captions} onChange={event=>{setCaptions(event.target.value);setMessage('');}} placeholder={'WEBVTT\n\n00:00.000 --> 00:03.000\nTesto pronunciato nel video.'}/></label>
   <button type="button" className="text-link" disabled={!captions.trim()||!!captionsIssue(captions)} onClick={()=>{setTranscript(captionsTranscript(captions));setMessage('');}}>Usa il testo dei sottotitoli come trascrizione</button>
   <label>Trascrizione<textarea name="transcript" maxLength={videoTextLimit} rows={10} value={transcript} onChange={event=>{setTranscript(event.target.value);setMessage('');}}/></label>
   <button className="button dark">{busy?'Salvataggio…':'Salva testi del video'}</button>
  </fieldset>{reading&&<p role="status">Lettura dei sottotitoli…</p>}{error&&<p className="error" role="alert">{error}</p>}{message&&<p role="status">{message}</p>}</form>
 </NativeDialog>;
}
