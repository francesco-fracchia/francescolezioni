import type {StudentView} from '@/app/studente/home';
const views:Record<StudentView,string>={home:'inizio',homework:'compiti',study:'piano',courses:'corsi',lessons:'lezioni',packages:'pacchetti',referrals:'inviti'};
export function studentLocation(search:string){
 const params=new URLSearchParams(search),alias=params.get('vista');
 return {view:(Object.entries(views).find(([,value])=>value===alias)?.[0]||(alias==='materiali'?'courses':'home')) as StudentView,student:params.get('studente')||params.get('anteprima')||''};
}
export function studentAddress(search:string,view:StudentView,student:string){
 const params=new URLSearchParams(search);params.set('vista',views[view]);
 if(student)params.set('studente',student);else params.delete('studente');
 if(params.has('anteprima')&&student)params.set('anteprima',student);
 return '/studente?'+params;
}
// Own same-document entries have an index so a cancelled Back/Forward restores
// the original entry, rather than pushing another one and destroying Forward.
export function sectionHistory(port:{href:()=>string;state:()=>Record<string,unknown>|null;replace:(state:object,url:string)=>void;push:(state:object,url:string)=>void;go:(delta:number)=>void},needsConfirmation:()=>boolean,confirm:()=>Promise<boolean>,apply:(url:string)=>void){
 const key='ffStudentSection';
 const prior=port.state()?.[key] as {index?:number}|undefined;
 let current={url:port.href(),index:Number.isInteger(prior?.index)?prior!.index!:0},restoring:false|{target:{url:string;index:number};asked:boolean}=false,allow=false,disposed=false;
 function record(index:number){return {...port.state(),[key]:{index}};}
 function replace(url:string){current={...current,url};port.replace(record(current.index),url);}
 replace(current.url);
 return {
  replace,
  push(url:string){if(restoring||disposed||url===current.url)return;current={url,index:current.index+1};port.push(record(current.index),url);},
  pop(){
   if(disposed)return;
   const value=port.state()?.[key] as {index?:number}|undefined;
   if(!Number.isInteger(value?.index))return;
   const target={url:port.href(),index:value!.index!};
   if(restoring){
    if(target.index!==current.index){port.go(current.index-target.index);return;}
    if(restoring.asked)return;restoring.asked=true;
    const intended=restoring.target;
    void confirm().then(leave=>{if(disposed)return;restoring=false;if(leave){allow=true;port.go(intended.index-current.index);}});
    return;
   }
   if(target.index===current.index)return;
   if(!allow&&needsConfirmation()){restoring={target,asked:false};port.go(current.index-target.index);return;}
   allow=false;current=target;apply(target.url);
  },
  get pending(){return !!restoring;},
  dispose(){disposed=true;},
 };
}
