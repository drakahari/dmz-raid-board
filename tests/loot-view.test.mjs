import {_electron as electron} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import {emptyState,parseBackup,serialize} from '../dist/renderer/core.mjs';
const root=process.cwd(),qa=path.join(root,'.qa');await mkdir(qa,{recursive:true});
const profile=await mkdtemp(path.join(qa,'loot-view-'));const extraction=process.argv[2];
const version=JSON.parse(await readFile('package.json','utf8')).version;
let app;const checks=[];const pass=s=>{checks.push(s);console.log('PASS: '+s);};
const before={version:1,selected:{gunsmith:1,'bank-3':1},targets:{CPU:7,'DMZ Cash':2000},picked:{CPU:2,'DMZ Cash':100},completed:['DMZ Cash'],hideCompleted:true};
const backup=path.join(profile,'old-v1.json');await writeFile(backup,JSON.stringify(before));
try{
 app=await electron.launch(extraction?{executablePath:path.join(extraction,'DMZ Raid Board.exe'),args:['--profile-dir',profile],cwd:extraction}:{args:['.','--profile-dir',profile],cwd:root});
 let page=await app.firstWindow();await page.locator('#settingsBtn').waitFor();await page.evaluate(raw=>localStorage.setItem('dmz-raid-board-state-v2',raw),serialize(parseBackup(JSON.stringify(before))));await page.reload();await page.locator('[data-card="CPU"]').waitFor();
 await page.locator('#settingsBtn').click();assert.equal(await page.locator('#appVersion').innerText(),'DMZ Raid Board '+version);assert.equal(await app.evaluate(({app})=>app.getVersion()),version);pass('Settings version matches actual application metadata');
 await page.locator('#importFile').setInputFiles(backup);await page.locator('#confirmAction').click();await page.locator('#settings').waitFor({state:'hidden'});
 assert.deepEqual(parseBackup(await page.evaluate(()=>localStorage.getItem('dmz-raid-board-state-v2'))),parseBackup(JSON.stringify(before)));assert.equal(await page.getByLabel('CPU target',{exact:true}).inputValue(),'7');
 assert.equal(await page.locator('[data-card="DMZ Cash"]').count(),0);assert.equal(await page.locator('#cash').count(),0);assert.equal(await page.locator('#directItem option').filter({hasText:'DMZ Cash'}).count(),0);
 await page.locator('#browse summary').first().click();await page.locator('#category').selectOption('All');
 assert.equal(await page.locator('.catalogEntry').count(),120);assert.equal(await page.locator('.catalogEntry .unconfirmed').count(),7);
 assert.doesNotMatch(await page.locator('body').innerText(),/\$[\d,]+|\bcash\b|\bmoney\b|total selected-goal cost|5% off|recovery cost reduction/i);
 await page.locator('#browse summary').first().click();await page.locator('#sourcesBtn').click();assert.doesNotMatch(await page.locator('#sources').innerText(),/\bcash\b|\bmoney\b|spending|\$[\d,]+/i);await page.locator('#closeSources').click();
 await page.locator('#raidTab').click();assert.match(await page.locator('[data-card="CPU"]').innerText(),/2 picked up \/ 7 target/);assert.doesNotMatch(await page.locator('body').innerText(),/\bcash\b|\bmoney\b|\$[\d,]+/i);
 pass('legacy v1 values migrate safely; all catalog entries, plan, raid and About omit monetary UI; seven unresolved entries remain disabled');
 await app.close();app=await electron.launch(extraction?{executablePath:path.join(extraction,'DMZ Raid Board.exe'),args:['--profile-dir',profile],cwd:extraction}:{args:['.','--profile-dir',profile],cwd:root});page=await app.firstWindow();await page.locator('[data-card="CPU"]').waitFor();
 assert.deepEqual(parseBackup(await page.evaluate(()=>localStorage.getItem('dmz-raid-board-state-v2'))),parseBackup(JSON.stringify(before)));assert.match(await page.locator('[data-card="CPU"]').innerText(),/2 picked up \/ 7 target/);pass('real relaunch preserves legacy fields, item counts, selections and completion preference');
 await writeFile(path.join(qa,extraction?'loot-packaged-results.json':'loot-source-results.json'),JSON.stringify({version,result:'PASS',checks},null,2));
}finally{if(app)await app.close();}
