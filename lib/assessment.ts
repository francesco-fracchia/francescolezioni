import type {Question} from './catalog';

export type AssessmentState = {question: number; answers: (number | null)[]; complete: boolean};
export type AssessmentAction =
 | {type: 'reset'; count: number}
 | {type: 'answer'; value: number; optionCount: number}
 | {type: 'previous' | 'next' | 'review'};
export function initialAssessment(count: number): AssessmentState {
 return {question: 0, answers: Array(count).fill(null), complete: false};
}
export function assessmentReducer(state: AssessmentState, action: AssessmentAction): AssessmentState {
 if (action.type === 'reset') return initialAssessment(action.count);
 if (action.type === 'review') return {...state, question: 0, complete: false};
 if (state.complete) return state;
 if (action.type === 'previous') return {...state, question: Math.max(0, state.question - 1)};
 if (action.type === 'answer') {
  // The option after the supplied choices is the explicit “Non lo so”.
  if (!Number.isInteger(action.value) || action.value < 0 || action.value > action.optionCount) return state;
  return {...state, answers: state.answers.map((value, index) => index === state.question ? action.value : value)};
 }
 if (state.answers[state.question] == null) return state;
 if (state.question < state.answers.length - 1) return {...state, question: state.question + 1};
 return state.answers.every(value => value !== null) ? {...state, complete: true} : state;
}
export function assessmentReview(questions: Question[], answers: (number | null)[]) {
 const items = questions.map((question, index) => ({
  ...question,
  answer: answers[index] === question.options.length ? 'Non lo so' : question.options[answers[index] ?? -1] ?? '',
  outcome: answers[index] === question.options.length ? 'unknown' : answers[index] === question.correct ? 'correct' : 'incorrect',
 }));
 const correct = items.filter(item => item.outcome === 'correct').length;
 const unknown = items.filter(item => item.outcome === 'unknown').length;
 return {items, correct, unknown, incorrect: items.length - correct - unknown, score: Math.round(correct / Math.max(1, questions.length) * 100)};
}
