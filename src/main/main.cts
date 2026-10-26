import { app, BrowserWindow, session } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import {customProfilePath} from './data-path.cjs';

if(process.platform==='win32')app.setAppUserModelId('private.dmz.raidboard');

// Testing and portable runs can use an isolated data directory. No owner data is used by tests.
const profileIndex = process.argv.indexOf('--profile-dir');
const requestedProfile=profileIndex>=0?process.argv[profileIndex+1]:undefined;
const profile=customProfilePath(process.platform,app.isPackaged,requestedProfile,app.getPath('exe'));
if (profile) {
  // This ZIP candidate keeps its data beside the executable, without an installer/profile prompt.

  fs.mkdirSync(path.join(profile,'downloads'),{recursive:true});
  app.setPath('userData', profile);
  app.setPath('downloads',path.join(profile,'downloads'));
}
if (!app.requestSingleInstanceLock()) app.quit();
let mainWindow: BrowserWindow | undefined;
function createWindow() {
  mainWindow = new BrowserWindow({
    icon: path.join(__dirname,'../app-icon.png'),
    title: 'DMZ Raid Board', width: 1320, height: 920, minWidth: 760, minHeight: 600,
    backgroundColor: '#121813', autoHideMenuBar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true }
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', event => event.preventDefault());
  mainWindow.webContents.on('will-attach-webview', event => event.preventDefault());
  // No remote resources, external links, permissions or IPC are needed.
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
}
app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    callback({ cancel: !/^(file:|blob:|devtools:)/.test(details.url) });
  });
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('second-instance', () => { mainWindow?.show(); mainWindow?.focus(); });
app.on('window-all-closed', () => app.quit());
