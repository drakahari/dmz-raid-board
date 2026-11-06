// Build a local candidate without overwriting an older release or publishing it.
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
const {version}=JSON.parse(await readFile('package.json','utf8'));
const mode=process.argv.includes('--public')?'public':process.argv.includes('--with-artwork')?'artwork':'private';
const output=`release/${version}-${mode}-local`;
execFileSync(process.execPath,['node_modules/typescript/bin/tsc','-p','tsconfig.json'],{stdio:'inherit'});
execFileSync(process.execPath,['scripts/build.mjs',...(mode==='public'?['--public']:mode==='artwork'?['--with-artwork']:[])],{stdio:'inherit'});
execFileSync(process.execPath,['node_modules/electron-builder/cli.js','--win','zip','--x64','--publish','never',
 `--config.directories.output=${output}`,`--config.win.artifactName=DMZ-Raid-Board-${version}-win-x64-${mode}-local.zip`],{stdio:'inherit'});
