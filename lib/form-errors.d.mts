export type ValidationIssue={path?:PropertyKey[];code:string;minimum?:number|bigint;maximum?:number|bigint;origin?:string;type?:string;validation?:unknown;format?:string;errors?:ValidationIssue[][]};
export function fieldKey(path:PropertyKey[]):string;
export function issueFieldErrors(issues:ValidationIssue[]):Record<string,string>;
export function validationBody(error:{issues:ValidationIssue[]}):{error:string;fieldErrors:Record<string,string>};
export function safeFormMessage(error:unknown,fallback?:string):string;
