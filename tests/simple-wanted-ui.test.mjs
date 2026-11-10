import {_electron as electron} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {catalogEntries} from '../dist/renderer/acquisition.mjs';
import {catalogArtwork} from '../dist/renderer/artwork-data.mjs';
import {installedImageFiles} from '../dist/renderer/asset-status.mjs';
const root=process.cwd(),qa=path.resolve('.qa');await mkdir(qa,{recursive:true});
const profile=await mkdtemp(path.join(qa,'simple-wanted-'));
const expectedVersion=JSON.parse(await readFile('package.json','utf8')).version;
const key='dmz-raid-board-state-v4',oldKey='dmz-raid-board-state-v3';
const vest='printer:3-plate-ballistic-gel-vest',manual='manual-han-86';
const checks=[],errors=[],remoteRequests=[];
let app,page;
const pass=name=>{checks.push(name);console.log('PASS: '+name);};
async function launch(){
 app=await electron.launch(process.env.DMZ_TEST_EXECUTABLE?{executablePath:process.env.DMZ_TEST_EXECUTABLE,args:['--profile-dir',profile],chromiumSandbox:true}:{args:['.','--profile-dir',profile],cwd:root,chromiumSandbox:true});
 page=await app.firstWindow();page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(!/^(file:|blob:|devtools:)/.test(request.url()))remoteRequests.push(request.url());});await page.locator('#libraryTab').waitFor();
 const info=await app.evaluate(({app})=>({version:app.getVersion(),packaged:app.isPackaged,profile:app.getPath('userData')}));assert.equal(info.version,expectedVersion);assert.equal(info.packaged,!!process.env.DMZ_TEST_EXECUTABLE);assert.equal(path.resolve(info.profile),profile);
}
const state=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
const card=id=>page.locator('[data-library-entry="'+id+'"]');
const statusButton=(id,status)=>card(id).locator('[data-status-id="'+id+'"][data-item-status="'+status+'"]');
async function openDetails(id){if(!await page.locator('#'+id).evaluate(element=>element.open))await page.locator('#'+id+' > summary').click();}
async function filters(){await openDetails('libraryMoreFilters');for(const id of ['libraryCategory','libraryKind','librarySeason','libraryItemStatus'])await page.locator('#'+id).selectOption('all');await page.locator('#librarySearch').fill('');}
async function find(name){await page.locator('#libraryTab').click();await filters();await page.locator('#librarySearch').fill(name);}
async function setStatus(id,status){const entry=catalogEntries.find(entry=>entry.id===id);await find(entry.name);await statusButton(id,status).click();}
async function capture(name){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));const png=await app.evaluate(async({BrowserWindow})=>(await BrowserWindow.getAllWindows()[0].webContents.capturePage()).toPNG().toString('base64'));await writeFile(path.join(qa,name),Buffer.from(png,'base64'));}
try{
 await launch();
 const old={version:3,selected:{gunsmith:1},adjustments:{CPU:-3},extras:{CPU:2},picked:{CPU:4},completed:['Power Regulator'],hideCompleted:false,blueprintProgress:{[vest]:'unlocked',[manual]:'found'},wanted:[vest],acquisitionPlans:{}};
 const raw=JSON.stringify(old);
 await page.evaluate(({key,oldKey,raw})=>{localStorage.removeItem(key);localStorage.setItem(oldKey,raw);},{key,oldKey,raw});await page.reload();await page.locator('[data-card="CPU"]').waitFor();
 let saved=await state();assert.equal(saved.version,4);assert.deepEqual(saved.owned,[]);assert.deepEqual(saved.wanted,[vest]);assert.deepEqual(saved.blueprintProgress,old.blueprintProgress);
 for(const field of ['selected','adjustments','extras','picked','completed','hideCompleted','acquisitionPlans'])assert.deepEqual(saved[field],old[field]);assert.equal(await page.evaluate(k=>localStorage.getItem(k),oldKey),raw);assert(await page.locator('#migrationNotice').isVisible());
 await page.locator('#raidTab').click();const wantedVest=page.locator('[data-wanted-card="'+vest+'"]');await wantedVest.waitFor();assert.match(await wantedVest.innerText(),/3-Plate Ballistic Gel Vest/);assert.equal(await page.locator('#navCount').innerText(),'4');
 assert.equal(await page.locator('[data-card="Experimental Compounds"]').count(),0);assert.equal(await page.locator('[data-card="Stabilized Reagents"]').count(),0);assert.equal((await state()).selected['3-plate-ballistic-gel-vest'],undefined);
 if(await wantedVest.locator('img').count())await wantedVest.locator('img').evaluate(image=>image.decode());await capture('simple-wanted-vest-raid.png');
 pass('v3 migration retains original data and wants; wanted vest appears itself in Raid without ingredients or inferred ownership');

 await setStatus(vest,'have');saved=await state();assert(saved.owned.includes(vest));assert(!saved.wanted.includes(vest));await page.locator('#raidTab').click();assert.equal(await wantedVest.count(),0);
 await setStatus(vest,'neither');saved=await state();assert(!saved.owned.includes(vest)&&!saved.wanted.includes(vest));
 await setStatus(vest,'want');await statusButton(vest,'want').click();assert.equal((await state()).wanted.filter(id=>id===vest).length,1);
 assert.equal(await card(vest).locator('[data-library-route],[data-catalog-plan],[data-catalog-quantity],[data-catalog-track],[data-blueprint-progress],[data-wanted]').count(),0);assert.doesNotMatch(await card(vest).innerText(),/Experimental Compounds|Stabilized Reagents|Planned quantity|Acquisition route/);
 await page.locator('#raidTab').click();await wantedVest.locator('[data-raid-have]').click();assert((await state()).owned.includes(vest));await setStatus(vest,'want');await page.locator('#raidTab').click();await wantedVest.locator('[data-raid-remove-want]').click();assert(!(await state()).wanted.includes(vest));await setStatus(vest,'want');
 assert.deepEqual((await state()).selected,old.selected);assert.deepEqual((await state()).picked,old.picked);assert.deepEqual((await state()).extras,old.extras);
 pass('Have/Want/Neither and Raid actions are exclusive, persistent choices; repeated Want cannot duplicate an entry or alter printer data');

 const cosmetics=catalogEntries.filter(entry=>entry.kind==='cosmetic-blueprint'),haveId=cosmetics[0].id,changedId=cosmetics[1].id;
 await setStatus(haveId,'have');await page.locator('#librarySearch').fill('');await page.locator('#libraryKind').selectOption('cosmetic-blueprint');
 await openDetails('libraryBulkOptions');assert.match(await page.locator('#libraryBulkScope').innerText(),/page/i);assert.match(await page.locator('#libraryStatus').innerText(),new RegExp(String(cosmetics.length)));
 await page.locator('#libraryWantAll').focus();await page.keyboard.press('Enter');saved=await state();assert(saved.owned.includes(haveId));assert(!saved.wanted.includes(haveId));assert(cosmetics.filter(entry=>entry.id!==haveId).every(entry=>saved.wanted.includes(entry.id)));assert(saved.wanted.includes(vest));
 await setStatus(changedId,'have');await page.locator('#libraryUndoBulk').click();saved=await state();assert(saved.owned.includes(haveId)&&saved.owned.includes(changedId));assert.deepEqual(saved.wanted,[vest]);
 await page.locator('#librarySearch').fill('');await page.locator('#libraryKind').selectOption('cosmetic-blueprint');await page.locator('#libraryWantAll').click();
 await page.locator('#librarySeason').selectOption('season-1');const scoped=cosmetics.filter(entry=>entry.season==='season-1'&&!saved.owned.includes(entry.id)).map(entry=>entry.id);const beforeClear=await state();
 await page.locator('#libraryClearWanted').click();await page.locator('#cancelAction').click();assert.deepEqual(await state(),beforeClear);
 await page.locator('#libraryClearWanted').click();await page.locator('#confirmAction').click();saved=await state();assert(scoped.every(id=>!saved.wanted.includes(id)));assert(cosmetics.filter(entry=>entry.season==='preseason').every(entry=>saved.wanted.includes(entry.id)));assert(saved.wanted.includes(vest));assert(saved.owned.includes(haveId)&&saved.owned.includes(changedId));
 await page.locator('#libraryUndoBulk').click();assert.deepEqual(new Set((await state()).wanted),new Set(beforeClear.wanted));
 const persistent=await state();await app.close();await launch();assert.deepEqual(await state(),persistent);await page.locator('#raidTab').click();assert.equal(await page.locator('[data-wanted-card="'+vest+'"]').count(),1);
 pass('bulk Want covers every filtered page, clear respects filters and cancel, Have choices survive, Undo protects later Have edits, and bulk results survive restart');

 await page.locator('#planTab').click();await page.locator('#directItem').selectOption('Manual: Han 86');await page.locator('#directCount').fill('2');await page.locator('#addTarget').click();await setStatus(manual,'want');await page.locator('#raidTab').click();
 const manualCard=page.locator('#items [data-card="Manual: Han 86"]'),manualRequest=page.locator('#wantedLibraryTargets [data-wanted-card="'+manual+'"]');await manualCard.waitFor();await manualRequest.waitFor();assert.equal(await manualCard.locator('[data-raid-have]').count(),0);assert.equal(await manualRequest.locator('[data-item],[data-complete]').count(),0);
 await page.getByRole('button',{name:'Collect one Manual: Han 86',exact:true}).click();await page.getByRole('button',{name:'Collect one Manual: Han 86',exact:true}).click();await page.locator('#hideDone').check();assert.equal(await manualCard.count(),0);assert(await manualRequest.isVisible());
 await manualRequest.locator('[data-raid-have]').click();saved=await state();assert(saved.owned.includes(manual));assert.equal(saved.extras['Manual: Han 86'],2);assert.equal(saved.picked['Manual: Han 86'],2);assert.equal(await manualCard.count(),0);assert.equal(await manualRequest.count(),0);
 const beforeRaid=await state();await page.locator('#newRaid').click();await page.locator('#cancelAction').click();assert.deepEqual(await state(),beforeRaid);await page.locator('#newRaid').click();await page.locator('#confirmAction').click();saved=await state();assert.deepEqual(saved.picked,{});assert.deepEqual(saved.completed,[]);assert.deepEqual(saved.owned,beforeRaid.owned);assert.deepEqual(saved.wanted,beforeRaid.wanted);assert.deepEqual(saved.selected,beforeRaid.selected);
 pass('same-name manual extras and library requests use independent sections/actions; hiding physical completion preserves the request; New raid keeps Have/Want');

 await page.locator('#settingsBtn').click();await page.locator('#themePicker').selectOption('omarchy-catppuccin-latte');const beforeAllClear=await state();await page.locator('#settingsClear').click();await page.locator('#confirmAction').click();saved=await state();assert.deepEqual(saved.wanted,[]);assert.deepEqual(saved.selected,{});assert.deepEqual(saved.extras,{});assert.deepEqual(saved.owned,beforeAllClear.owned);assert.deepEqual(saved.blueprintProgress,beforeAllClear.blueprintProgress);await page.locator('#closeSettings').click();
 await setStatus(vest,'have');await page.locator('#settingsBtn').click();await page.locator('#settingsRestoreClear').click();await page.locator('#confirmAction').click();saved=await state();assert(saved.owned.includes(vest));assert(!saved.wanted.includes(vest));assert.deepEqual(saved.selected,beforeAllClear.selected);assert.deepEqual(saved.extras,beforeAllClear.extras);assert.deepEqual(new Set(saved.wanted),new Set(beforeAllClear.wanted.filter(id=>id!==vest)));assert.equal(await page.locator('html').getAttribute('data-theme'),'omarchy-catppuccin-latte');
 const backup=path.join(profile,'simple-wanted-backup.json'),expected=await state();await app.evaluate(({session},destination)=>{globalThis.qaDownload=new Promise(resolve=>session.defaultSession.once('will-download',(_event,item)=>{item.setSavePath(destination);item.once('done',(_e,result)=>resolve(result));}));return true;},backup);await page.locator('#settingsBackup').click();assert.equal(await app.evaluate(async()=>await globalThis.qaDownload),'completed');assert.deepEqual(JSON.parse(await readFile(backup,'utf8')),expected);
 const invalid=path.join(profile,'conflicting-status.json');await writeFile(invalid,JSON.stringify({...expected,wanted:[...expected.wanted,vest]}));await page.locator('#importFile').setInputFiles(invalid);assert.deepEqual(await state(),expected);assert.equal(await page.locator('#confirmDialog').isVisible(),false);
 await page.locator('#importFile').setInputFiles(backup);await page.locator('#confirmAction').click();assert.deepEqual(await state(),expected);if(await page.locator('#settings').isVisible())await page.locator('#closeSettings').click();
 pass('Clear list includes wanted items but preserves Have, recovery reconciles later Have choices, and v4 backups/import validation preserve themes and all board data');

 await setStatus(vest,'want');await page.locator('#raidTab').click();await capture('simple-wanted-raid.png');
 const available=[...new Set(Object.values(catalogArtwork).map(image=>image.file))].filter(file=>installedImageFiles.includes(file));if(available.length){
  await find('Arachnivox');const preview=card('blueprint-arachnivox').getByRole('button',{name:'View image for Arachnivox · Rezi 12',exact:true});await preview.click();await page.locator('#artworkPreviewImage').evaluate(image=>image.decode());assert.match(await page.locator('#artworkPreviewCaption').innerText(),/Activision/);await page.keyboard.press('Escape');await page.locator('#artworkPreview').waitFor({state:'hidden'});assert(await preview.evaluate(element=>element===document.activeElement));
 }
 await find('3-Plate Ballistic Gel Vest');await capture('simple-wanted-library.png');
 const prefs=await app.evaluate(({BrowserWindow})=>{const p=BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();return {sandbox:p.sandbox,contextIsolation:p.contextIsolation,nodeIntegration:p.nodeIntegration};});assert.deepEqual(prefs,{sandbox:true,contextIsolation:true,nodeIntegration:false});
 await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.setSize(800,650);w.webContents.setZoomFactor(1.25);});await page.waitForFunction(()=>innerWidth<800);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.locator('#librarySearch').focus();await page.keyboard.press('ControlOrMeta+A');await page.keyboard.type('Vest');
 const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,controls:[...document.querySelectorAll('#library button,#library input,#library select,nav button,#settingsBtn')].filter(element=>element.getClientRects().length).map(element=>({left:element.getBoundingClientRect().left,right:element.getBoundingClientRect().right}))}));assert(dimensions.scroll<=dimensions.width,JSON.stringify(dimensions));assert(dimensions.controls.every(control=>control.left>=0&&control.right<=dimensions.width),JSON.stringify(dimensions));await capture('simple-wanted-800x650-125percent.png');assert.deepEqual(errors,[]);assert.deepEqual(remoteRequests,[]);
 pass('simplified status controls, credits and image preview remain keyboard accessible, offline and responsive at 800x650/125%');
 await page.evaluate(k=>localStorage.setItem(k,'{corrupt-new-save'),key);await page.reload();await page.locator('#recovery').waitFor({state:'visible'});assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),'{corrupt-new-save');assert.equal(await page.evaluate(k=>localStorage.getItem(k),oldKey),raw);
 pass('a corrupt v4 save stays intact and does not silently replace itself with an older v3 board');
 await writeFile(path.join(qa,'simple-wanted-results.json'),JSON.stringify({date:new Date().toISOString(),result:'PASS',checks,catalogEntries:catalogEntries.length,ownerDataUsed:false,packaged:!!process.env.DMZ_TEST_EXECUTABLE,version:expectedVersion},null,2));
}finally{if(app)await app.close();}
