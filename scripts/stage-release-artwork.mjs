// Isolated verified staging, with no npm dependencies. Any draft write permission needs fresh owner approval.
import {mkdir,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
const repository='drakahari/dmz-raid-board',tag='v0.1.8';
const filename='DMZ-Raid-Board-0.1.8-win-x64-portable-with-artwork.zip';
const expected='bc6c8d3b6a35054c3a811830fe3adce90a3e15839a939504adb612c2f4f93361';
if(!process.env.GH_TOKEN)throw Error('Staging job token unavailable');
const api='https://api.github.com/repos/'+repository;
const headers={Authorization:'Bearer '+process.env.GH_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'dmz-release-staging'};
const metadata=await fetch(api+'/releases?per_page=100',{headers});if(!metadata.ok)throw Error('Release metadata HTTP '+metadata.status);
const release=(await metadata.json()).find(row=>row.tag_name===tag);
const asset=release?.assets.find(row=>row.name===filename&&row.state==='uploaded');
if(!asset||asset.digest!=='sha256:'+expected||!asset.url.startsWith(api+'/releases/assets/'))throw Error('Approved draft seed inventory mismatch');
let response=await fetch(asset.url,{headers:{...headers,Accept:'application/octet-stream'},redirect:'manual'});
if([301,302,303,307,308].includes(response.status)){
 const location=new URL(response.headers.get('location'));if(location.protocol!=='https:'||location.hostname!=='release-assets.githubusercontent.com')throw Error('Unexpected asset host');
 response=await fetch(location); // Do not forward repository token outside GitHub API.
}
if(!response.ok)throw Error('Seed asset HTTP '+response.status);
const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length!==165730893||createHash('sha256').update(bytes).digest('hex')!==expected)throw Error('Approved seed bytes mismatch');
await mkdir('.ci/staged',{recursive:true});await writeFile('.ci/staged/windows.zip',bytes);
console.log('Verified Windows seed staged for read-only native jobs.');
