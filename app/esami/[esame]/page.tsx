import '@/app/public.css';
import {publicPageMetadata} from '@/lib/site-seo';
import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {getExamPlan} from '@/lib/exam-preparation';
import ExamPlanner from '@/components/site/exam-planner';
type Props={params:Promise<{esame:string}>};
export async function generateMetadata({params}:Props):Promise<Metadata>{return publicPageMetadata('/esami/'+(await params).esame);}
export default async function Exam({params}:Props){const plan=getExamPlan((await params).esame);if(!plan)notFound();return <><main className="wrap subject-page exam-page"><section className="subject-intro"><p className="subject-audience">Lezioni con Francesco · In presenza a Lodi o online</p><h1>{plan.name}</h1><p>{plan.description}</p><p>Lezioni dal vivo di 55 minuti, individuali o in gruppo.</p></section><ExamPlanner key={plan.slug} plan={plan}/><section><h2>Tra una lezione e l’altra</h2><p>Per gli esercizi da casa puoi caricare una foto dei passaggi o il codice. I miei commenti restano accanto alla consegna, così puoi rivederli mentre studi.</p><a className="text-link" href="/piattaforma">Guarda un esempio dell’area studente</a></section><nav className="subject-other" aria-label="Altre lezioni"><a href="/esami">Altri esami universitari</a><a href="/prezzi">Prezzi delle lezioni</a><a href="/">Torna al sito</a></nav></main></>;}
