import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogEntries,filterCatalog,getCatalogEntry} from '../dist/renderer/acquisition.mjs';
import {emptyState,sampleState,parseBackup,serialize,recipeTotals,raidTargets,newRaid,setRaidTarget,setBlueprintProgress,setItemStatus,getItemStatus,setWanted,setWantedBulk,wantedRaidItems,chooseAcquisition} from '../dist/renderer/core.mjs';

const vestId='printer:3-plate-ballistic-gel-vest';
const planFields=['selected','adjustments','extras','picked','completed','hideCompleted','blueprintProgress','acquisitionPlans'];
const planSnapshot=state=>Object.fromEntries(planFields.map(field=>[field,structuredClone(state[field])]));

test('Want it places the chosen finished vest in the raid wishlist without selecting its recipe or ingredients',()=>{
 const vest=getCatalogEntry(vestId);assert(vest);
 const initial=emptyState(),before=planSnapshot(initial);
 const wanted=setItemStatus(initial,vestId,'want');
 assert.equal(getItemStatus(wanted,vestId),'want');assert.deepEqual(planSnapshot(wanted),before);
 assert.deepEqual(recipeTotals(wanted),{});assert.deepEqual(raidTargets(wanted),{});
 const cards=wantedRaidItems(wanted);assert.equal(cards.length,1);assert.equal(cards[0].entry.id,vestId);
 assert.deepEqual(cards[0].ids,[vestId]);assert.equal(cards[0].materialName,undefined);
 assert.deepEqual(initial.wanted,[],'the original board remains unchanged');
});

test('Have, Want and Neither transitions remain exclusive, repeated choices deduplicate and legacy recipe notes remain separate',()=>{
 let state=setBlueprintProgress(sampleState(),vestId,'unlocked');
 state.picked.CPU=3;state.completed=['Power Regulator'];state.hideCompleted=true;
 state=setRaidTarget(state,'CPU',7);const before=planSnapshot(state);
 assert.equal(getItemStatus(state,vestId),'neither','unlocked is not finished item ownership');
 for(const status of ['have','have','want','want','have','neither','neither','want']){
  state=setItemStatus(state,vestId,status);assert.equal(getItemStatus(state,vestId),status);
  assert.equal(state.owned.includes(vestId),status==='have');assert.equal(state.wanted.includes(vestId),status==='want');
  assert.equal(state.owned.filter(id=>id===vestId).length,status==='have'?1:0);
  assert.equal(state.wanted.filter(id=>id===vestId).length,status==='want'?1:0);
  assert.deepEqual(planSnapshot(state),before);
 }
 state=setItemStatus(state,vestId,'have');assert.equal(wantedRaidItems(state).length,0);
 state=setWanted(state,vestId,false);assert.equal(getItemStatus(state,vestId),'have','legacy remove-want does not erase Have');
 state=setWanted(state,vestId,true);assert.equal(getItemStatus(state,vestId),'want','legacy add-want preserves exclusivity');
 assert.deepEqual(parseBackup(serialize(state)),state);
 const reset=newRaid(state);assert.deepEqual(reset.wanted,state.wanted);assert.deepEqual(reset.owned,state.owned);assert.deepEqual(reset.blueprintProgress,state.blueprintProgress);
});

test('version-3 migration preserves existing wants, notes, plans and counts without inferring Have',()=>{
 let original=setItemStatus(sampleState(),vestId,'want');
 original=setBlueprintProgress(original,vestId,'unlocked');original=setBlueprintProgress(original,'printer:bandage','found');
 original.picked.CPU=4;original.completed=['Power Regulator'];original.hideCompleted=true;
 original=setRaidTarget(original,'CPU',6);
 const {owned,...legacy}=original;legacy.version=3;
 const migrated=parseBackup(JSON.stringify(legacy));assert.equal(migrated.version,4);assert.deepEqual(migrated.owned,[]);
 for(const [field,value] of Object.entries(legacy))if(field!=='version')assert.deepEqual(migrated[field],value,field);
 assert.equal(getItemStatus(migrated,vestId),'want');assert.equal(getItemStatus(migrated,'printer:bandage'),'neither');
 assert.equal(migrated.blueprintProgress[vestId],'unlocked');assert.deepEqual(raidTargets(migrated),raidTargets(original));
 assert.deepEqual(parseBackup(serialize(migrated)),migrated);
});

test('status filters show Have, Want and Neither independently of legacy blueprint discovery',()=>{
 let state=setItemStatus(emptyState(),vestId,'want');state=setItemStatus(state,'printer:bandage','have');
 state=setBlueprintProgress(state,'printer:medkit','unlocked');
 assert.deepEqual(filterCatalog({status:'want'},state).map(entry=>entry.id),[vestId]);
 assert.deepEqual(filterCatalog({status:'have'},state).map(entry=>entry.id),['printer:bandage']);
 const neither=filterCatalog({status:'neither'},state).map(entry=>entry.id);
 assert(neither.includes('printer:medkit'));assert(!neither.includes(vestId));assert(!neither.includes('printer:bandage'));
 assert.equal(filterCatalog({status:'all'},state).length,catalogEntries.length);
 assert.deepEqual(filterCatalog({status:'want',category:'Plate Carriers'},state).map(entry=>entry.id),[vestId]);
});

const fixtureBase={category:'Test fixtures only',kind:'item',season:'preseason',description:'Synthetic fixture, not game content',checked:'2026-11-06',status:'Test only',sources:[{url:'https://example.invalid/test-fixture',checked:'2026-11-06'}]};
const duplicates=[
 {...fixtureBase,id:'test-wishlist-case-a',name:' Reactive Metals ',routes:[{id:'unknown',method:'unknown',label:'Test',requirements:null}]},
 {...fixtureBase,id:'test-wishlist-case-b',name:'reactive metals',routes:[{id:'unknown',method:'unknown',label:'Test',requirements:null}]}
];
const legacyPlan={...fixtureBase,id:'test-legacy-plan',name:'Synthetic legacy plan',routes:[{id:'craft',method:'printer',label:'Test',requirements:{CPU:2}}]};
function withFixtures(action){const start=catalogEntries.length;catalogEntries.push(...duplicates,legacyPlan);try{return action();}finally{catalogEntries.splice(start);}}

test('wishlist outputs group by normalized name and match existing canonical material cards even when completed or hidden',()=>withFixtures(()=>{
 let state=sampleState();state=setItemStatus(state,duplicates[1].id,'want');state=setItemStatus(state,duplicates[0].id,'want');
 state.hideCompleted=true;state.completed=['Reactive Metals'];state.picked['Reactive Metals']=20;
 const before=raidTargets(state),groups=wantedRaidItems(state);
 assert.equal(groups.length,1);assert.deepEqual(groups[0].ids,duplicates.map(entry=>entry.id));
 assert.equal(groups[0].entry.id,duplicates[0].id);assert.equal(groups[0].materialName,'Reactive Metals');
 assert.deepEqual(raidTargets(state),before);assert.equal(before['Reactive Metals'],20);
 for(const id of groups[0].ids)state=setItemStatus(state,id,'have');
 assert.equal(wantedRaidItems(state).length,0);assert.deepEqual(raidTargets(state),before);
 assert.equal(state.picked['Reactive Metals'],20);assert.deepEqual(state.completed,['Reactive Metals']);
}));

test('existing acquisition plans survive item-status changes and v3 migration without adding or discarding requirements',()=>withFixtures(()=>{
 let state=chooseAcquisition(sampleState(),legacyPlan.id,'craft',2);state.picked.CPU=1;
 const before=planSnapshot(state),targets=raidTargets(state);
 state=setItemStatus(state,vestId,'want');state=setItemStatus(state,legacyPlan.id,'have');
 assert.deepEqual(planSnapshot(state),before);assert.deepEqual(raidTargets(state),targets);
 assert.equal(targets.CPU,14);
 const {owned,...legacy}=state;legacy.version=3;
 const migrated=parseBackup(JSON.stringify(legacy));assert.deepEqual(migrated.acquisitionPlans,state.acquisitionPlans);
 assert.deepEqual(raidTargets(migrated),targets);assert.deepEqual(migrated.owned,[]);
}));

test('version-4 backup validation rejects duplicate, conflicting, malformed and unknown item statuses',()=>{
 const base=emptyState();
 for(const patch of [
  {owned:[vestId,vestId]},{owned:['missing']},{owned:'not-an-array'},
  {wanted:[vestId,vestId]},{wanted:['missing']},{wanted:[vestId],owned:[vestId]},
  {owned:[null]},{owned:['__proto__']},{owned:undefined}
 ])assert.throws(()=>parseBackup(JSON.stringify({...base,...patch})),JSON.stringify(patch));
 assert.throws(()=>setItemStatus(base,'missing','want'));assert.throws(()=>setItemStatus(base,vestId,'unlocked'));
 assert.throws(()=>getItemStatus(base,'missing'));
 const {owned,...old}=base;assert.throws(()=>parseBackup(JSON.stringify({...old,version:3,owned:[vestId]})),/unsupported fields/);
});

test('bulk select and unselect preserve Have it choices, unrelated wants and all existing plan fields',()=>{
 let state=setItemStatus(sampleState(),vestId,'have');state=setItemStatus(state,'printer:bandage','want');
 state=setItemStatus(state,'printer:medkit','want');state=setBlueprintProgress(state,vestId,'unlocked');
 state.picked.CPU=2;state.completed=['Power Regulator'];state.hideCompleted=true;
 state=setRaidTarget(state,'CPU',7);
 const initial=serialize(state),before=planSnapshot(state),owned=state.owned;
 const scope=[vestId,'printer:bandage','printer:print-biomaterials'];
 const selected=setWantedBulk(state,scope,true);
 assert.deepEqual(selected.wanted,['printer:bandage','printer:medkit','printer:print-biomaterials']);
 assert.strictEqual(selected.owned,owned);assert.deepEqual(planSnapshot(selected),before);
 assert.equal(getItemStatus(selected,vestId),'have');assert.equal(serialize(state),initial);
 assert.strictEqual(setWantedBulk(selected,scope,true),selected,'repeated bulk selection is idempotent');
 const cleared=setWantedBulk(selected,scope,false);
 assert.deepEqual(cleared.wanted,['printer:medkit']);assert.strictEqual(cleared.owned,owned);
 assert.deepEqual(planSnapshot(cleared),before);assert.equal(getItemStatus(cleared,vestId),'have');
 assert.deepEqual(parseBackup(serialize(cleared)),cleared);
});

test('bulk operations use only the supplied filtered scope, deduplicate IDs and validate everything before changing state',()=>{
 const state=setItemStatus(emptyState(),'printer:bandage','want'),before=serialize(state);
 const filtered=filterCatalog({category:'Plate Carriers'},state).map(entry=>entry.id);assert(filtered.includes(vestId));
 const selected=setWantedBulk(state,[...filtered,...filtered],true);
 assert.deepEqual(new Set(selected.wanted),new Set(['printer:bandage',...filtered]));
 assert.equal(selected.wanted.length,new Set(selected.wanted).size);assert.equal(serialize(state),before);
 assert.deepEqual(parseBackup(serialize(selected)),selected);
 const cleared=setWantedBulk(selected,[vestId,vestId],false);
 assert(!cleared.wanted.includes(vestId));assert(cleared.wanted.includes('printer:bandage'));
 for(const id of filtered.filter(id=>id!==vestId))assert(cleared.wanted.includes(id));
 assert.strictEqual(setWantedBulk(state,[],true),state);assert.strictEqual(setWantedBulk(state,[],false),state);
 for(const ids of [[vestId,'missing'],['missing',vestId],[vestId,null],[vestId,'__proto__'],Array(1),null])assert.throws(()=>setWantedBulk(state,ids,true));
 assert.throws(()=>setWantedBulk(state,[vestId],'yes'));assert.equal(serialize(state),before,'invalid bulk input leaves the original board unchanged');
});
