import {publicPageMetadata} from '@/lib/site-seo';
import Privacy from '@/components/site/privacy';
export function generateMetadata(){return publicPageMetadata('/privacy');}
export default function Page(){return <main className="wrap subject-page"><h1>Dati e privacy</h1><section className="public-panel public-spaced"><Privacy/></section></main>;}
