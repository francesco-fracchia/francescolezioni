import {z} from 'zod';
import { isRequestOwner } from '@/lib/request-admin';
import { bookingDb } from '@/lib/booking/runtime';
import {failure, LearningError, privateHeaders, sameOrigin} from '@/lib/learning/access';
import {captionsIssue, encodeVideoAccessibility, videoTextLimit} from '@/lib/learning/video-accessibility';
import {issueFieldErrors} from '@/lib/form-errors.mjs';

const schema = z.object({id: z.string().uuid(), expectedBody: z.string().max(130000), captions: z.string().max(videoTextLimit), transcript: z.string().max(videoTextLimit).refine(value=>!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value),'Rimuovi i caratteri di controllo dalla trascrizione.')});
export async function POST(request: Request) {
 if (!await isRequestOwner()) return new Response(null, {status: 403});
 try {
  sameOrigin(request);
  const raw = await request.text();
  if (raw.length > 400000) throw new LearningError('Testo troppo lungo.', 413);
  const parsed = schema.safeParse(JSON.parse(raw));
  if (!parsed.success) throw new LearningError('Controlla i testi del video.', 400, issueFieldErrors(parsed.error.issues));
  const p = parsed.data, issue = captionsIssue(p.captions);
  if (issue) throw new LearningError(issue, 400, {captions: issue});
  const db = bookingDb();
  const current = await db.prepare("SELECT body,status FROM course_materials WHERE id=? AND kind='video'").bind(p.id).first<{body: string; status: string}>();
  if (!current) throw new LearningError('Video non disponibile.', 404);
  if (current.status === 'published' && (!p.captions.trim() || !p.transcript.trim())) throw new LearningError('Per un video disponibile servono sia i sottotitoli sia la trascrizione.', 400);
  const body = encodeVideoAccessibility(p.captions, p.transcript);
  if (current.body === body) return Response.json({ok: true}, {headers: privateHeaders});
  const result = await db.prepare("UPDATE course_materials SET body=? WHERE id=? AND kind='video' AND body=? AND (status!='published' OR ?=1)").bind(body, p.id, p.expectedBody, p.captions.trim()&&p.transcript.trim()?1:0).run();
  if (!result.meta.changes) throw new LearningError('Questo video è stato aggiornato altrove. I tuoi testi restano nel modulo: copiali, poi riapri il video aggiornato.', 409);
  return Response.json({ok: true}, {headers: privateHeaders});
 } catch (error) {return failure(error instanceof SyntaxError ? new LearningError('Dati non validi.') : error);}
}
