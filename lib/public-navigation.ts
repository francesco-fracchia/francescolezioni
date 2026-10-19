export const publicNavigation = [
 {href:'/catalogo',label:'Lezioni'}, {href:'/prezzi',label:'Prezzi'},
 {href:'/metodo',label:'Come lavoro'}, {href:'/francesco',label:'Chi sono'}, {href:'/contatti',label:'Contatti'},
];
export const publicLessonNavigation = [
 {href:'/lezioni/matematica',label:'Matematica',description:'Superiori e università'},
 {href:'/lezioni/informatica',label:'Informatica',description:'Programmazione, sistemi e reti'},
 {href:'/esami',label:'Università',description:'Programmi e lezioni per gli esami'},
 {href:'/maturita',label:'Maturità',description:'Ripasso e prove di esercitazione'},
 {href:'/percorsi',label:'Programmi di ripasso',description:'Argomenti da consultare'},
];
const pages=new Set(['/', '/catalogo','/prezzi','/metodo','/francesco','/lodi','/domande','/privacy','/piattaforma','/percorsi','/esami','/maturita','/contatti','/incontro','/invita','/acquista']);
export function isPublicPage(path:string){return pages.has(path)||path.startsWith('/esami/')||path.startsWith('/lezioni/');}
export function activePublicNavigation(path:string){if(['/esami','/maturita','/percorsi'].includes(path)||path.startsWith('/esami/')||path.startsWith('/lezioni/'))return '/catalogo';if(path==='/acquista')return '/prezzi';if(path==='/piattaforma')return '/metodo';return path;}
