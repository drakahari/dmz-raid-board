import {_electron as electron} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises';
import path from 'node:path';
import {themes,contrast,themeKey} from '../dist/renderer/themes.mjs';
const expectedVersion=JSON.parse(await readFile('package.json','utf8')).version;
const root=process.cwd(),qa=path.join(root,'.qa');await mkdir(qa,{recursive:true});
const profile=await mkdtemp(path.join(qa,'settings-'));const extraction=process.argv[2];const packaged=!!extraction;
const screenshots=path.join(qa,packaged?'settings-packaged':'settings-source');await mkdir(screenshots,{recursive:true});
let app,page;const checks=[];const pass=name=>{checks.push(name);console.log('PASS: '+name);};
async function launch(){app=await electron.launch(packaged?{executablePath:path.join(extraction,'DMZ Raid Board.exe'),args:['--profile-dir',profile],cwd:extraction}:{args:['.','--profile-dir',profile],cwd:root});page=await app.firstWindow();await page.locator('#items .item').first().waitFor();}
async function open(){await page.locator('#settingsBtn').click();await page.locator('#settings').waitFor();}
const state=()=>page.evaluate(()=>localStorage.getItem('dmz-raid-board-state-v1'));
async function chooseFile(file){const chooserPromise=page.waitForEvent('filechooser');await page.locator('#settingsImport').click();const chooser=await chooserPromise;await chooser.setFiles(file);}
const hex=rgb=>'#'+rgb.match(/[\d.]+/g).slice(0,3).map(v=>Math.round(Number(v)).toString(16).padStart(2,'0')).join('');
async function colorCheck(selectors,minimum=4.5){
 for(const selector of selectors){const colors=await page.locator(selector).first().evaluate(el=>{const color=getComputedStyle(el).color;let current=el;let bg='';while(current){const value=getComputedStyle(current).backgroundColor;if(value!=='rgba(0, 0, 0, 0)'){bg=value;break;}current=current.parentElement;}return {color,bg};});assert(contrast(hex(colors.color),hex(colors.bg))>=minimum-.01,selector+' contrast '+JSON.stringify(colors));}
}
try{
 await launch();assert.equal(await app.evaluate(({app})=>app.getVersion()),expectedVersion);
 assert.equal(await page.locator('html').getAttribute('data-theme'),'original');
 const box=await page.locator('#settingsBtn').boundingBox();assert(box.y<100);await page.locator('#settingsBtn').focus();await page.keyboard.press('Enter');
 assert.equal(await page.locator('#settings').getAttribute('open'),'');assert(await page.locator('#themePicker').evaluate(el=>el===document.activeElement));
 for(let n=0;n<10;n++){await page.keyboard.press('Tab');assert(await page.locator('#settings').evaluate(el=>el.contains(document.activeElement)));}
 await page.keyboard.press('Shift+Tab');assert(await page.locator('#settings').evaluate(el=>el.contains(document.activeElement)));
 await page.keyboard.press('Escape');assert.equal(await page.locator('#settings').isVisible(),false);assert(await page.locator('#settingsBtn').evaluate(el=>el===document.activeElement));
 await open();await page.locator('#closeSettings').click();assert(await page.locator('#settingsBtn').evaluate(el=>el===document.activeElement));
 pass('visible header Settings, keyboard open, modal Tab/Shift-Tab, Escape/Close and focus return');
 await page.getByLabel('CPU target',{exact:true}).fill('7');await page.getByLabel('CPU target',{exact:true}).press('Tab');
 await page.locator('#raidTab').click();await page.getByRole('button',{name:'Collect one CPU',exact:true}).click();await page.locator('#planTab').click();
 const originalState=await state();
 await open();assert.equal(await page.locator('#appVersion').innerText(),'DMZ Raid Board '+expectedVersion);assert.equal(await page.locator('#themePicker option').count(),27);
 const paletteIds=packaged?['original','purple-gold','light','omarchy-catppuccin-latte','omarchy-nord']:themes.map(t=>t.id);
 const photos=new Set(['original','light','purple-gold','maroon-gold','ethereal','omarchy-catppuccin-latte','omarchy-nord','omarchy-rose-pine','omarchy-miasma']);
 for(const id of paletteIds){
  if(!await page.locator('#settings').isVisible())await open();await page.locator('#themePicker').selectOption(id);
  assert.equal(await page.locator('html').getAttribute('data-theme'),id);assert.equal(await state(),originalState);
  await colorCheck(['#settings h2','#settings label','#themeDescription','#themePicker','#settingsBackup','#settingsImport']);
  if(photos.has(id))await page.locator('#settings').screenshot({path:path.join(screenshots,id+'-settings.png')});
  await page.locator('#closeSettings').click();
  await colorCheck(['#items h3','.for','.target input','.required','.upgrade.on h3','.primary','.settingsButton']);
  if(photos.has(id))await page.screenshot({path:path.join(screenshots,id+'-plan.png'),fullPage:true});
  await page.locator('#browse summary').first().click();await page.locator('#category').selectOption('All');await page.locator('#search').fill('MIA Recovery Discount II');await colorCheck(['.catalogEntry h3','.catalogEntry p','.catalogControl button']);
  await page.locator('#search').fill('Radiation');await colorCheck(['.unconfirmed']);assert.equal(await page.locator('.catalogEntry button').count(),0);await page.locator('#search').fill('');await page.locator('#browse summary').first().click();
  await page.locator('#raidTab').click();await colorCheck(['.count','.count span','.controls .add','.controls button','#progressText']);
  assert.match(await page.locator('[data-card="CPU"]').innerText(),/1 picked up \/ 7 target/);await page.getByRole('button',{name:'Complete Power Regulator',exact:true}).click();await colorCheck(['.item.done h3','.done .complete']);await page.getByRole('button',{name:'Uncheck Power Regulator',exact:true}).click();await page.locator('#planTab').click();
 }
 pass(paletteIds.length+' themes: Settings, plan, catalog and raid views have sampled readable computed colors; board data unchanged');
 await open();await page.locator('#themePicker').selectOption('purple-gold');
 const backup=path.join(profile,'settings-export.json');await app.evaluate(({session},file)=>{globalThis.settingsDownload=new Promise(resolve=>session.defaultSession.once('will-download',(_event,item)=>{item.setSavePath(file);item.once('done',(_event,state)=>resolve(state));}));return true;},backup);
 await page.locator('#settingsBackup').click();assert.equal(await app.evaluate(async()=>await globalThis.settingsDownload),'completed');assert.deepEqual(JSON.parse(await readFile(backup,'utf8')),JSON.parse(originalState));
 const corrupt=path.join(profile,'corrupt.json');await writeFile(corrupt,'{bad');await chooseFile(corrupt);await page.locator('#settingsMessage').getByText(/not valid JSON/).waitFor();assert.equal(await state(),originalState);assert.equal(await page.locator('#confirmDialog').isVisible(),false);
 await page.locator('#closeSettings').click();await page.getByLabel('CPU target',{exact:true}).fill('9');await page.getByLabel('CPU target',{exact:true}).press('Tab');
 const edited=await state();await open();await chooseFile(backup);await page.locator('#cancelAction').click();assert.equal(await state(),edited);assert(await page.locator('#settings').isVisible());assert(await page.locator('#settingsImport').evaluate(el=>el===document.activeElement));
 await chooseFile(backup);await page.locator('#confirmAction').click();await page.locator('#settings').waitFor({state:'hidden'});assert.equal(await state(),originalState);assert.equal(await page.locator('html').getAttribute('data-theme'),'purple-gold');assert(await page.locator('#settingsBtn').evaluate(el=>el===document.activeElement));
 pass('Settings native export/file chooser, corrupt backup rejection, import cancel/confirm and unchanged v1 backup format');
 await app.close();await launch();assert.equal(await page.locator('html').getAttribute('data-theme'),'purple-gold');assert.equal(await state(),originalState);pass('actual process close/relaunch preserves theme separately from all board data');
 await page.evaluate(key=>localStorage.setItem(key,'<invalid-theme>'),themeKey);await page.reload();await page.locator('#items .item').first().waitFor();assert.equal(await page.locator('html').getAttribute('data-theme'),'original');assert.equal(await state(),originalState);pass('invalid saved theme safely falls back to original without changing board data');
 await app.evaluate(({BrowserWindow})=>{const window=BrowserWindow.getAllWindows()[0];window.setSize(800,650);window.webContents.setZoomFactor(1.25);});await page.waitForFunction(()=>innerWidth<800);
 await open();await page.locator('#themePicker').selectOption('omarchy-catppuccin-latte');await page.keyboard.press('Tab');assert(await page.locator('#settings').evaluate(el=>el.contains(document.activeElement)));
 const size=await page.locator('#settings').evaluate(el=>({scroll:el.scrollWidth,width:el.clientWidth,right:el.getBoundingClientRect().right,viewport:innerWidth}));assert(size.scroll<=size.width+1&&size.right<=size.viewport);await page.screenshot({path:path.join(screenshots,'small-window-light-settings.png'),fullPage:true});
 pass('Settings usable by keyboard at 800x650 and 125% app zoom without horizontal overflow');
 const result={date:new Date().toISOString(),version:expectedVersion,packaged,profile,themesChecked:paletteIds.length,checks,result:'PASS'};await writeFile(path.join(qa,packaged?'settings-packaged-results.json':'settings-source-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{if(app)await app.close();}
