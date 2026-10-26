import test from 'node:test';import assert from 'node:assert/strict';import path from 'node:path';
import {customProfilePath} from '../dist/main/data-path.cjs';
test('Windows packaged data remains beside the executable',()=>{assert.equal(customProfilePath('win32',true,undefined,'C:\\portable\\DMZ Raid Board.exe'),'C:\\portable\\data');});
test('Mac app bundle and Linux AppImage use Electron per-user defaults',()=>{for(const platform of ['darwin','linux'])assert.equal(customProfilePath(platform,true,undefined,platform==='darwin'?'/Volumes/Test/DMZ Raid Board.app/Contents/MacOS/DMZ Raid Board':'/tmp/.mount-test/dmz-raid-board'),undefined);});
test('explicit QA profile and unpackaged defaults remain compatible',()=>{assert.equal(customProfilePath('win32',true,'.qa/example','C:\\app.exe'),path.resolve('.qa/example'));assert.equal(customProfilePath('win32',false,undefined,'C:\\electron.exe'),undefined);});
