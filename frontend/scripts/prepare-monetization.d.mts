export function positiveText(value?:string):string;
export function classifyRecord(row:{id:string;title:string;prompt?:string;summary?:string;href?:string;kind?:string;useCases?:{slug:string}[];styles?:unknown[];subjects?:unknown[]}):{slug:string;fit:string;evidence:{field:string;quote:string;reason:string}}[];
