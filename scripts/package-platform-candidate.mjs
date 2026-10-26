import {execFileSync} from 'node:child_process';import {readdir} from 'node:fs/promises';
if(!['darwin','linux'].includes(process.platform))throw Error('Use a native macOS/Linux runner');
if(process.arch!==process.env.CANDIDATE_ARCH)throw Error('Runner/candidate architecture mismatch');
const flags=process.platform==='darwin'?['--mac','zip','dmg','--'+process.arch]:['--linux','AppImage','--x64'];
execFileSync(process.execPath,['node_modules/electron-builder/cli.js','--config','platform-candidates.cjs','--publish','never',...flags],{stdio:'inherit'});
if(process.platform==='darwin')for(const file of await readdir('release/platform-candidates'))if(file.endsWith('.dmg'))execFileSync('hdiutil',['verify','release/platform-candidates/'+file],{stdio:'inherit'});
