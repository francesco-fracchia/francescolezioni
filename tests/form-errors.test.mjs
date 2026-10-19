import test from 'node:test';
import assert from 'node:assert/strict';
import {z} from 'zod';
import {fieldKey,issueFieldErrors,validationBody,safeFormMessage} from '../lib/form-errors.mjs';

test('validation errors identify nested request fields without serializing input',()=>{
 const parsed=z.object({name:z.string().min(2),email:z.string().email(),consent:z.literal(true),details:z.object({program:z.string().min(2),participants:z.array(z.object({name:z.string().min(2),level:z.string().max(5)}))})}).safeParse({name:'A',email:'PRIVATE-DATA',consent:false,details:{program:'',participants:[{name:'B',level:'PRIVATE-DETAILS'}]}});
 assert.equal(parsed.success,false);
 const body=validationBody(parsed.error);
 assert.equal(body.fieldErrors.email,'Inserisci un indirizzo email valido.');
 assert.equal(body.fieldErrors.program,'Scrivi almeno 2 caratteri.');
 assert.equal(body.fieldErrors.participant1,'Scrivi almeno 2 caratteri.');
 assert.equal(body.fieldErrors.participantLevel1,'Usa al massimo 5 caratteri.');
 assert.match(body.fieldErrors.consent,/informativa privacy/);
 assert.doesNotMatch(JSON.stringify(body),/PRIVATE|Zod|invalid_string/);
});
test('field keys distinguish names, preparation and email of participants',()=>{
 assert.equal(fieldKey(['details','participants',1,'name']),'participant2');
 assert.equal(fieldKey(['participants',2,'email']),'participantEmail3');
 assert.equal(fieldKey(['details','goal']),'goal');
});
test('numeric and collection limits have appropriate instructions',()=>{
 assert.equal(issueFieldErrors(z.number().min(2).safeParse(1).error.issues)[''],undefined);
 const result=z.object({position:z.number().min(0),recipients:z.array(z.string()).min(2)}).safeParse({position:-1,recipients:[]});
 assert.equal(issueFieldErrors(result.error.issues).position,'Inserisci un valore non inferiore a 0.');
 assert.equal(issueFieldErrors(result.error.issues).recipients,'Seleziona almeno 2 elementi.');
});
test('technical errors become recovery instructions; actionable messages remain',()=>{
 for(const text of ['Failed to fetch','Load failed','Unexpected token < in JSON','SQLITE_CONSTRAINT users.email','libsql error with secret'])assert.match(safeFormMessage(new Error(text)),/connessione.*dati restano/);
 assert.equal(safeFormMessage(new Error('Questo orario non è più disponibile. Scegline un altro.')),'Questo orario non è più disponibile. Scegline un altro.');
});
