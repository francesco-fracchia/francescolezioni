/** Public, value-free messages: never serialize Zod inputs or database exceptions. */
export function fieldKey(path){
 const parts=path.filter(part=>part!=='details');
 if(parts[0]==='participants'&&Number.isInteger(parts[1]))return (parts[2]==='level'?'participantLevel':parts[2]==='email'?'participantEmail':'participant')+(parts[1]+1);
 return parts.join('.');
}
export function issueFieldErrors(issues){
 const result={};
 for(const issue of issues){
  if(issue.code==='invalid_union'&&issue.errors){for(const errors of issue.errors)Object.assign(result,issueFieldErrors(errors));continue;}
  const key=fieldKey(issue.path||[]);if(!key||result[key])continue;
  const type=issue.origin||issue.type;
  result[key]=key==='consent'?'Conferma di aver letto l’informativa privacy.':issue.code==='too_small'?(type==='number'?`Inserisci un valore non inferiore a ${issue.minimum}.`:type==='array'?`Seleziona almeno ${issue.minimum} elementi.`:`Scrivi almeno ${issue.minimum} caratteri.`):issue.code==='too_big'?(type==='number'?`Inserisci un valore non superiore a ${issue.maximum}.`:type==='array'?`Seleziona al massimo ${issue.maximum} elementi.`:`Usa al massimo ${issue.maximum} caratteri.`):(issue.format||issue.validation)==='email'?'Inserisci un indirizzo email valido.':issue.code==='invalid_type'?'Completa questo campo.':'Controlla questo valore.';
 }
 return result;
}
export function validationBody(error){return {error:'Controlla i campi indicati. I dati compilati sono ancora nel modulo.',fieldErrors:issueFieldErrors(error.issues)};}
export function safeFormMessage(error,fallback='Non ho ricevuto la conferma. Controlla la connessione e riprova: i dati restano nel modulo.'){
 const message=typeof error==='string'?error:error instanceof Error?error.message:'';
 if(!message||message.length>1000||/failed to fetch|fetch failed|load failed|networkerror|network request|unexpected token|unexpected end|json|sqlite|constraint|libsql|prisma|turso|econn|enotfound|typeerror|syntaxerror|\bat [\w.]+\s*\(/i.test(message))return fallback;
 return message;
}
