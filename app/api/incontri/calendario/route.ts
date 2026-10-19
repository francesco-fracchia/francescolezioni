import {bookingDb} from '@/lib/booking/runtime';
import {consultationReceipt,type ConfirmedConsultation} from '@/lib/consultation-receipt.mjs';
const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer'};
function failure(request:Request,error:string,status:number) {
  if(request.headers.get('accept')?.includes('text/html')) {
    const destination=new URL('/indisponibile',request.url);destination.searchParams.set('da','/incontro');
    return new Response(null,{status:303,headers:{...headers,Location:destination.href}});
  }
  return Response.json({error},{status,headers});
}
export async function POST(request:Request) {
  if(request.headers.get('origin')!==new URL(request.url).origin)return failure(request,'Origine non consentita.',403);
  try {
    const body=await request.text();
    if(body.length>300)return failure(request,'Dati non validi.',400);
    const params=new URLSearchParams(body),id=params.get('id')||'',token=params.get('token')||'';
    if(params.getAll('id').length!==1||params.getAll('token').length!==1||!/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id)||!/^([\da-f]{64})$/.test(token))return failure(request,'Collegamento non valido.',400);
    // A proof of this booking payload scopes the export to the confirmed
    // receipt. It grants no account access and is sent in POST, never in a URL.
    const appointment=await bookingDb().prepare("SELECT id,starts_at,ends_at,mode,status FROM consultations WHERE id=? AND payload_hash=? AND status='confirmed'").bind(id,token).first<ConfirmedConsultation>();
    if(!appointment)return failure(request,'Incontro non disponibile. Contatta Francesco per verificarlo.',404);
    return new Response(consultationReceipt(appointment).calendar,{headers:{...headers,'Content-Type':'text/calendar; charset=utf-8','Content-Disposition':'attachment; filename="incontro-francesco.ics"'}});
  } catch {return failure(request,'Non riesco a preparare il calendario. Conserva il riepilogo o riprova.',503);}
}
