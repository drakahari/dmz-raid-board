import {sampleState,serialize} from '../dist/renderer/core.mjs';
import {_electron as electron} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd(),qa=path.join(root,'.qa');await mkdir(qa,{recursive:true});
const extraction=process.argv[2];if(!extraction)throw new Error('Pass the verified ZIP extraction directory.');
const exe=path.join(extraction,'DMZ Raid Board.exe');
const profile=await mkdtemp(path.join(qa,'packaged-'));let app;
try {
 app=await electron.launch({executablePath:exe,args:['--profile-dir',profile],cwd:extraction,timeout:60000});
 const page=await app.firstWindow();await page.locator('#settingsBtn').waitFor();await page.evaluate(raw=>localStorage.setItem('dmz-raid-board-state-v2',raw),serialize(sampleState()));await page.reload();await page.locator('[data-card="CPU"]').waitFor();
 const info=await app.evaluate(({app})=>({name:app.getName(),version:app.getVersion(),profile:app.getPath('userData'),packaged:app.isPackaged}));
 assert.equal(info.version,JSON.parse(await readFile('package.json','utf8')).version);assert.equal(info.packaged,true);assert.equal(info.profile,profile);
 assert.equal(await page.locator('.item').count(),5);assert.equal(await page.getByLabel('Power Regulator target',{exact:true}).inputValue(),'10');
 assert(await page.locator('#items img').evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth>0)));

 for(const name of ['Comms Module','High-Tenacity Fibers']){await page.locator('#directItem').selectOption(name);await page.locator('#directCount').fill('2');await page.getByRole('button',{name:'Add extra',exact:true}).click();const image=page.locator(`[data-card="${name}"] img`);if(await image.count())assert(await image.evaluate(img=>img.complete&&img.naturalWidth>0));else assert.match(await page.locator(`[data-card="${name}"]`).innerText(),/No verified image yet/);}
 const names=await page.locator('#items h3').allTextContents();const order=new Intl.Collator(undefined,{numeric:true,sensitivity:'base'});assert.deepEqual(names,[...names].sort((a,b)=>order.compare(a,b)||(a<b?-1:a>b?1:0)));
 await page.getByRole('button',{name:'Open raid checklist →',exact:true}).click();await page.getByRole('button',{name:'Collect one CPU',exact:true}).click();assert.match(await page.locator('[data-card="CPU"]').innerText(),/1 picked up/);
 const opened=await page.evaluate(()=>window.open('https://example.com'));assert.equal(opened,null);assert.equal(app.windows().length,1);
 const remote=await page.evaluate(async()=>{try{await fetch('https://example.com');return 'allowed';}catch{return 'blocked';}});assert.equal(remote,'blocked');
 await app.close();app=await electron.launch({executablePath:exe,args:['--profile-dir',profile],cwd:extraction,timeout:60000});const reopened=await app.firstWindow();await reopened.locator('[data-card="CPU"]').waitFor();assert.match(await reopened.locator('[data-card="CPU"]').innerText(),/1 picked up/);
 const result={date:new Date().toISOString(),exe,profile,info,checks:['archive-extracted packaged launch','five original PNGs plus Comms Module and Fibers images','approved sample shared totals','A–Z packaged shopping-list ordering','packaged renderer pickup flow','remote fetch and popup denied','packaged close/relaunch persistence'],result:'PASS'};
 await writeFile(path.join(qa,'packaged-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{if(app)await app.close();}
