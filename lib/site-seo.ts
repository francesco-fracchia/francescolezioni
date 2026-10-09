import type { Metadata, MetadataRoute } from 'next';
import { env } from './runtime-env';
import { publicPages } from './public-pages';

const previewOrigin='https://francesco-fracchia-lezioni.francescofracchia.chatgpt.site';
function config(key: 'SITE_ORIGIN'|'PUBLIC_SITE_INDEXING') {
 try { return env[key] || ''; } catch { return process.env.NODE_ENV==='development'?process.env[key]||'':''; }
}
export function siteOrigin() {
 try { const url=new URL(config('SITE_ORIGIN')); if(url.protocol==='https:'&&!url.username&&!url.password&&url.pathname==='/'&&!url.search&&!url.hash) return url.origin; } catch {}
 return previewOrigin;
}
export function publicIndexingEnabled(){return config('PUBLIC_SITE_INDEXING')==='true';}
export const privateRobots={index:false,follow:false,noarchive:true};
export function publicPageMetadata(path:string):Metadata {
 const page=publicPages[path]; if(!page) return {robots:privateRobots};
 const url=siteOrigin()+path;
 return {title:page.title,description:page.description,alternates:{canonical:url},
  robots:publicIndexingEnabled()?{index:true,follow:true}:privateRobots,
  openGraph:{type:'website',locale:'it_IT',siteName:'Francesco Fracchia · Lezioni private',title:page.title,description:page.description,url},
  twitter:{card:'summary',title:page.title,description:page.description},
 };
}
export function searchRobots():MetadataRoute.Robots {
 return publicIndexingEnabled()?{rules:{userAgent:'*',allow:'/',disallow:['/gestione','/studente','/account','/accesso','/api/','/prenota','/pagamento','/signin-with-chatgpt','/callback','/signout-with-chatgpt']},sitemap:siteOrigin()+'/sitemap.xml'}:{rules:{userAgent:'*',disallow:'/'}};
}
export function publicSitemap():MetadataRoute.Sitemap {
 return publicIndexingEnabled()?Object.keys(publicPages).map(path=>({url:siteOrigin()+path})):[];
}
