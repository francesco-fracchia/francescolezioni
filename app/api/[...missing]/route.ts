import {NextResponse} from 'next/server';

function missing() {
  return NextResponse.json({error:'Indirizzo API non trovato.'}, {status:404,headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}});
}
export {missing as GET, missing as HEAD, missing as POST, missing as PUT, missing as PATCH, missing as DELETE, missing as OPTIONS};
