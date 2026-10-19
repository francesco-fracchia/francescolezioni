export type VideoAccessibility = {version: 1; captions: string; transcript: string};
export const videoTextLimit = 30000;
export const normalizeCaptions = (text: string) => text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();
function timestamp(value: string) {
 const parts = value.split(':').map(Number);
 const [seconds, minutes, hours = 0] = parts.reverse();
 return minutes < 60 && seconds < 60 ? hours * 3600 + minutes * 60 + seconds : NaN;
}
/** A bounded, plain-cue WebVTT subset. No STYLE, REGION or remote resources. */
export function captionsIssue(value: string) {
 const text = normalizeCaptions(value);
 if (!text) return '';
 if (text.length > videoTextLimit || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) return 'I sottotitoli devono contenere al massimo 30.000 caratteri, senza caratteri di controllo.';
 const blocks = text.split(/\n[ \t]*\n+/);
 if (!/^WEBVTT(?:[ \t][^\n]*)?$/.test(blocks.shift() || '') || !blocks.length) return 'Usa un file WebVTT con intestazione WEBVTT e almeno una didascalia temporizzata.';
 for (const block of blocks) {
  const lines = block.split('\n');
  if (/^(?:STYLE|REGION|NOTE)(?:\s|$)/.test(lines[0])) return 'Usa soltanto didascalie temporizzate, senza blocchi STYLE, REGION o NOTE.';
  if (!lines[0].includes('-->')) lines.shift(); // Optional cue identifier.
  const time = /^((?:\d{2,}:)?\d{2}:\d{2}\.\d{3}) --> ((?:\d{2,}:)?\d{2}:\d{2}\.\d{3})$/.exec(lines.shift() || '');
  if (!time || !(timestamp(time[2]) > timestamp(time[1])) || !lines.join('').trim() || lines.some(line => line.includes('-->'))) return 'Controlla i tempi dei sottotitoli: ogni didascalia deve avere inizio, fine successiva e testo.';
 }
 return '';
}
export function encodeVideoAccessibility(captions: string, transcript: string) {
 return JSON.stringify({version: 1, captions: normalizeCaptions(captions), transcript: transcript.trim()} satisfies VideoAccessibility);
}
export function readVideoAccessibility(body: string): VideoAccessibility | null {
 try {
  const value = JSON.parse(body) as VideoAccessibility;
  return value?.version === 1 && typeof value.captions === 'string' && value.captions.length <= videoTextLimit && !captionsIssue(value.captions) && typeof value.transcript === 'string' && value.transcript.length <= videoTextLimit
   ? {version: 1, captions: normalizeCaptions(value.captions), transcript: value.transcript.trim()} : null;
 } catch {return null;}
}
export function videoReady(body: string) {
 const value = readVideoAccessibility(body);
 return !!(value?.captions && value.transcript);
}
export function captionsTranscript(value: string) {
 if (captionsIssue(value)) return '';
 return normalizeCaptions(value).split(/\n[ \t]*\n+/).slice(1).map(block => {
  const lines = block.split('\n'), timing = lines.findIndex(line => line.includes('-->'));
  return lines.slice(timing + 1).join('\n').replace(/<[^>]*>/g, '').replace(/&(amp|lt|gt|nbsp);/g, (_, entity: string) => ({amp:'&',lt:'<',gt:'>',nbsp:' '}[entity] || ''));
 }).join('\n\n');
}
