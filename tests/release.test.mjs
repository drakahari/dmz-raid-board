import {_electron as electron} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd(),qa=path.join(root,'.qa');await mkdir(qa,{recursive:true});
const extraction=process.argv[2];if(!extraction)throw Error('Pass an extracted candidate directory.');
const publicBuild=process.argv.includes('--public');const artworkBuild=process.argv.includes('--with-artwork');
const version=JSON.parse(await readFile('package.json','utf8')).version;
const profile=await mkdtemp(path.join(qa,publicBuild?'public-release-':'private-release-'));
let app;const checks=[];const pass=s=>{checks.push(s);console.log('PASS: '+s);};
async function launch(){app=await electron.launch({executablePath:path.join(extraction,'DMZ Raid Board.exe'),args:['--profile-dir',profile],cwd:extraction,timeout:60000});const page=await app.firstWindow();await page.locator('#items .item').first().waitFor();return page;}
try{
 let page=await launch();assert.equal(await app.evaluate(({app})=>app.getVersion()),version);
 assert.equal(await app.evaluate(({app})=>app.isPackaged),true);
 if(publicBuild){assert.match(await page.locator('#buildLabel').innerText(),/PUBLIC PRERELEASE \/ NO GAME ART/);assert.equal(await page.locator('img').count(),0);assert.equal(await page.getByText('No verified image yet',{exact:true}).count(),5);}
 pass('packaged version and truthful artwork mode');
 await page.locator('#upgrades [data-recipe="gunsmith"]').click();await page.locator('#upgrades [data-recipe="stash"]').click();
 await page.locator('#browse summary').first().click();await page.locator('#search').fill('MIA Recovery Discount II');
 const entry=page.locator('.catalogEntry').filter({has:page.getByRole('heading',{name:'MIA Recovery Discount II',exact:true})});
 assert.match(await entry.innerText(),/Owner-verified/);assert.match(await entry.innerText(),/no cash/);assert.match(await entry.innerText(),/5% recovery cost reduction/);
 await page.getByRole('button',{name:'Add MIA Recovery Discount II',exact:true}).click();
 const expected={'Binding Catalyst':'10','Degraded Execution Footage':'5','Nitro Compounds':'10','Nuclear Program Files':'5'};
 assert.deepEqual(await page.locator('#items h3').allTextContents(),Object.keys(expected));
 for(const [name,n] of Object.entries(expected))assert.equal(await page.getByLabel(name+' target',{exact:true}).inputValue(),n);
 assert.equal(await page.locator('#cash').innerText(),'$0 total selected-goal cost');
 pass('MIA II selectable with exact required counts, zero cash and A-Z targets');
 await page.locator('#browse summary').first().click();
 await page.getByLabel('Nitro Compounds target',{exact:true}).fill('9');await page.getByLabel('Nitro Compounds target',{exact:true}).press('Tab');
 await page.getByRole('button',{name:/Open raid checklist/}).click();
 for(const name of ['Binding Catalyst','Binding Catalyst','Nuclear Program Files'])await page.getByRole('button',{name:'Collect one '+name,exact:true}).click();
 assert.match(await page.locator('[data-card="Binding Catalyst"]').innerText(),/2 picked up \/ 10 target/);
 pass('edited raid targets and synthetic picked-up counts remain separate from requirements');
 await app.close();page=await launch();
 assert.match(await page.locator('[data-card="Binding Catalyst"]').innerText(),/2 picked up \/ 10 target/);
 assert.match(await page.locator('[data-card="Nitro Compounds"]').innerText(),/0 picked up \/ 9 target/);
 pass('actual packaged process close and relaunch retain selected tier, targets and picked-up counts');
 if(publicBuild||artworkBuild){
  if(publicBuild)assert.equal(await page.locator('img').count(),0);
  if(artworkBuild){assert.match(await page.locator('#buildLabel').innerText(),/UNOFFICIAL PRERELEASE \/ GAME ART/);for(const image of await page.locator('#items img').all())await image.evaluate(img=>img.decode());assert.equal(await page.locator('#items img').count(),4);await page.locator('#planTab').click();await page.getByLabel('Nitro Compounds target',{exact:true}).fill('10');await page.getByLabel('Nitro Compounds target',{exact:true}).press('Tab');await page.getByRole('button',{name:/Open raid checklist/}).click();}
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(1440,1040));
  await page.evaluate(()=>document.fonts.ready);await page.locator('#raidIntro').waitFor();
  await mkdir('docs',{recursive:true});await page.screenshot({path:artworkBuild?'docs/app-artwork.png':'docs/app-public.png',fullPage:true});
  pass('actual release screenshot uses synthetic demo data and no desktop/account information');
 }
 const result={date:new Date().toISOString(),version,mode:publicBuild?'public':artworkBuild?'artwork':'private',executable:path.join(extraction,'DMZ Raid Board.exe'),checks,result:'PASS'};
 await writeFile(path.join(qa,publicBuild?'release-public-results.json':artworkBuild?'release-artwork-results.json':'release-private-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{if(app)await app.close();}
