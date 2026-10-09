import { authorizedMaterial,failure,LearningError,studentScope } from '@/lib/learning/access';
import { serveMaterialFile } from '@/lib/learning/files';
export async function GET(request:Request){try{
  const params=new URL(request.url).searchParams;const student=params.get('studente');const id=params.get('materiale');
  const scope=await studentScope(request);
  if(!student||!id||!scope.students.some(s=>s.id===student))throw new LearningError('Accesso non consentito.',403);
  const material=await authorizedMaterial(student,id);if(!material?.object_key)throw new LearningError('Materiale non disponibile.',404);
  return await serveMaterialFile(request,material);
}catch(e){return failure(e);}}
