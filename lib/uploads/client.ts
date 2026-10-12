'use client';
type Kind='material'|'task'|'submission';
// Capability discovery keeps Node/Workers uploads unchanged. Files on Vercel
// go directly to its private store, outside the 4.5 MB Function request limit.
export async function uploadForm(url:string,method:'PUT'|'POST',form:FormData,kind:Kind,target:string){
 const file=form.get('file');if(!(file instanceof File)||!file.size)return fetch(url,{method,body:form});
 const info=await fetch('/api/uploads',{method:'GET',cache:'no-store'});
 if(!info.ok)throw Error('Archivio temporaneamente non disponibile.');
 if(!(await info.json() as {direct:boolean}).direct)return fetch(url,{method,body:form});
 const issued=await fetch('/api/uploads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind,target,filename:file.name,mime:file.type,size:file.size})});
 const result=await issued.json() as {error?:string;uploadUrl:string;uploadProof:string};if(!issued.ok)throw Error(result.error||'Caricamento non disponibile.');
 const sent=await fetch(result.uploadUrl,{method:'PUT',headers:{'Content-Type':file.type},body:file});
 if(!sent.ok)throw Error('Caricamento non confermato. Riprova selezionando il file.');
 const body:Record<string,string>={uploadProof:result.uploadProof};for(const [key,value] of form)if(typeof value==='string')body[key]=value;
 return fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
}
