import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogEntries,catalogMaterials,filterCatalog,getCatalogEntry,validateCatalogEntries} from '../dist/renderer/acquisition.mjs';
import {recipes} from '../dist/renderer/catalog.mjs';
import {catalogArtwork} from '../dist/renderer/artwork-data.mjs';
import {emptyState,sampleState,parseBackup,serialize,recipeTotals,raidTargets,chooseRecipe,chooseAcquisition,acquisitionQuantity,setBlueprintProgress,setWanted,setRaidTarget,addExtra,newRaid} from '../dist/renderer/core.mjs';

test('unified catalog preserves all existing stable printer IDs and validates factual references',()=>{
 validateCatalogEntries();
 assert.equal(catalogEntries.filter(entry=>entry.kind==='printer-recipe').length,recipes.length);
 assert.equal(catalogEntries.length,new Set(catalogEntries.map(entry=>entry.id)).size);
 for(const recipe of recipes){
  const entry=getCatalogEntry('printer:'+recipe.id);assert(entry);
  assert.equal(entry.routes[0].recipeId,recipe.id);assert.deepEqual(entry.routes[0].requirements,recipe.costs);
 }
 const entry=getCatalogEntry('printer:bandage');
 assert.throws(()=>validateCatalogEntries([entry,entry]),/Duplicate/);
 assert.throws(()=>validateCatalogEntries([{...entry,routes:[{...entry.routes[0],recipeId:'missing'}]}]),/reference/);
 assert.throws(()=>validateCatalogEntries([{...entry,routes:[{...entry.routes[0],requirements:{}}]}]),/null/);
});

test('credited artwork metadata identifies shared/promo references and keeps missing X01 pictures explicit',()=>{
 assert.equal(Object.keys(catalogArtwork).length,94);
 assert.equal(new Set(Object.values(catalogArtwork).map(image=>image.file)).size,44);
 for(const [id,image] of Object.entries(catalogArtwork)){
  assert(getCatalogEntry(id));assert.match(image.file,/^[a-z0-9-]+\.(png|webp)$/);
  assert(image.label&&image.credit&&image.sourcePage.startsWith('https://'));
  assert.match(image.rights,/No affirmative redistribution license/);
  assert.equal(getCatalogEntry(id).image,image.file);
 }
 const missing=catalogEntries.filter(entry=>entry.kind!=='printer-recipe'&&!entry.image);
 assert.equal(missing.length,15);assert(missing.every(entry=>entry.kind==='item'));
});

test('version-2 and version-1 backups migrate without losing existing plan and raid fields',()=>{
 const old={version:2,selected:{gunsmith:1,stash:1},adjustments:{CPU:-3},extras:{Chemicals:4},picked:{CPU:2},completed:['Power Regulator'],hideCompleted:true};
 const migrated=parseBackup(JSON.stringify(old));assert.equal(migrated.version,4);
 for(const field of ['selected','adjustments','extras','picked','completed','hideCompleted'])assert.deepEqual(migrated[field],old[field]);
 assert.deepEqual(migrated.blueprintProgress,{});assert.deepEqual(migrated.wanted,[]);assert.deepEqual(migrated.owned,[]);assert.deepEqual(migrated.acquisitionPlans,{});
 assert.deepEqual(raidTargets(migrated),{CPU:7,'Power Regulator':10,'Reactive Metals':20,Detonators:20,'Nylon Cloth':10,Chemicals:4});
 const v1=parseBackup(JSON.stringify({version:1,selected:{gunsmith:1},targets:{CPU:7,Chemicals:4},picked:{CPU:2},completed:['Power Regulator'],hideCompleted:true}));
 assert.equal(v1.adjustments.CPU,-3);assert.equal(v1.extras.Chemicals,4);assert.equal(v1.picked.CPU,2);assert.equal(v1.version,4);
});

test('found, unlocked and wanted are manual progress, independent from item pickups and planned requirements',()=>{
 let state=sampleState();state.picked.CPU=3;state.completed=['CPU'];
 const before=raidTargets(state);
 state=setBlueprintProgress(state,'printer:bandage','found');state=setWanted(state,'printer:bandage',true);
 assert.deepEqual(raidTargets(state),before);assert.equal(state.selected.bandage,undefined);assert.equal(state.picked.CPU,3);
 state=setBlueprintProgress(state,'printer:bandage','unlocked');assert.equal(state.blueprintProgress['printer:bandage'],'unlocked');
 state=chooseAcquisition(state,'printer:bandage','printer',2);
 assert.equal(state.selected.bandage,2);assert.equal(acquisitionQuantity(state,'printer:bandage'),2);assert.deepEqual(state.acquisitionPlans,{});
 const totals=recipeTotals(state);assert.equal(totals.Chemicals,30);assert.equal(totals.Synthetics,30);
 state=chooseRecipe(state,'bandage',2);assert.deepEqual(recipeTotals(state),totals,'old and new catalog use one shared selection');
 const reset=newRaid(state);assert.deepEqual(reset.blueprintProgress,state.blueprintProgress);assert.deepEqual(reset.wanted,state.wanted);assert.deepEqual(reset.selected,state.selected);assert.deepEqual(reset.picked,{});
 state=setBlueprintProgress(state,'printer:bandage','not-found');assert.equal(state.blueprintProgress['printer:bandage'],undefined);assert.equal(state.selected.bandage,2);
 state=setWanted(state,'printer:bandage',false);assert.deepEqual(state.wanted,[]);
 assert.deepEqual(parseBackup(serialize(state)),state);
});

test('catalog filters search ingredients and distinguish blueprint kind, season and manual progress',()=>{
 let state=emptyState();state=setWanted(state,'printer:bandage',true);state=setBlueprintProgress(state,'printer:bandage','found');
 assert.deepEqual(filterCatalog({wantedOnly:true},state).map(entry=>entry.id),['printer:bandage']);
 assert.deepEqual(filterCatalog({progress:'found'},state).map(entry=>entry.id),['printer:bandage']);
 assert(filterCatalog({search:'Synthetics',method:'printer'}).some(entry=>entry.id==='printer:bandage'));
 for(const entry of filterCatalog({season:'season-1',kind:'cosmetic-blueprint'}))assert.equal(entry.kind,'cosmetic-blueprint');
 assert(!filterCatalog({progress:'not-found'},state).some(entry=>entry.id==='printer:bandage'));
 assert(!filterCatalog({search:'nonexistent catalog search string'}).length);
});

test('unverified acquisition costs cannot be selected; physical loot can be a manual extra',()=>{
 const unknown=catalogEntries.find(entry=>entry.kind!=='printer-recipe'&&entry.routes.some(route=>route.requirements===null));assert(unknown);
 const route=unknown.routes.find(route=>route.requirements===null);
 assert.throws(()=>chooseAcquisition(emptyState(),unknown.id,route.id,1),/no verified planning requirements/);
 const loot=catalogEntries.find(entry=>entry.isLoot);assert(loot);assert(catalogMaterials.includes(loot.name));
 assert.equal(raidTargets(addExtra(emptyState(),loot.name,2))[loot.name],2);
 const item=catalogEntries.find(entry=>entry.kind==='item');if(item)assert.throws(()=>setBlueprintProgress(emptyState(),item.id,'found'),/supported/);
});

// Explicit test fixtures exercise route mechanics without inventing production game recipes.
const fixture={id:'test-fixture-only',name:'Synthetic test fixture',category:'Fixture',kind:'item',season:'preseason',description:'Not game content',checked:'2026-11-06',status:'Test fixture only',sources:[{url:'https://example.invalid/fixture',checked:'2026-11-06'}],routes:[
 {id:'craft',method:'printer',label:'Fixture route A',requirements:{CPU:2,Chemicals:5}},
 {id:'barter',method:'vendor',label:'Fixture route B',requirements:{CPU:1,'Comms Module':3}},
 {id:'unknown',method:'unknown',label:'Fixture unknown costs',requirements:null}
]};
function withFixture(action){catalogEntries.push(fixture);try{return action();}finally{catalogEntries.splice(catalogEntries.indexOf(fixture),1);}}

test('one alternative route aggregates shared requirements once and switches without changing pickup/progress',()=>withFixture(()=>{
 let state=sampleState();state.picked.CPU=2;state.completed=['CPU'];state=setWanted(state,fixture.id,true);
 state=chooseAcquisition(state,fixture.id,'craft',3);
 assert.equal(recipeTotals(state).CPU,16);assert.equal(recipeTotals(state).Chemicals,15);
 assert.equal(acquisitionQuantity(state,fixture.id,'craft'),3);assert.equal(acquisitionQuantity(state,fixture.id,'barter'),0);
 assert.equal(state.picked.CPU,2);assert.deepEqual(state.completed,[],'checks apply to the old target');
 state=chooseAcquisition(state,fixture.id,'barter',2);
 assert.equal(recipeTotals(state).CPU,12);assert.equal(recipeTotals(state)['Comms Module'],6);assert.equal(recipeTotals(state).Chemicals,undefined);
 assert.equal(Object.keys(state.acquisitionPlans).length,1);assert.equal(acquisitionQuantity(state,fixture.id),2);
 assert.deepEqual(parseBackup(serialize(state)),state);
 assert.throws(()=>chooseAcquisition(state,fixture.id,'unknown',1),/no verified/);
 state=setRaidTarget(state,'CPU',0);state=chooseAcquisition(state,fixture.id,'barter',3);assert.equal(raidTargets(state).CPU,13,'adding incoming requirements clears stale zero override');
 state=chooseAcquisition(state,fixture.id,'barter',0);assert.deepEqual(state.acquisitionPlans,{});assert.equal(recipeTotals(state).CPU,10);assert.deepEqual(state.wanted,[fixture.id]);
}));

test('new backup fields reject unknown IDs, duplicates, malformed routes, double printer plans and invalid counts',()=>withFixture(()=>{
 const base=emptyState();
 for(const patch of [
  {blueprintProgress:{'missing':'found'}},{blueprintProgress:{'printer:bandage':'owned'}},{blueprintProgress:[]},
  {wanted:['printer:bandage','printer:bandage']},{wanted:['missing']},{acquisitionPlans:[]},
  {acquisitionPlans:{[fixture.id]:{routeId:'missing',quantity:1}}},
  {acquisitionPlans:{[fixture.id]:{routeId:'unknown',quantity:1}}},
  {acquisitionPlans:{[fixture.id]:{routeId:'craft',quantity:0}}},
  {acquisitionPlans:{[fixture.id]:{routeId:'craft',quantity:100}}},
  {acquisitionPlans:{[fixture.id]:{routeId:'craft',quantity:1.5}}},
  {acquisitionPlans:{[fixture.id]:{routeId:'craft',quantity:1,extra:true}}},
  {acquisitionPlans:{'printer:bandage':{routeId:'printer',quantity:1}}}
 ])assert.throws(()=>parseBackup(JSON.stringify({...base,...patch})),JSON.stringify(patch));
 assert.throws(()=>parseBackup(JSON.stringify(base).replace('"blueprintProgress":{}','"blueprintProgress":{"__proto__":"found"}')));
 assert.throws(()=>chooseAcquisition(base,fixture.id,'craft',NaN));assert.throws(()=>chooseAcquisition(base,fixture.id,'craft',-1));
 assert.throws(()=>chooseAcquisition(base,'missing','craft',1));assert.throws(()=>setWanted(base,'missing',true));
}));

test('route aggregation rejects final target overflow without mutating the existing board',()=>withFixture(()=>{
 const state=addExtra(emptyState(),'CPU',100_000_000);const before=serialize(state);
 assert.throws(()=>chooseAcquisition(state,fixture.id,'craft',1),/Counts must/);
 assert.equal(serialize(state),before);
 assert.throws(()=>parseBackup(JSON.stringify({...state,acquisitionPlans:{[fixture.id]:{routeId:'craft',quantity:1}}})),/Counts must/);
}));
