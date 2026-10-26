// Reuse only the already-published, owner-approved Windows v0.1.4 artwork bundle.
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import path from 'node:path';
import {extractFile} from '@electron/asar';
const url='https://github.com/drakahari/dmz-raid-board/releases/download/v0.1.4/DMZ-Raid-Board-0.1.4-win-x64-portable-with-artwork.zip';
const expected='179bb47735234e7c91f67f920a59615dfdb7018f177b4bfef532b989cdae9bdb';
await mkdir('.ci/seed',{recursive:true});
try{await access('assets/private-provenance.json');throw Error('Existing private provenance must not be overwritten');}catch(error){if(error.code!=='ENOENT')throw error;}
const response=await fetch(url);if(!response.ok)throw Error('Published seed download HTTP '+response.status);
const bytes=Buffer.from(await response.arrayBuffer());if(createHash('sha256').update(bytes).digest('hex')!==expected)throw Error('Published seed SHA256 mismatch');
await writeFile('.ci/seed/windows.zip',bytes);
execFileSync('python3',['-c',"import zipfile;z=zipfile.ZipFile('.ci/seed/windows.zip');[z.extract(n,'.ci/seed') for n in ['resources/app.asar','ARTWORK-SOURCES.json']]"],{stdio:'inherit'});
const sources=JSON.parse(await readFile('.ci/seed/ARTWORK-SOURCES.json','utf8'));if(sources.images.length!==128)throw Error('Unexpected source image count');
const seen=new Set();await mkdir('assets',{recursive:true});
for(const item of sources.images){
 if(!/^[a-z0-9-]+\.(png|webp)$/.test(item.file)||seen.has(item.file)||!/[a-f0-9]{64}/.test(item.sha256))throw Error('Invalid image inventory');seen.add(item.file);
 const image=extractFile('.ci/seed/resources/app.asar',path.join('dist','renderer','assets',item.file));
 if(createHash('sha256').update(image).digest('hex')!==item.sha256.toLowerCase())throw Error('Seed image hash mismatch');
 try{const existing=await readFile('assets/'+item.file);if(!existing.equals(image))throw Error('Existing image would be overwritten');}catch(error){if(error.code!=='ENOENT')throw error;await writeFile('assets/'+item.file,image);}
}
await writeFile('assets/private-provenance.json',JSON.stringify({manifest:sources.images},null,2));
console.log('Verified/reused 128 images from published v0.1.4; no source-site images fetched.');
