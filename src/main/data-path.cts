import path from 'node:path';

// Leave Electron's writable per-user default intact on macOS/Linux.
// The existing Windows portable folder and explicit QA profile override are preserved.
export function customProfilePath(platform:string,packaged:boolean,requested:string|undefined,executable:string):string|undefined{
 if(requested)return path.resolve(requested);
 if(packaged&&platform==='win32')return path.win32.join(path.win32.dirname(executable),'data');
 return undefined;
}
