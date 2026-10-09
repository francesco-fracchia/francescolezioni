import {bookingDb} from '@/lib/booking/runtime';
import {isRequestOwner} from '@/lib/request-admin';
import {failure,LearningError,privateHeaders,sameOrigin} from '@/lib/learning/access';
import {countQuery,exportQuery,exportTables,exportExclusions} from '@/lib/management/export';
export async function GET(){try{
 if(!await isRequestOwner())throw new LearningError('Accesso riservato al tutor.',403);
 const counts=await bookingDb().prepare(countQuery).first<Record<string,number>>();
 if(!counts)throw new Error('Export count unavailable');
 return Response.json({counts:Object.entries(counts).map(([name,count])=>({name,count})),exclusions:exportExclusions},{headers:privateHeaders});
}catch(e){return failure(e);}}
export async function POST(request:Request){try{
 if(!await isRequestOwner())throw new LearningError('Accesso riservato al tutor.',403);sameOrigin(request);
 const result=await bookingDb().prepare(exportQuery).all<{name:keyof typeof exportTables;count:number;bytes:number;data:string|null}>();
 if(result.results.some(row=>row.data===null))throw new LearningError('I dati superano il limite per una copia scaricabile. Nessun file parziale è stato preparato: serve un’esportazione tecnica del database.',413);
 const tables:Record<string,Record<string,unknown>[]>=Object.fromEntries(Object.keys(exportTables).map(name=>[name,[]]));
 for(const row of result.results)tables[row.name]=JSON.parse(row.data!);
 const createdAt=new Date().toISOString(),fileTables=['course_materials','homework_assignments','homework_submissions'];
 const attachments=fileTables.flatMap(table=>tables[table].filter(row=>row.object_key).map(row=>({table,id:row.id,objectKey:row.object_key,filename:row.filename,mime:row.mime,size:row.size})));
 return Response.json({format:'ff-management-export',version:1,createdAt,exclusions:exportExclusions,counts:Object.fromEntries(Object.entries(tables).map(([name,rows])=>[name,rows.length])),attachments,tables},{headers:{...privateHeaders,'Content-Disposition':`attachment; filename="francesco-fracchia-dati-${createdAt.slice(0,10)}.json"`,'X-Content-Type-Options':'nosniff'}});
}catch(e){return failure(e);}}
