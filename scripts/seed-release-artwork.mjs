// Reuse the exact owner-approved Windows bundle, including the current owner screenshot.
// Exact130-image release seed is pinned; read-only native jobs consume the staged artifact, no repository token.
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import path from 'node:path';
import {extractFile} from '@electron/asar';
const repository='drakahari/dmz-raid-board',tag='v0.1.8';
const filename='DMZ-Raid-Board-0.1.8-win-x64-portable-with-artwork.zip';
const expected='bc6c8d3b6a35054c3a811830fe3adce90a3e15839a939504adb612c2f4f93361';
await mkdir('.ci/seed',{recursive:true});
try{await access('assets/private-provenance.json');throw Error('Existing private provenance must not be overwritten');}catch(error){if(error.code!=='ENOENT')throw error;}
let bytes;
if(process.env.DMZ_ARTWORK_SEED_FILE){bytes=await readFile(process.env.DMZ_ARTWORK_SEED_FILE);}
else{
 const response=await fetch('https://github.com/'+repository+'/releases/download/'+tag+'/'+filename);
 if(!response.ok)throw Error('Public seed download HTTP '+response.status);bytes=Buffer.from(await response.arrayBuffer());
}
if(createHash('sha256').update(bytes).digest('hex')!==expected)throw Error('Approved seed SHA256 mismatch');
await writeFile('.ci/seed/windows.zip',bytes);
execFileSync(process.env.DMZ_SEED_PYTHON||'python3',['-c',"import zipfile;z=zipfile.ZipFile('.ci/seed/windows.zip');[z.extract(n,'.ci/seed') for n in ['resources/app.asar','ARTWORK-SOURCES.json']]"],{stdio:'inherit'});
const sources=JSON.parse(await readFile('.ci/seed/ARTWORK-SOURCES.json','utf8'));if(sources.images.length!==130)throw Error('Unexpected source image count');
const seen=new Set();await mkdir('assets',{recursive:true});
for(const item of sources.images){
 if(!/^[a-z0-9-]+\.(png|webp)$/.test(item.file)||seen.has(item.file)||!/^([a-f0-9]{64})$/.test(item.sha256))throw Error('Invalid image inventory');seen.add(item.file);
 const image=extractFile('.ci/seed/resources/app.asar',path.join('dist','renderer','assets',item.file));
 if(createHash('sha256').update(image).digest('hex')!==item.sha256.toLowerCase())throw Error('Seed image hash mismatch');
 try{const existing=await readFile('assets/'+item.file);if(!existing.equals(image))throw Error('Existing image would be overwritten');}catch(error){if(error.code!=='ENOENT')throw error;await writeFile('assets/'+item.file,image);}
}
const military=sources.images.find(row=>row.file==='owner-military-composites.png');if(military?.sha256!=='2548c5d4ba10a7fc333dd6656700860e879a8a910d512eafb4f413c3b09b202b')throw Error('Owner screenshot provenance mismatch');
const foreign=sources.images.find(row=>row.file==='owner-foreign-intelligence-targets.png');if(foreign?.sha256!=='5144a0c9ae426eee83530b420ab84282b8ef909820d9fec6d102ab5ee0185d5f')throw Error('Foreign owner screenshot provenance mismatch');
await writeFile('assets/private-provenance.json',JSON.stringify({manifest:sources.images},null,2));
console.log('Verified/reused 130 images from the approved Windows bundle; no source-site images fetched.');
