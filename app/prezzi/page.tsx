import {publicPageMetadata} from '@/lib/site-seo';
import PricesPage from '@/components/site/prices-page';
export function generateMetadata(){return publicPageMetadata('/prezzi');}
export default function Page(){return <PricesPage/>;}
