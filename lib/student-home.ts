import type { StudentAppointment, StudentData } from './learning/types';
import type { HomeworkData, Submission } from './homework/types';
import type { StudyData } from './study/types';

export function activeAppointment(appointment: StudentAppointment, now: number) {
  const start = Date.parse(appointment.starts_at), end = Date.parse(appointment.ends_at);
  return Number.isFinite(start) && Number.isFinite(end) && end > start && end > now &&
    appointment.status === (appointment.kind === 'lesson' ? 'planned' : 'confirmed');
}

export function nextAppointment(data: StudentData, now = Date.now()) {
  if (data.nextAppointment !== undefined) return data.nextAppointment && activeAppointment(data.nextAppointment, now) ? data.nextAppointment : null;
  return [...data.lessons.map(l => ({ ...l, kind: 'lesson' as const })), ...data.bookings.map(b => ({ ...b, kind: 'booking' as const }))]
    .filter(a => activeAppointment(a, now)).sort((a,b) => Date.parse(a.starts_at) - Date.parse(b.starts_at) || a.id.localeCompare(b.id))[0] || null;
}

export function homeworkOverview(data: HomeworkData) {
  const assignments = data.assignments.filter(a => a.status === 'published');
  const tasks = assignments.map(task => {
    const attempts = data.submissions.filter(s => s.assignment_id === task.id).sort((a,b) => b.attempt - a.attempt);
    const latest = attempts[0];
    const status = !latest ? 'todo' : latest.feedback_status === 'published' && latest.review_status === 'revise' ? 'revise' : latest.feedback_status === 'published' && latest.review_status === 'accepted' ? 'completed' : 'waiting';
    return { task, latest, status, attempts: attempts.length };
  });
  const pending = tasks.filter(t => t.status === 'todo' || t.status === 'revise').sort((a,b) =>
    (a.task.due_date || '9999').localeCompare(b.task.due_date || '9999') || b.task.created_at.localeCompare(a.task.created_at) || a.task.id.localeCompare(b.task.id));
  const shared: { task: typeof assignments[number]; submission: Submission }[] = [];
  for (const task of assignments) for (const submission of data.submissions) {
    if (submission.assignment_id === task.id && submission.feedback_status === 'published') shared.push({ task, submission });
  }
  shared.sort((a,b) => (b.submission.reviewed_at || b.submission.created_at).localeCompare(a.submission.reviewed_at || a.submission.created_at) || b.submission.attempt - a.submission.attempt || a.submission.id.localeCompare(b.submission.id));
  return { pending, waiting: tasks.filter(t => t.status === 'waiting').length, correction: shared[0] || null };
}

export function studyOverview(data: StudyData) {
  const plans = data.plans.filter(p => p.status === 'published').sort((a,b) => b.updated_at.localeCompare(a.updated_at) || a.id.localeCompare(b.id));
  const summaries = data.summaries.filter(s => s.status === 'published').sort((a,b) => b.starts_at.localeCompare(a.starts_at) || a.id.localeCompare(b.id));
  return { plan: plans[0] || null, summary: summaries[0] || null };
}

export function materialsToStudy(data: StudentData) {
  return data.materials.filter(m => m.status === 'published' && !m.completed_at)
    .sort((a,b) => (b.created_at || '').localeCompare(a.created_at || '') || a.position - b.position || a.id.localeCompare(b.id));
}
