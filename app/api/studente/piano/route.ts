import { failure,LearningError,privateHeaders,studentScope } from '@/lib/learning/access';
import { studyData } from '@/lib/study/data';
export async function GET(request:Request){try{
 const scope=await studentScope(request),selected=new URL(request.url).searchParams.get('studente')||scope.students[0]?.id;
 if(!selected)return Response.json({plans:[],summaries:[],truncated:{plans:false,summaries:false}},{headers:privateHeaders});
 if(!scope.students.some(s=>s.id===selected))throw new LearningError('Accesso non consentito.',403);
 return Response.json(await studyData(selected,true),{headers:privateHeaders});
}catch(e){return failure(e);}}
