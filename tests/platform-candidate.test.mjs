import {_electron as electron} from '@playwright/test';import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir,unlink} from 'node:fs/promises';import {execFileSync,spawnSync} from 'node:child_process';import path from 'node:path';
const qa=path.resolve('.ci');await mkdir(qa,{recursive:true});const output='release/platform-candidates';const files=await readdir(output);let executable,app,info,adHoc=false;
const checks=[];const pass=note=>{checks.push(note);console.log('PASS: '+note);};
try{
 if(process.platform==='darwin'){
  const zip=files.find(f=>f.includes('-'+process.arch+'-')&&f.endsWith('.zip'));assert(zip);
  const dest=path.join(qa,'native-launch');await mkdir(dest,{recursive:true});execFileSync('ditto',['-x','-k',path.resolve(output,zip),dest]);
  const appName=(await readdir(dest)).find(f=>f.endsWith('.app'));assert(appName);const bundle=path.join(dest,appName);executable=path.join(bundle,'Contents/MacOS/DMZ Raid Board');
  execFileSync('codesign',['--verify','--deep','--strict',bundle]);
  const signature=spawnSync('codesign',['--display','--verbose=2',bundle],{encoding:'utf8'});assert.equal(signature.status,0);assert(signature.stderr.includes('Signature=adhoc'));adHoc=true;
 }else{assert.equal(process.platform,'linux');const file=files.find(f=>f.endsWith('.AppImage'));assert(file);executable=path.resolve(output,file);}
 async function launch(){app=await electron.launch({executablePath:executable,chromiumSandbox:true,args:[],env:{...process.env,APPIMAGE_EXTRACT_AND_RUN:'1'},timeout:60000});const page=await app.firstWindow();await page.locator('[data-card="CPU"]').waitFor();return page;}
 let page=await launch();info=await app.evaluate(({app,BrowserWindow})=>({version:app.getVersion(),packaged:app.isPackaged,userData:app.getPath('userData'),appData:app.getPath('appData'),exe:app.getPath('exe'),platform:process.platform,arch:process.arch,args:process.argv,sandbox:BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences().sandbox}));
 assert.equal(info.version,'0.1.4');assert.equal(info.packaged,true);assert.equal(info.arch,process.env.CANDIDATE_ARCH);assert.equal(info.sandbox,true);assert(!info.args.includes('--no-sandbox'));
 assert(info.userData.startsWith(info.appData+path.sep));assert(!info.userData.startsWith(path.dirname(info.exe)+path.sep));
 await writeFile(path.join(info.userData,'candidate-write-probe'),'ok');await unlink(path.join(info.userData,'candidate-write-probe'));pass('native packaged launch, renderer sandbox and writable per-user data outside app bundle/mount');
 await page.getByLabel('CPU target',{exact:true}).fill('7');await page.getByLabel('CPU target',{exact:true}).press('Tab');await page.locator('#settingsBtn').click();assert.equal(await page.locator('#themePicker option').count(),27);await page.locator('#themePicker').selectOption('omarchy-nord');await page.locator('#closeSettings').click();
 await page.locator('#raidTab').click();await page.getByRole('button',{name:'Collect one CPU',exact:true}).click();
 assert.match(await page.locator('[data-card="CPU"]').innerText(),/1 picked up \/ 7 target/);pass('same Settings/themes, editable targets and picked-up workflow');
 await app.close();page=await launch();assert.equal(await page.locator('html').getAttribute('data-theme'),'omarchy-nord');assert.match(await page.locator('[data-card="CPU"]').innerText(),/1 picked up \/ 7 target/);pass('actual native process close/relaunch preserves board and appearance');
 await page.screenshot({path:path.join(qa,'native-preview.png'),fullPage:true});
 await writeFile(path.join(qa,'native-test.json'),JSON.stringify({result:'PASS',platform:info.platform,arch:info.arch,version:info.version,commit:process.env.GITHUB_SHA,checks,perUserStorage:true,rendererSandbox:true,appImageMode:process.platform==='linux'?'extract-and-run; FUSE mount path not tested':null,signing:process.platform==='darwin'&&adHoc?'ad-hoc only; no Developer ID or notarization':'not signed',nativeOwnerAcceptance:'PENDING'},null,2));
}catch(error){await writeFile(path.join(qa,'native-test.json'),JSON.stringify({result:'FAIL',platform:process.platform,arch:process.arch,error:String(error.message).slice(0,500),checks,nativeOwnerAcceptance:'PENDING'},null,2));throw error;}finally{if(app)await app.close();}
