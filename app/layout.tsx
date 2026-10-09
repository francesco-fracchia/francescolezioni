import type { Metadata } from 'next';
import {siteOrigin,privateRobots} from '@/lib/site-seo';
import './globals.css';
import './public.css';
import './workspace.css';
import PublicFrame from '@/components/site/public-frame';
// Render per request: the private deployment has no shared Next ISR cache.
export const dynamic = 'force-dynamic';
export function generateMetadata():Metadata{return {metadataBase:new URL(siteOrigin()),title:'Francesco Fracchia | Matematica e informatica a Lodi e online',description:'Ripetizioni di matematica e informatica a Lodi e online con Francesco Fracchia.',robots:privateRobots,icons:{icon:'/favicon.svg'}};}
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="it"><body><PublicFrame origin={siteOrigin()}>{children}</PublicFrame></body></html>}
