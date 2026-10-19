'use client';
import {useRef,useState} from 'react';
import NativeDialog from './native-dialog';
import {safeFormMessage} from '@/components/forms/form-feedback';
type Confirmation={title:string;description:string;confirmLabel:string;run:()=>Promise<void>};
export function useConfirmAction(){
 const [pending,setPending]=useState<Confirmation|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const running=useRef(false);
 async function confirm(){
  if(!pending||running.current)return;
  running.current=true;setBusy(true);setError('');
  try{await pending.run();setPending(null);}catch(e){setError(safeFormMessage(e));}
  finally{running.current=false;setBusy(false);}
 }
 return {request(action:Confirmation){if(running.current)return;setError('');setPending(action);},dialog:pending?<NativeDialog title={pending.title} busy={busy} onClose={()=>setPending(null)} className="action-confirmation" headerClassName="action-confirmation-heading" closeClassName="agenda-icon"><div className="action-confirmation-body"><p>{pending.description}</p>{error&&<p className="error" role="alert">{error}</p>}{busy&&<p role="status">Operazione in corso…</p>}<div className="registry-actions"><button type="button" className="button outline" disabled={busy} onClick={()=>setPending(null)}>Annulla</button><button type="button" className="button dark" disabled={busy} onClick={()=>void confirm()}>{pending.confirmLabel}</button></div></div></NativeDialog>:null};
}
