import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {recipes,materials} from '../dist/renderer/catalog.mjs';
import {catalogData} from '../dist/renderer/catalog-data.mjs';
import {catalogEntries,catalogMaterials,getCatalogEntry,filterCatalog} from '../dist/renderer/acquisition.mjs';
import {fieldUpgradeData} from '../dist/renderer/field-upgrade-data.mjs';
import {fieldBoxArtwork,renderFieldBoxCrop} from '../dist/renderer/field-box-artwork.mjs';
import {emptyState,chooseRecipe,raidTargets,recipeTotals,setItemStatus,wantedRaidItems,parseBackup,serialize,addExtra,newRaid} from '../dist/renderer/core.mjs';
const ids=['consumable-box','medical-box','hazmat-box','utility-box','survivor-box'];
const unresolved=ids.slice(0,4);
test('five exact owner-observed names are added once to Field Upgrades while the original 120 records remain unchanged',()=>{
 assert.deepEqual(fieldUpgradeData.map(row=>row.id),ids);
 assert.equal(catalogData.length,120);assert.equal(recipes.length,125);assert.equal(recipes.filter(row=>row.category==='Field Upgrades').length,21);
 for(const row of catalogData){const current=recipes.find(recipe=>recipe.id===row.id);assert(current);for(const [key,value] of Object.entries(row))if(key!=='image')assert.deepEqual(current[key],value,row.id+':'+key);}
 for(const id of ids){const record=recipes.find(row=>row.id===id);assert.equal(record.category,'Field Upgrades');assert.equal(recipes.filter(row=>row.name===record.name).length,1);assert.match(record.nameVerification.evidence,/labels and icons only/);assert.equal(record.ownerVerification,undefined);assert(getCatalogEntry('printer:'+id));}
 for(const id of ['revive-pistol','fulton-drop-marker']){assert(!fieldUpgradeData.some(row=>row.id===id));assert.equal(recipes.filter(row=>row.id===id).length,1);assert.deepEqual(recipes.find(row=>row.id===id).costs,catalogData.find(row=>row.id===id).costs);}
});
test('four unresolved boxes stay non-craftable rather than inventing costs, while Have/Want remains available',()=>{
 let state=emptyState();
 for(const id of unresolved){const recipe=recipes.find(row=>row.id===id);assert.equal(recipe.costs,null);assert.equal(recipe.reportedCosts,null);assert.throws(()=>chooseRecipe(state,id,1),/unconfirmed/);state=setItemStatus(state,'printer:'+id,'want');}
 assert.deepEqual(recipeTotals(state),{});assert.deepEqual(raidTargets(state),{});assert.equal(wantedRaidItems(state).length,4);
 assert.equal(filterCatalog({category:'Field Upgrades',status:'want'},state).length,4);assert.equal(getCatalogEntry('printer:utility-box').season,'unknown');
 assert.match(getCatalogEntry('printer:consumable-box').routes[0].unlock,/X01 Orders page 2/);assert.match(getCatalogEntry('printer:hazmat-box').routes[0].unlock,/X01 Orders page 3/);
});
test('Survivor Box uses cross-checked X01 ingredients with correct repeat quantities and no automatic ingredient expansion',()=>{
 const recipe=recipes.find(row=>row.id==='survivor-box');assert.deepEqual(recipe.costs,{'SR-16 Bio Agent Sample':1,'Ballistic Fabric':2,'High-Tenacity Fibers':3});
 assert.equal(recipe.sources.length,2);assert.match(recipe.printerLocation,/X01.*E5/);assert.equal(getCatalogEntry('printer:survivor-box').routes[0].location,recipe.printerLocation);assert.equal(getCatalogEntry('printer:survivor-box').season,'season-1');
 let state=chooseRecipe(emptyState(),'survivor-box',2);assert.deepEqual(raidTargets(state),{'SR-16 Bio Agent Sample':2,'Ballistic Fabric':4,'High-Tenacity Fibers':6});assert.equal(recipeTotals(state).Synthetics,undefined);
 state=addExtra(state,'SR-16 Bio Agent Sample',3);assert.equal(raidTargets(state)['SR-16 Bio Agent Sample'],5);assert(materials.includes('SR-16 Bio Agent Sample'));
 state.picked['SR-16 Bio Agent Sample']=1;state=setItemStatus(state,'printer:survivor-box','want');const before=raidTargets(state);state=setItemStatus(state,'printer:survivor-box','have');assert.deepEqual(raidTargets(state),before);assert.equal(state.picked['SR-16 Bio Agent Sample'],1);
 assert.deepEqual(parseBackup(serialize(state)),state);assert.deepEqual(raidTargets(newRaid(state)),before);
});
test('existing version-4 state retains all prior fields and the new stable IDs survive backup round trips',()=>{
 const old={version:4,selected:{gunsmith:1},adjustments:{CPU:-2},extras:{Detonators:2},picked:{CPU:3},completed:['Power Regulator'],hideCompleted:true,blueprintProgress:{'printer:bandage':'found'},wanted:['printer:print-comms'],owned:['blueprint-cobweb'],acquisitionPlans:{}};
 const state=parseBackup(JSON.stringify(old));assert.deepEqual(state,old);const next=setItemStatus(chooseRecipe(state,'survivor-box',3),'printer:medical-box','want');
 assert.deepEqual(parseBackup(serialize(next)),next);for(const field of ['adjustments','extras','picked','completed','hideCompleted','blueprintProgress','owned','acquisitionPlans'])assert.deepEqual(next[field],old[field],field);
});
test('physical boxes can be added as explicit extras independently from same-name wanted recipes',()=>{
 for(const id of ids){const recipe=recipes.find(row=>row.id===id);assert(catalogMaterials.includes(recipe.name));let state=addExtra(emptyState(),recipe.name,2);state=setItemStatus(state,'printer:'+id,'want');assert.equal(raidTargets(state)[recipe.name],2);assert.equal(wantedRaidItems(state).find(group=>group.entry.id==='printer:'+id).materialName,undefined);state=setItemStatus(state,'printer:'+id,'have');assert.equal(raidTargets(state)[recipe.name],2);assert.deepEqual(state.selected,{});assert.deepEqual(parseBackup(serialize(state)),state);}
});
test('owner screenshot remains byte-identical; five bounded icon-only viewports exclude the two excluded rows and inventory counters',async()=>{
 const bytes=await readFile('assets/field-upgrade-boxes-owner-screenshot.png');assert.equal(createHash('sha256').update(bytes).digest('hex'),'31605305862f77ac46b70a0c2217c1d9cfb83aef1ed442a266e6580f8ac46747');assert.equal(bytes.readUInt32BE(16),613);assert.equal(bytes.readUInt32BE(20),961);
 assert.deepEqual(Object.keys(fieldBoxArtwork).sort(),ids.map(id=>'printer:'+id).sort());
 for(const id of ids){const image=fieldBoxArtwork['printer:'+id];assert.equal(image.file,'field-upgrade-boxes-owner-screenshot.png');const c=image.crop;assert(c.x>=82&&c.x+c.width<=144);assert(c.y>=0&&c.y+c.height<=961);assert(c.y+c.height<404||c.y>655);assert.match(renderFieldBoxCrop(image,id),/<svg/);assert.match(renderFieldBoxCrop(image,id),/viewBox=/);assert.deepEqual(getCatalogEntry('printer:'+id).imageCrop,c);}
});
