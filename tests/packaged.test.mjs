import {_electron as electron} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd(),qa=path.join(root,'.qa');await mkdir(qa,{recursive:true});
const extraction=process.argv[2];if(!extraction)throw new Error('Pass the verified ZIP extraction directory.');
const exe=path.join(extraction,'DMZ Raid Board.exe');
const profile=await mkdtemp(path.join(qa,'packaged-'));let app;
try {
 app=await electron.launch({executablePath:exe,args:['--profile-dir',profile],cwd:extraction,timeout:60000});
 const page=await app.firstWindow();await page.locator('[data-card="CPU"]').waitFor();
 const info=await app.evaluate(({app})=>({name:app.getName(),version:app.getVersion(),profile:app.getPath('userData'),packaged:app.isPackaged}));
 assert.equal(info.version,'0.1.0');assert.equal(info.packaged,true);assert.equal(info.profile,profile);
 assert.equal(await page.locator('.item').count(),5);assert.equal(await page.getByLabel('Power Regulator target',{exact:true}).inputValue(),'10');
 assert(await page.locator('img').evaluateAll(imgs=>imgs.length===5&&imgs.every(i=>i.complete&&i.naturalWidth===128)));
 await page.getByRole('button',{name:'Open raid checklist →',exact:true}).click();await page.getByRole('button',{name:'Collect one CPU',exact:true}).click();assert.match(await page.locator('[data-card="CPU"]').innerText(),/1 picked up/);
 const opened=await page.evaluate(()=>window.open('https://example.com'));assert.equal(opened,null);assert.equal(app.windows().length,1);
 const remote=await page.evaluate(async()=>{try{await fetch('https://example.com');return 'allowed';}catch{return 'blocked';}});assert.equal(remote,'blocked');
 await app.close();app=await electron.launch({executablePath:exe,args:['--profile-dir',profile],cwd:extraction,timeout:60000});const reopened=await app.firstWindow();await reopened.locator('[data-card="CPU"]').waitFor();assert.match(await reopened.locator('[data-card="CPU"]').innerText(),/1 picked up/);
 const result={date:new Date().toISOString(),exe,profile,info,checks:['archive-extracted packaged launch','five bundled PNGs','approved sample shared totals','native packaged pickup flow','remote fetch and popup denied','packaged close/relaunch persistence'],result:'PASS'};
 await writeFile(path.join(qa,'packaged-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{if(app)await app.close();}
