export type ReadTicket={signal:AbortSignal;isCurrent:()=>boolean};

// Invalidate before aborting: correctness also holds when a transport finishes
// an old response despite cancellation, including stale errors and callbacks.
export function createLatestRead(){
 let sequence=0,controller:AbortController|null=null;
 return {
  start():ReadTicket{
   const current=++sequence;
   controller?.abort();
   const request=new AbortController();controller=request;
   return {signal:request.signal,isCurrent:()=>sequence===current&&!request.signal.aborted};
  },
  cancel(){sequence++;controller?.abort();controller=null;},
 };
}
