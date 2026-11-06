import {_electron as electron} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {sampleState} from '../dist/renderer/core.mjs';
import {catalogEntries} from '../dist/renderer/acquisition.mjs';
import {catalogArtwork} from '../dist/renderer/artwork-data.mjs';
import {installedImageFiles} from '../dist/renderer/asset-status.mjs';
const root=process.cwd(),qa=path.resolve('.qa');await mkdir(qa,{recursive:true});
const profile=await mkdtemp(path.join(qa,'season1-'));
const expectedVersion=JSON.parse(await readFile('package.json','utf8')).version;
const key='dmz-raid-board-state-v3',oldKey='dmz-raid-board-state-v2';
const checks=[],errors=[],remoteRequests=[];
const pass=name=>{checks.push(name);console.log('PASS: '+name);};
let app,page;
async function launch(){
 app=await electron.launch(process.env.DMZ_TEST_EXECUTABLE?{executablePath:process.env.DMZ_TEST_EXECUTABLE,args:['--profile-dir',profile],chromiumSandbox:true}:{args:['.','--profile-dir',profile],cwd:root,chromiumSandbox:true});
 page=await app.firstWindow();page.on('pageerror',error=>errors.push(error.message));
 page.on('request',request=>{if(!/^(file:|blob:|devtools:)/.test(request.url()))remoteRequests.push(request.url());});
 await page.locator('#libraryTab').waitFor();
 const info=await app.evaluate(({app})=>({version:app.getVersion(),packaged:app.isPackaged,profile:app.getPath('userData')}));
 assert.equal(info.version,expectedVersion);assert.equal(info.packaged,!!process.env.DMZ_TEST_EXECUTABLE);assert.equal(path.resolve(info.profile),profile);
}
const state=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
const card=id=>page.locator('[data-library-entry="'+id+'"]');
async function capture(name){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));const png=await app.evaluate(async({BrowserWindow})=>(await BrowserWindow.getAllWindows()[0].webContents.capturePage()).toPNG().toString('base64'));await writeFile(path.join(qa,name),Buffer.from(png,'base64'));}
async function find(name){await page.locator('#libraryTab').click();await page.locator('#librarySearch').fill(name);}
async function resetFilters(){for(const id of ['libraryCategory','libraryKind','librarySeason','libraryMethod','libraryProgress'])await page.locator('#'+id).selectOption('all');await page.locator('#libraryWanted').uncheck();await page.locator('#librarySearch').fill('');}
try{
 await launch();
 const fixture=sampleState();const legacy={version:2,selected:fixture.selected,adjustments:{CPU:-3},extras:{CPU:2},picked:{CPU:4},completed:['Detonators'],hideCompleted:true};const legacyRaw=JSON.stringify(legacy);
 await page.evaluate(({key,oldKey,raw})=>{localStorage.removeItem(key);localStorage.setItem(oldKey,raw);},{key,oldKey,raw:legacyRaw});
 await page.reload();await page.locator('[data-card="CPU"]').waitFor();
 assert.equal(await page.getByLabel('CPU target',{exact:true}).inputValue(),'9');
 const migrated=await state();assert.equal(migrated.version,3);assert.deepEqual(migrated.selected,legacy.selected);assert.deepEqual(migrated.picked,legacy.picked);assert.deepEqual(migrated.completed,legacy.completed);
 assert.equal(await page.evaluate(k=>localStorage.getItem(k),oldKey),legacyRaw);assert.deepEqual(migrated.blueprintProgress,{});assert.deepEqual(migrated.wanted,[]);assert(await page.locator('#migrationNotice').isVisible());
 pass('v2 migration retains original save, selections, adjustments, extras and raid progress');
 await find('Bandage');const bandage=card('printer:bandage');await bandage.waitFor();
 await bandage.locator('[data-blueprint-progress]').selectOption('found');await bandage.locator('[data-wanted]').click();assert.equal((await state()).selected.bandage,undefined);
 await bandage.locator('[data-catalog-quantity]').fill('2');await bandage.locator('[data-catalog-plan]').click();
 assert.equal((await state()).selected.bandage,2);assert.equal((await state()).acquisitionPlans['printer:bandage'],undefined);
 const bandageImage=bandage.locator('img');
 if(await bandageImage.count()){
  await bandageImage.evaluate(image=>image.decode());
  await bandageImage.evaluate(image=>{image.src='assets/qa-deliberately-missing.png';});
  await bandage.locator('.libraryArtFallback').waitFor({state:'visible'});
 }else assert.match(await bandage.locator('.libraryArtFallback').innerText(),/No verified image/);
 await page.locator('#planTab').click();assert.equal(await page.getByLabel('Chemicals target',{exact:true}).inputValue(),'30');assert.equal(await page.getByLabel('CPU target',{exact:true}).inputValue(),'9');
 await page.locator('#addUpgrades').click();await page.locator('#category').selectOption('Consumables');await page.locator('#search').fill('Bandage');assert.equal(await page.getByLabel('Bandage quantity',{exact:true}).inputValue(),'2');
 pass('library quantities share existing planner goals once; found and wanted do not craft automatically');
 await find('Han 86');const manual=card('manual-han-86');await manual.waitFor();
 await manual.locator('[data-blueprint-progress]').selectOption('found');assert(await manual.locator('[data-catalog-plan]').isDisabled());
 await manual.locator('[data-catalog-track-quantity]').fill('2');await manual.locator('[data-catalog-track]').click();assert.equal((await state()).extras['Manual: Han 86'],2);
 await page.locator('#raidTab').click();await page.getByRole('button',{name:'Collect one Manual: Han 86',exact:true}).click();assert.equal((await state()).picked['Manual: Han 86'],1);assert.equal((await state()).blueprintProgress['manual-han-86'],'found');
 await find('Han 86');await card('manual-han-86').locator('[data-blueprint-progress]').selectOption('unlocked');assert.equal((await state()).picked['Manual: Han 86'],1);
 pass('manual targets, picked counts and found/unlocked records stay separate; unknown Gunsmith costs cannot be planned');
 await resetFilters();await page.locator('#libraryKind').selectOption('weapon-manual');await page.locator('#librarySeason').selectOption('season-1');assert.equal(await page.locator('[data-library-entry]').count(),2);
 assert.match(await page.locator('#libraryList').innerText(),/Cronen Osprey/);assert.match(await page.locator('#libraryList').innerText(),/CSG-35/);
 await resetFilters();await page.locator('#libraryProgress').selectOption('unlocked');assert.equal(await page.locator('[data-library-entry]').count(),1);assert(await manual.isVisible());
 await resetFilters();await page.locator('#libraryWanted').check();assert.equal(await page.locator('[data-library-entry]').count(),1);assert(await bandage.isVisible());
 await resetFilters();await page.locator('#libraryMethod').selectOption('gunsmith');assert.match(await page.locator('#libraryStatus').innerText(),/\d/);
 await find('R-4 Bio-Compound');await page.locator('#libraryMethod').selectOption('all');const compound=card('item-r-4-bio-compound');await compound.waitFor();
 assert.equal(await compound.locator('[data-blueprint-progress]').count(),0);assert(await compound.locator('[data-catalog-plan]').isDisabled());assert.match(await compound.innerText(),/unknown|unconfirmed|unverified|not established/i);assert.equal(await compound.locator('img').count(),0);
 await compound.locator('[data-catalog-track]').click();assert.equal((await state()).extras['R-4 Bio-Compound'],1);
 await find('Detonators');assert.match(await card('printer:print-detonators').innerText(),/Sources disagree/);
 pass('combined filters, honest X01 placeholders, explicit loot targets and source conflict notice');
 await page.locator('#settingsBtn').click();await page.locator('#themePicker').selectOption('omarchy-catppuccin-latte');const before=await state();const backup=path.join(profile,'season-backup.json');
 await app.evaluate(({session},destination)=>{globalThis.qaDownload=new Promise(resolve=>session.defaultSession.once('will-download',(_event,item)=>{item.setSavePath(destination);item.once('done',(_e,result)=>resolve(result));}));return true;},backup);
 await page.locator('#settingsBackup').click();assert.equal(await app.evaluate(async()=>await globalThis.qaDownload),'completed');assert.deepEqual(JSON.parse(await readFile(backup,'utf8')),before);
 await page.locator('#settingsClear').click();await page.locator('#cancelAction').click();assert.deepEqual(await state(),before);await page.locator('#settingsClear').click();await page.locator('#confirmAction').click();
 const cleared=await state();assert.deepEqual(cleared.selected,{});assert.deepEqual(cleared.extras,{});assert.deepEqual(cleared.blueprintProgress,before.blueprintProgress);assert.deepEqual(cleared.wanted,before.wanted);
 await page.locator('#settingsRestoreClear').click();await page.locator('#confirmAction').click();assert.deepEqual(await state(),before);await page.locator('#closeSettings').click();
 await app.close();await launch();assert.deepEqual(await state(),before);assert.equal(await page.locator('html').getAttribute('data-theme'),'omarchy-catppuccin-latte');await page.locator('#settingsBtn').click();
 const bad=path.join(profile,'invalid.json');await writeFile(bad,JSON.stringify({...before,blueprintProgress:{'not-real':'unlocked'}}));await page.locator('#importFile').setInputFiles(bad);assert.deepEqual(await state(),before);assert.equal(await page.locator('#confirmDialog').isVisible(),false);
 await page.locator('#importFile').setInputFiles(backup);await page.locator('#confirmAction').click();assert.deepEqual(await state(),before);if(await page.locator('#settings').isVisible())await page.locator('#closeSettings').click();
 pass('export/import, invalid backup, clear/restore and process restart preserve progress and separate themes');
 const prefs=await app.evaluate(({BrowserWindow})=>{const p=BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();return {sandbox:p.sandbox,contextIsolation:p.contextIsolation,nodeIntegration:p.nodeIntegration};});assert.deepEqual(prefs,{sandbox:true,contextIsolation:true,nodeIntegration:false});assert.equal(await page.evaluate(()=>typeof window.require),'undefined');
 const referenceFiles=[...new Set(Object.values(catalogArtwork).map(image=>image.file))].filter(file=>installedImageFiles.includes(file));
 if(referenceFiles.length){
  const decoded=await page.evaluate(async files=>Promise.all(files.map(async file=>{const image=new Image();image.src='assets/'+file;await image.decode();return {file,width:image.naturalWidth,height:image.naturalHeight};})),referenceFiles);
  assert(decoded.every(image=>image.width>0&&image.height>0));
  await find('Arachnivox');const imageButton=card('blueprint-arachnivox').getByRole('button',{name:'View image for Arachnivox · Rezi 12',exact:true});
  assert.match(await card('blueprint-arachnivox').locator('.libraryImageCredit').innerText(),/Activision/);
  await imageButton.click();await page.locator('#artworkPreview').waitFor({state:'visible'});await page.locator('#artworkPreviewImage').evaluate(image=>image.decode());
  assert.match(await page.locator('#artworkPreviewCaption').innerText(),/callofduty.com/);assert.match(await page.locator('#artworkPreviewCaption').innerText(),/No affirmative redistribution license/);
  await capture('season1-blueprint-preview.png');await page.keyboard.press('Escape');await page.locator('#artworkPreview').waitFor({state:'hidden'});assert(await imageButton.evaluate(element=>element===document.activeElement));
  await imageButton.click();await page.locator('#closeArtworkPreview').click();assert(await imageButton.evaluate(element=>element===document.activeElement));
  pass('all installed new reference images decode; credited full-image preview closes by Escape/button and restores keyboard focus');
 }
 await find('');await resetFilters();await page.locator('#librarySeason').selectOption('season-1');await capture('season1-library.png');
 await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.setSize(800,650);w.webContents.setZoomFactor(1.25);});
 await page.waitForFunction(()=>innerWidth<800);
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await page.locator('#librarySearch').focus();await page.keyboard.type('CSG-35');
 const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,body:document.body.clientWidth,controls:[...document.querySelectorAll('#library select,#library input,#library button,nav button,#settingsBtn')].filter(el=>el.getClientRects().length).map(el=>({id:el.id||el.getAttribute('aria-label'),left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right}))}));
 assert(dimensions.scroll<=dimensions.width,JSON.stringify(dimensions));
 assert(dimensions.controls.every(control=>control.left>=0&&control.right<=dimensions.width),JSON.stringify(dimensions));
 await capture('season1-800x650-125percent.png');assert.deepEqual(errors,[]);assert.deepEqual(remoteRequests,[]);
 pass('secure offline Electron window, keyboard search and 800x650 at 125% without horizontal overflow');
 await writeFile(path.join(qa,'season1-results.json'),JSON.stringify({date:new Date().toISOString(),result:'PASS',checks,catalogEntries:catalogEntries.length,ownerDataUsed:false,packaged:!!process.env.DMZ_TEST_EXECUTABLE},null,2));
}finally{if(app)await app.close();}
