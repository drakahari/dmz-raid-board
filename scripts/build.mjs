import { copyFile, mkdir, cp, readdir, writeFile } from 'node:fs/promises';
await mkdir('dist/renderer', { recursive: true });
for (const name of ['index.html', 'style.css', 'extras.css']) await copyFile('src/renderer/'+name, 'dist/renderer/'+name);
await cp('assets', 'dist/renderer/assets', { recursive: true });
const installed=(await readdir('assets')).filter(name=>/^[a-z0-9-]+\.(png|webp)$/.test(name));
await writeFile('dist/renderer/asset-status.mjs','export const installedImageFiles = '+JSON.stringify(installed)+';\n');
