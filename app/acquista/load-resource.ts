class ResourceLoadError extends Error {}

// Bound reads only: a retry must never create another checkout or reservation.
export async function loadPurchaseResource<T>(url:string,signal:AbortSignal,message:string,timeoutMs=15000):Promise<T>{
 const request=new AbortController();
 const cancel=()=>request.abort();
 signal.addEventListener('abort',cancel,{once:true});
 if(signal.aborted)cancel();
 const timeout=setTimeout(cancel,timeoutMs);
 try{
  const response=await fetch(url,{cache:'no-store',signal:request.signal});
  const data=await response.json();
  if(!response.ok)throw new ResourceLoadError(typeof data?.error==='string'?data.error:message);
  return data as T;
 }catch(error){
  if(signal.aborted||error instanceof ResourceLoadError)throw error;
  throw new ResourceLoadError(message);
 }finally{
  clearTimeout(timeout);
  signal.removeEventListener('abort',cancel);
 }
}
