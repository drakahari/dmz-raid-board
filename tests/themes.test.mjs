import test from 'node:test';
import assert from 'node:assert/strict';
import {themes,normalizeTheme,contrast,defaultTheme} from '../dist/renderer/themes.mjs';
import {sampleState,serialize,parseBackup} from '../dist/renderer/core.mjs';
test('original is default; exact DLMS collection has five legacy and 21 additional Omarchy choices',()=>{
 assert.equal(defaultTheme,'original');assert.equal(themes.length,27);assert.equal(new Set(themes.map(t=>t.id)).size,27);
 assert.equal(themes.filter(t=>t.group==='DLMS').length,5);assert.equal(themes.filter(t=>t.group.startsWith('Omarchy')).length,21);
 assert.equal(themes.filter(t=>t.id.includes('ethereal')).length,1);
 for(const value of [null,{},'<img src=x>', '__proto__','made-up','OMARCHY-NORD'])assert.equal(normalizeTheme(value),'original');
 assert.equal(normalizeTheme('purple-gold'),'purple-gold');
});
test('adapted theme tokens meet text and control contrast across every DMZ surface',()=>{
 for(const theme of themes.filter(t=>t.colors)){
  const c=theme.colors;for(const bg of [c.bg,c.panel,c.raised,c.selected]){
   assert(contrast(c.text,bg)>=7,theme.id+' main text');assert(contrast(c.muted,bg)>=5,theme.id+' muted');
   assert(contrast(c.accent,bg)>=4.5,theme.id+' accent');assert(contrast(c.border,bg)>=3,theme.id+' control border');
   assert(contrast(c.warning,bg)>=5,theme.id+' warning');
  }assert(contrast(c.onAccent,c.accent)>=4.5,theme.id+' button label');
 }
});
test('appearance does not mutate version-2 boards or their backups',()=>{
 const state=sampleState();state.adjustments.CPU=-3;state.picked.CPU=2;state.completed=['Detonators'];
 const before=serialize(state);for(const theme of themes)normalizeTheme(theme.id);
 assert.equal(serialize(state),before);assert.deepEqual(parseBackup(before),state);
 assert.deepEqual(Object.keys(JSON.parse(before)).sort(),['adjustments','completed','extras','hideCompleted','picked','selected','version']);
});
