import { z } from 'zod';
import { isRequestOwner } from '@/lib/request-admin';
import { bookingDb } from '@/lib/booking/runtime';
import { failure,LearningError } from '@/lib/learning/access';
import { serveMaterialFile } from '@/lib/learning/files';
export async function GET(request:Request){
  if(!await isRequestOwner())return new Response(null,{status:403});
  try{
    const id=z.string().uuid().safeParse(new URL(request.url).searchParams.get('materiale'));
    if(!id.success)throw new LearningError('Materiale non valido.');
    const material=await bookingDb().prepare('SELECT object_key,filename,mime,kind FROM course_materials WHERE id=?').bind(id.data)
      .first<{object_key:string|null;filename:string|null;mime:string|null;kind:string}>();
    if(!material)throw new LearningError('Materiale non disponibile.',404);
    return await serveMaterialFile(request,material);
  }catch(error){return failure(error);}
}
