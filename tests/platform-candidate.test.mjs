import {extractFile} from '@electron/asar';
import {_electron as electron} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp,readdir,unlink} from 'node:fs/promises';
import {execFileSync,spawnSync} from 'node:child_process';
import path from 'node:path';
import {createHash} from 'node:crypto';

const iconHash=createHash('sha256').update(await readFile('branding/dmz-icon.png')).digest('hex');
const expectedVersion=JSON.parse(await readFile('package.json','utf8')).version;
const expectedArch=process.env.CANDIDATE_ARCH||process.arch;
const qa=path.resolve('.ci');
await mkdir(qa,{recursive:true});
const output=path.resolve('release/platform-candidates');
const files=await readdir(output);
const checks=[];
const pass=note=>{checks.push(note);console.log('PASS: '+note);};
let executable,app,info,profile,artifact,adHoc=false;

try {
 if(process.platform==='darwin'){
  const candidates=files.filter(file=>file.includes('-'+expectedArch+'-')&&file.endsWith('.zip'));
  assert.equal(candidates.length,1,'Expected one macOS ZIP for the requested architecture');
  artifact=candidates[0];
  const destination=await mkdtemp(path.join(qa,'native-launch-'));
  execFileSync('ditto',['-x','-k',path.join(output,artifact),destination]);
  const bundles=(await readdir(destination)).filter(file=>file.endsWith('.app'));
  assert.equal(bundles.length,1,'Expected one extracted application bundle');
  const bundle=path.join(destination,bundles[0]);
  executable=path.join(bundle,'Contents/MacOS/DMZ Raid Board');
  execFileSync('codesign',['--verify','--deep','--strict',bundle]);
  const signature=spawnSync('codesign',['--display','--verbose=2',bundle],{encoding:'utf8'});
  assert.equal(signature.status,0,signature.error?.message||signature.stderr);
  assert.match(signature.stderr,/Signature=adhoc/);
  adHoc=true;
  pass('macOS bundle signature verifies as ad hoc; Developer ID and notarization are not tested');
 }else{
  assert.equal(process.platform,'linux','This runner checks macOS and Linux native candidates');
  const candidates=files.filter(file=>file.endsWith('.AppImage'));
  assert.equal(candidates.length,1,'Expected one Linux AppImage candidate');
  artifact=candidates[0];
  executable=path.join(output,artifact);
 }

 // Every launch uses a fresh QA profile. Never open the owner's application data.
 profile=await mkdtemp(path.join(qa,'native-profile-'));
 const nativeEnv={...process.env};
 if(process.platform==='linux')nativeEnv.APPIMAGE_EXTRACT_AND_RUN='1';
 app=await electron.launch({
  executablePath:executable,
  chromiumSandbox:true,
  args:['--profile-dir',profile],
  env:nativeEnv,
  timeout:60000
 });
 const page=await app.firstWindow();
 await page.locator('#libraryTab').waitFor();
 info=await app.evaluate(({app,BrowserWindow})=>{
  const preferences=BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();
  return {
   version:app.getVersion(),packaged:app.isPackaged,userData:app.getPath('userData'),
   exe:app.getPath('exe'),platform:process.platform,arch:process.arch,args:process.argv,
   appPath:app.getAppPath(),sandbox:preferences.sandbox,
   contextIsolation:preferences.contextIsolation,nodeIntegration:preferences.nodeIntegration
  };
 });
 assert.equal(info.version,expectedVersion);
 assert.equal(info.packaged,true);
 assert.equal(info.arch,expectedArch);
 assert.equal(info.sandbox,true);
 assert.equal(info.contextIsolation,true);
 assert.equal(info.nodeIntegration,false);
 assert(!info.args.includes('--no-sandbox'));
 assert.equal(await page.evaluate(()=>typeof window.require),'undefined');
 assert.equal(path.resolve(info.userData),path.resolve(profile));
 assert(!info.userData.startsWith(path.dirname(info.exe)+path.sep));
 assert.equal(await page.locator('#items .item').count(),0);
 pass('native packaged version and architecture match; renderer sandbox and isolation remain enabled');

 const bundledIconHash=createHash('sha256').update(extractFile(info.appPath,path.join('dist','app-icon.png'))).digest('hex');
 assert.equal(bundledIconHash,iconHash);
 if(process.platform==='darwin'){
  const bundle=path.resolve(path.dirname(executable),'../..');
  const iconName=execFileSync('/usr/libexec/PlistBuddy',[
   '-c','Print :CFBundleIconFile',path.join(bundle,'Contents/Info.plist')
  ],{encoding:'utf8'}).trim();
  assert.equal((await readFile(path.join(bundle,'Contents/Resources',iconName))).subarray(0,4).toString(),'icns');
 }else{
  assert((await readFile(path.join(path.dirname(info.exe),'.DirIcon'))).length>1000);
 }
 pass('packaged master icon matches source and native bundle or launcher icon asset exists');

 const writeProbe=path.join(info.userData,'candidate-write-probe');
 await writeFile(writeProbe,'ok',{flag:'wx'});
 assert.equal(await readFile(writeProbe,'utf8'),'ok');
 await unlink(writeProbe);
 pass('requested isolated profile is used and writable outside the application bundle or extracted mount');
 await page.screenshot({path:path.join(qa,'native-preview.png'),fullPage:true});
 await app.close();
 app=null;

 // Default userData policy is checked by unit tests, not by opening an owner profile.
 execFileSync(process.execPath,['--test','tests/data-path.test.mjs'],{stdio:'inherit',env:nativeEnv});
 pass('default Windows portable and macOS/Linux per-user path policies pass unit tests');

 // The active acceptance suite creates its own isolated profiles and covers v3
 // migration, library/planner behavior, persistence, backups, themes and security.
 execFileSync(process.execPath,['tests/season-ui.test.mjs'],{
  stdio:'inherit',env:{...nativeEnv,DMZ_TEST_EXECUTABLE:executable}
 });
 pass('current Season 1 acceptance passes against the native packaged executable using isolated profiles');

 await writeFile(path.join(qa,'native-test.json'),JSON.stringify({
  result:'PASS',platform:info.platform,arch:info.arch,version:info.version,
  commit:process.env.GITHUB_SHA,artifact,checks,seasonAcceptance:true,
  iconSha256:iconHash,isolatedProfileOverrideTested:true,isolatedProfileWritable:true,
  ownerDataUsed:false,defaultUserDataLaunchTested:false,defaultStoragePolicyUnitTested:true,
  rendererSandbox:true,
  appImageMode:process.platform==='linux'?'extract-and-run; FUSE mounting and desktop acceptance not tested':null,
  signing:process.platform==='darwin'&&adHoc?'ad-hoc only; no Developer ID or notarization':'not signed',
  nativeOwnerAcceptance:'PENDING'
 },null,2));
}catch(error){
 await writeFile(path.join(qa,'native-test.json'),JSON.stringify({
  result:'FAIL',platform:process.platform,arch:process.arch,artifact,
  error:String(error.message).slice(0,500),checks,ownerDataUsed:false,
  defaultUserDataLaunchTested:false,nativeOwnerAcceptance:'PENDING'
 },null,2));
 throw error;
}finally{
 if(app)await app.close();
}
