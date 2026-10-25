import {copyFile,mkdir,readdir,writeFile,rm,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';

const publicBuild=process.argv.includes('--public');
const artworkRelease=process.argv.includes('--with-artwork');
if(publicBuild&&artworkRelease)throw Error('Choose one artwork mode');
const renderer=path.resolve('dist/renderer');
const artwork=path.resolve('dist/renderer/assets');
if(path.dirname(artwork)!==renderer)throw Error('Unexpected artwork output path');
await mkdir(renderer,{recursive:true});
// Clear only the resolved generated artwork folder, preventing private art from surviving a public build.
await rm(artwork,{recursive:true,force:true});
await mkdir(artwork,{recursive:true});
for(const name of ['index.html','style.css','extras.css'])await copyFile('src/renderer/'+name,path.join(renderer,name));
const installed=publicBuild?[]:(await readdir('assets')).filter(name=>/^[a-z0-9-]+\.(png|webp)$/.test(name));
let manifest;
try{manifest=JSON.parse(await readFile('assets/private-provenance.json','utf8'));}catch(error){if(artworkRelease)throw Error('Artwork release needs the existing local images and provenance manifest. No images are downloaded.');}
const sources=[];
for(const name of installed){
 const bytes=await readFile(path.join('assets',name));
 const record=manifest?.manifest.find(row=>row.file===name);
 const sha256=createHash('sha256').update(bytes).digest('hex');
 if(artworkRelease&&(!record||record.sha256.toLowerCase()!==sha256))throw Error('Artwork provenance/hash mismatch: '+name);
 if(record)sources.push({name:record.name,file:name,kind:record.kind,sourcePage:record.sourcePage?.startsWith('https://')?record.sourcePage:'Owner-provided gameplay screenshot',imageURL:record.imageURL?.startsWith('https://')?record.imageURL:null,checked:record.checked,sha256,rights:'Third-party game artwork belongs to Activision/respective rights holders. All rights reserved; no affirmative artwork license established or downstream reuse rights granted by this app.'});
 await copyFile(path.join('assets',name),path.join(artwork,name));
}
if(artworkRelease&&installed.length!==manifest.manifest.length)throw Error('Artwork inventory differs from provenance manifest');
await writeFile(path.join(renderer,'asset-status.mjs'),'export const installedImageFiles = '+JSON.stringify(installed)+';\n');
await writeFile(path.join(renderer,'build-status.mjs'),'export const buildFlavor = '+JSON.stringify(publicBuild?'public':artworkRelease?'artwork':'private')+';\n');
await copyFile('THIRD-PARTY-ARTWORK.md','dist/THIRD-PARTY-ARTWORK.md');
await writeFile('dist/ARTWORK-SOURCES.json',JSON.stringify({mode:publicBuild?'no game art':artworkRelease?'artwork-inclusive prerelease':'private build',notice:'Attribution is not permission or endorsement. Third-party images are excluded from the MIT code license; no downstream artwork rights are granted.',images:sources},null,2)+'\n');
console.log(`${publicBuild?'Artwork-free':artworkRelease?'Artwork-inclusive release':'Private'} build: ${installed.length} optional game images; private provenance is never copied.`);
