const natural = new Intl.Collator(undefined,{sensitivity:'base',numeric:true});
export function compareNames(a:string,b:string):number {
 return natural.compare(a,b)||(a<b?-1:a>b?1:0);
}
export function sortedNames(names:readonly string[]):string[] { return [...names].sort(compareNames); }
