import type { Metadata, MetadataRoute } from 'next';
import { env } from './runtime-env';
import { publicPages } from './public-pages';
import {canonicalSiteOrigin, httpsOrigin, indexingExcluded, indexingExcludedPaths, releaseIndexingAllowed} from './site-release.mjs';

function config(key: 'SITE_ORIGIN'|'PUBLIC_SITE_INDEXING'|'SITE_VISIBILITY') {
 try { return env[key] || ''; } catch { return process.env.NODE_ENV==='development'?process.env[key]||'':''; }
}
export function siteOrigin() {
 return httpsOrigin(config('SITE_ORIGIN')) || canonicalSiteOrigin;
}
export function publicIndexingEnabled(){return releaseIndexingAllowed({visibility:config('SITE_VISIBILITY'),indexing:config('PUBLIC_SITE_INDEXING'),origin:config('SITE_ORIGIN')});}
export const privateRobots={index:false,follow:false,noarchive:true};
export function publicPageMetadata(path:string):Metadata {
 const page=publicPages[path]; if(!page) return {robots:privateRobots};
 const url=siteOrigin()+path;
 const image={url:siteOrigin()+'/images/lezioni-francesco-social.png',width:1200,height:630,alt:'Francesco Fracchia · Matematica e informatica, a Lodi e online'};
 return {title:page.title,description:page.description,alternates:{canonical:url},
  robots:publicIndexingEnabled()&&!indexingExcluded(path)?{index:true,follow:true}:privateRobots,
  openGraph:{type:'website',locale:'it_IT',siteName:'Francesco Fracchia · Lezioni private',title:page.title,description:page.description,url,images:[image]},
  twitter:{card:'summary_large_image',title:page.title,description:page.description,images:[image.url]},
 };
}
export function searchRobots():MetadataRoute.Robots {
 return publicIndexingEnabled()?{rules:{userAgent:'*',allow:'/',disallow:indexingExcludedPaths},sitemap:siteOrigin()+'/sitemap.xml'}:{rules:{userAgent:'*',disallow:'/'}};
}
export function publicSitemap():MetadataRoute.Sitemap {
 return publicIndexingEnabled()?Object.keys(publicPages).filter(path=>!indexingExcluded(path)).map(path=>({url:siteOrigin()+path})):[];
}
