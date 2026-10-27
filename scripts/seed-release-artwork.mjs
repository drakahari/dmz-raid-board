// Reuse the exact owner-approved Windows bundle, including the current owner screenshot.
// CI can read its unpublished draft asset with the existing read-only job token.
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import path from 'node:path';
import {extractFile} from '@electron/asar';
const repository='drakahari/dmz-raid-board',tag='v0.1.7';
const filename='DMZ-Raid-Board-0.1.7-win-x64-portable-with-artwork.zip';
const expected='48b050ce1a81a6acfd5c79284f125db30dca0cf834cf0273aafb0689834c173d';
await mkdir('.ci/seed',{recursive:true});
try{await access('assets/private-provenance.json');throw Error('Existing private provenance must not be overwritten');}catch(error){if(error.code!=='ENOENT')throw error;}
let bytes;
if(process.env.DMZ_ARTWORK_SEED_FILE){bytes=await readFile(process.env.DMZ_ARTWORK_SEED_FILE);}
else{
 const token=process.env.GH_TOKEN||process.env.GITHUB_TOKEN;let response;
 if(token){
  const api='https://api.github.com/repos/'+repository;
  const headers={Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'dmz-release-build'};
  const metadata=await fetch(api+'/releases?per_page=100',{headers});if(!metadata.ok)throw Error('Seed release lookup HTTP '+metadata.status);
  const releases=await metadata.json(),release=releases.find(row=>row.tag_name===tag);
  const asset=release?.assets.find(row=>row.name===filename&&row.state==='uploaded');if(!asset)throw Error('Approved seed asset is not fully uploaded');
  if(asset.digest&&asset.digest.toLowerCase()!=='sha256:'+expected)throw Error('Seed asset metadata hash mismatch');
  if(!asset.url.startsWith(api+'/releases/assets/'))throw Error('Unexpected seed asset endpoint');
  response=await fetch(asset.url,{headers:{...headers,Accept:'application/octet-stream'},redirect:'manual'});
  if([301,302,303,307,308].includes(response.status)){
   const location=new URL(response.headers.get('location'));if(location.protocol!=='https:'||location.hostname!=='release-assets.githubusercontent.com')throw Error('Unexpected seed download host');
   response=await fetch(location); // Never forward the repository token to the asset host.
  }
 }else response=await fetch('https://github.com/'+repository+'/releases/download/'+tag+'/'+filename);
 if(!response.ok)throw Error('Seed download HTTP '+response.status);bytes=Buffer.from(await response.arrayBuffer());
}
if(createHash('sha256').update(bytes).digest('hex')!==expected)throw Error('Approved seed SHA256 mismatch');
await writeFile('.ci/seed/windows.zip',bytes);
execFileSync(process.env.DMZ_SEED_PYTHON||'python3',['-c',"import zipfile;z=zipfile.ZipFile('.ci/seed/windows.zip');[z.extract(n,'.ci/seed') for n in ['resources/app.asar','ARTWORK-SOURCES.json']]"],{stdio:'inherit'});
const sources=JSON.parse(await readFile('.ci/seed/ARTWORK-SOURCES.json','utf8'));if(sources.images.length!==129)throw Error('Unexpected source image count');
const seen=new Set();await mkdir('assets',{recursive:true});
for(const item of sources.images){
 if(!/^[a-z0-9-]+\.(png|webp)$/.test(item.file)||seen.has(item.file)||!/^([a-f0-9]{64})$/.test(item.sha256))throw Error('Invalid image inventory');seen.add(item.file);
 const image=extractFile('.ci/seed/resources/app.asar',path.join('dist','renderer','assets',item.file));
 if(createHash('sha256').update(image).digest('hex')!==item.sha256.toLowerCase())throw Error('Seed image hash mismatch');
 try{const existing=await readFile('assets/'+item.file);if(!existing.equals(image))throw Error('Existing image would be overwritten');}catch(error){if(error.code!=='ENOENT')throw error;await writeFile('assets/'+item.file,image);}
}
const military=sources.images.find(row=>row.file==='owner-military-composites.png');if(military?.sha256!=='2548c5d4ba10a7fc333dd6656700860e879a8a910d512eafb4f413c3b09b202b')throw Error('Owner screenshot provenance mismatch');
await writeFile('assets/private-provenance.json',JSON.stringify({manifest:sources.images},null,2));
console.log('Verified/reused 129 images from the approved Windows bundle; no source-site images fetched.');
