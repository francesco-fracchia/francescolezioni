import '@/app/public.css';
import {publicPageMetadata} from '@/lib/site-seo';
import ExamCatalogue from '@/components/site/exam-catalogue';
export function generateMetadata(){return publicPageMetadata('/esami');}
export default function Exams(){return <><main className="wrap subject-page"><section className="subject-intro"><p className="subject-audience">Università · A Lodi e online</p><h1>Preparare un esame universitario</h1><p>Per chi ha già seguito il corso e vuole ripassare per l’esame. Scegli gli argomenti per vedere un esempio di piano e il costo orientativo.</p></section><ExamCatalogue/><section><h2>Come definiamo il numero di lezioni</h2><p>Portami il programma e una prova d’appello, con la data dell’esame. Se parti da zero o ti mancano alcune basi, servirà un piano diverso da questi esempi.</p><a className="button dark" href="/incontro">Prenota un incontro gratuito</a></section></main></>;}
