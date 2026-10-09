import { failure,LearningError,privateHeaders,studentScope } from '@/lib/learning/access';
import { packagesFor,usesFor } from '@/lib/packages/server';
export async function GET(request:Request){try{
 const scope=await studentScope(request),id=new URL(request.url).searchParams.get('studente')||scope.students[0]?.id;
 if(!id||!scope.students.some(s=>s.id===id))throw new LearningError('Accesso non consentito.',403);
 const [packages,uses]=await Promise.all([packagesFor(id),usesFor(id)]);
 return Response.json({packages:packages.slice(0,200),uses:uses.slice(0,200),truncated:packages.length>200||uses.length>200},{headers:privateHeaders});
 }catch(e){return failure(e);}}
