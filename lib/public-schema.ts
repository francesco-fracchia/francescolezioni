import {publicPages,publicBreadcrumbs} from './public-pages';
import {studio} from './public-offer';
import {publicBusiness} from './public-business';
import {faqEntries} from './public-faq';
import {bookingRules} from './catalog';

export function serializeJsonLd(value:unknown){return JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');}
export function publicGraph(path:string,origin:string){
 const page=publicPages[path]; if(!page)return {'@context':'https://schema.org','@graph':[]};
 const business=origin+'/#lezioni',person=origin+'/#francesco',website=origin+'/#sito',url=origin+path;
 const graph:Record<string,unknown>[]=[
  {'@type':'Person','@id':person,name:'Francesco Fracchia',url:origin+'/francesco',jobTitle:'Tutor di matematica e informatica'},
  {'@type':'EducationalOrganization','@id':business,name:'Francesco Fracchia · Lezioni private',url:origin,founder:{'@id':person},telephone:publicBusiness.phone,vatID:'IT'+publicBusiness.vatNumber,address:{'@type':'PostalAddress',streetAddress:studio.address,addressLocality:studio.city,addressCountry:'IT'},description:'Ripetizioni di matematica e informatica per superiori e università, a Lodi e online. Sede confermata, apertura in preparazione.'},
  {'@type':'WebSite','@id':website,url:origin,name:'Francesco Fracchia · Lezioni private',inLanguage:'it-IT',publisher:{'@id':business}},
  {'@type':path==='/domande'?'FAQPage':'WebPage','@id':url+'#pagina',url,name:page.title,description:page.description,inLanguage:'it-IT',isPartOf:{'@id':website},about:{'@id':business},...(path==='/domande'?{mainEntity:faqEntries.map(([name,text])=>({'@type':'Question',name,acceptedAnswer:{'@type':'Answer',text}}))}:{})},
 ];
 const crumbs=publicBreadcrumbs(path);
 if(crumbs.length)graph.push({'@type':'BreadcrumbList','@id':url+'#percorso',itemListElement:crumbs.map((item,i)=>({'@type':'ListItem',position:i+1,name:item.label,item:origin+item.href}))});
 if(path==='/'||path==='/prezzi') for(const [kind,price] of [['individuale',bookingRules.individualPrice],['gruppo',bookingRules.groupPrice]] as const)graph.push({'@type':'Service','@id':origin+'/#'+kind,name:kind==='individuale'?'Ripetizioni individuali':'Ripetizioni in gruppo da 2 a 4 studenti',serviceType:'Ripetizioni di matematica e informatica',provider:{'@id':business},areaServed:{'@type':'City',name:'Lodi'},availableChannel:[{'@type':'ServiceChannel',serviceUrl:origin+'/contatti'}],...(path==='/prezzi'?{offers:{'@type':'Offer',price,priceCurrency:'EUR',url:origin+'/prezzi',description:kind==='individuale'?'Quota per una lezione di 55 minuti.':'Quota a persona per una lezione di 55 minuti.'}}:{})});
 return {'@context':'https://schema.org','@graph':graph};
}
