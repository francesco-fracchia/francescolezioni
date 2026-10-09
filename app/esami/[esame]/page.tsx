import {publicPageMetadata} from '@/lib/site-seo';
import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {getExamPlan,recommendedLessons} from '@/lib/exam-preparation';
import ExamPlanner from '@/components/site/exam-planner';
type Props={params:Promise<{esame:string}>};
export async function generateMetadata({params}:Props):Promise<Metadata>{return publicPageMetadata('/esami/'+(await params).esame);}
export default async function Exam({params}:Props){const plan=getExamPlan((await params).esame);if(!plan)notFound();return <><main className="wrap subject-page exam-page"><section className="subject-intro"><p className="subject-audience">Lezioni con Francesco · In presenza a Lodi o online</p><h1>{plan.name}</h1><p>{plan.description}</p><p>Queste sono lezioni dal vivo, con me. Il programma pubblico è una proposta da discutere; i corsi registrati sono ancora in preparazione.</p></section><ExamPlanner key={plan.slug} plan={plan}/><section><h2>Tra una lezione e l’altra</h2><p>Se concordiamo anche esercizi da fare a casa, li trovi nella tua area studente. Puoi consegnare il lavoro e leggere le correzioni che condivido, insieme ai materiali e ai riepiloghi delle lezioni.</p><a className="text-link" href="/piattaforma">Guarda un esempio dell’area studente</a></section><nav className="subject-other" aria-label="Altre lezioni"><a href="/esami">Altri esami universitari</a><a href="/prezzi">Prezzi delle lezioni</a><a href="/">Torna al sito</a></nav></main></>;}
