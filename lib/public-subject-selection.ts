import { schoolSubjects, universitySubjects } from './catalog';

// Only known subjects can be passed to public forms; all other input uses the default.
export function publicSubjectSelection(value: string | string[] | undefined) {
  if (typeof value !== 'string') return 'Matematica';
  const slug = value.toLowerCase();
  if (slug === 'matematica') return 'Matematica';
  if (slug === 'informatica') return 'Informatica';
  return [...schoolSubjects, ...universitySubjects].includes(value) ? value : 'Matematica';
}
