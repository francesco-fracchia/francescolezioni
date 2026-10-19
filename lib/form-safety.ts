export type SafetyEntry<S>={scope:S;dirty:()=>boolean;saving:()=>boolean};
export function createSafetyRegistry<S>(){
 const entries=new Set<SafetyEntry<S>>(),listeners=new Set<()=>void>();
 const notify=()=>listeners.forEach(listener=>listener());
 return {
  register(entry:SafetyEntry<S>){entries.add(entry);notify();return()=>{entries.delete(entry);notify();};},
  state(include:(entry:SafetyEntry<S>)=>boolean=()=>true){const selected=[...entries].filter(include);return {saving:selected.some(e=>e.saving()),dirty:selected.some(e=>e.dirty())};},
  subscribe(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener);};},
  notify,
 };
}

// In-memory only: never write student work or selected files to web storage.
export function createTextDrafts<T>(ttl=30*60*1000,now=()=>Date.now()){
 const drafts=new Map<string,{value:T;expires:number}>();
 return {
  read(key:string){const draft=drafts.get(key);if(!draft)return null;if(draft.expires<=now()){drafts.delete(key);return null;}return draft.value;},
  write(key:string,value:T){for(const [id,draft] of drafts)if(draft.expires<=now())drafts.delete(id);drafts.set(key,{value,expires:now()+ttl});},
  remove(key:string){drafts.delete(key);},
  clear(){drafts.clear();},
 };
}
