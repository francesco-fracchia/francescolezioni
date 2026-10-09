import { env } from '@/lib/runtime-env';
import { LearningError,privateHeaders } from './access';
type StoredMaterial={object_key:string|null;filename:string|null;mime:string|null;kind:string};
export async function serveMaterialFile(request:Request,material:StoredMaterial){
  if(!material.object_key)throw new LearningError('File non disponibile.',404);
  if(!env.BUCKET)throw new LearningError('Archivio temporaneamente non disponibile.',503);
  let object;
  try { object=await env.BUCKET.get(material.object_key,{range:request.headers}); }
  catch(error) {
    const rangeError=error as {code?:string;size?:number};
    if(rangeError.code==='RANGE_NOT_SATISFIABLE'&&Number.isSafeInteger(rangeError.size))return new Response(null,{status:416,headers:{...privateHeaders,'Content-Range':`bytes */${rangeError.size}`,'Accept-Ranges':'bytes'}});
    throw error;
  }
  if(!object)throw new LearningError('File temporaneamente non disponibile.',404);
  const headers=new Headers({...privateHeaders,'Content-Type':material.mime||'application/octet-stream',
    'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",'Accept-Ranges':'bytes'});
  const name=(material.filename||'materiale').replace(/[\r\n"\\]/g,'_');
  headers.set('Content-Disposition',`${material.kind==='video'?'inline':'attachment'}; filename*=UTF-8''${encodeURIComponent(name)}`);
  headers.set('ETag',object.httpEtag);
  if(request.headers.has('range')&&object.range&&'offset' in object.range&&'length' in object.range){
    const {offset=0,length=object.size}=object.range;
    headers.set('Content-Range',`bytes ${offset}-${offset+length-1}/${object.size}`);headers.set('Content-Length',String(length));
    return new Response(object.body,{status:206,headers});
  }
  headers.set('Content-Length',String(object.size));return new Response(object.body,{headers});
}
