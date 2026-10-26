import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,sampleState,chooseRecipe,recipeTotals,raidTargets,plannedProduction,newRaid,isComplete,serialize,parseBackup,count,setRaidTarget,addExtra,removeExtra,resetAdjustments} from '../dist/renderer/core.mjs';
import {recipes,materials,categories} from '../dist/renderer/catalog.mjs';
import {sortedNames,compareNames} from '../dist/renderer/ordering.mjs';
test('all 95 published crafting recipes and 25 evidenced upgrade tiers have dated sources',()=>{
 assert.equal(recipes.filter(r=>r.category!=='Upgrades').length,95);assert.equal(recipes.filter(r=>r.category==='Upgrades').length,25);
 assert.equal(recipes.length,new Set(recipes.map(r=>r.id)).size);
 assert.equal(recipes.filter(r=>r.costs).length,113);assert.equal(recipes.filter(r=>!r.costs).length,7);
 for(const category of categories)assert(recipes.some(r=>r.category===category&&r.costs),category);
 const allowed=new Set(materials);
 for(const recipe of recipes){assert.equal(recipe.checked,recipe.ownerVerification?.date||'2026-10-25');assert(recipe.sources?.length);assert(recipe.sources.every(s=>s.url.startsWith('https://')&&s.checked));
  for(const [name,n] of Object.entries(recipe.reportedCosts||recipe.costs||{})){assert(allowed.has(name),name);assert(Number.isSafeInteger(n)&&n>0);}
  if(recipe.category!=='Upgrades')assert.equal(recipe.sources.length,2);
 }
});
test('14 ingredient prints are explicit plans; no automatic recipe expansion or double-counted output',()=>{
 assert.equal(recipes.filter(r=>r.category==='Ingredients').length,14);
 let s=chooseRecipe(emptyState(),'medkit',1);
 assert.equal(recipeTotals(s).Biomaterials,5);assert.equal(recipeTotals(s).Synthetics,undefined);
 s=chooseRecipe(s,'print-biomaterials',5);
 assert.deepEqual(plannedProduction(s),{Biomaterials:5});assert.equal(recipeTotals(s).Biomaterials,undefined);
 assert.equal(recipeTotals(s).Chemicals,130);assert.equal(recipeTotals(s).Synthetics,100);
 assert.equal(s.selected['uncommon-printing'],undefined);
 s=setRaidTarget(s,'Biomaterials',2);assert.equal(raidTargets(s).Biomaterials,2);
 const solo=chooseRecipe(emptyState(),'print-comms',2);assert.equal(recipeTotals(solo).Electronics,200);assert.equal(recipeTotals(solo).CPU,6);assert.equal(recipeTotals(solo)['Comms Module'],undefined);
});
test('all upgrade families enforce one selected tier and partial/conflicting costs stay disabled',()=>{
 let s=chooseRecipe(sampleState(),'gunsmith-2',1);assert.equal(s.selected.gunsmith,undefined);assert.equal(s.selected['gunsmith-2'],1);
 s=chooseRecipe(s,'stash-1',1);assert.equal(s.selected.stash,undefined);
 for(const id of ['stash-4','stash-weapon-3','mia-4','vendor-1','vendor-2','radiation-blockers','ddos'])assert.throws(()=>chooseRecipe(s,id,1));
 assert.throws(()=>parseBackup(JSON.stringify({...emptyState(),selected:{gunsmith:1,'gunsmith-2':1}})));
});
test('natural case-insensitive A–Z ordering has stable ties and does not mutate counts or IDs',()=>{
 const values=['Power Regulator','CPU','comms Module','Biomaterials','Item 10','Item 2','cpu'];const copy=[...values];
 assert.deepEqual(sortedNames(values),['Biomaterials','comms Module','CPU','cpu','Item 2','Item 10','Power Regulator']);assert.deepEqual(values,copy);
 assert.deepEqual(materials,sortedNames(materials));assert(compareNames('Item 2','Item 10')<0);
 const s=sampleState();s.picked.CPU=3;Object.assign(s,setRaidTarget(s,'CPU',7));s.hideCompleted=true;const before=serialize(s);sortedNames(Object.keys(raidTargets(s)));assert.equal(serialize(s),before);
});
test('approved starter sample retains shared power regulator and five pictured targets',()=>{
 const s=sampleState();assert.equal(raidTargets(s)['Power Regulator'],10);
 assert.equal(Object.keys(raidTargets(s)).length,5);assert.equal(recipeTotals(s)['DMZ Cash'],100000);
 assert.equal(raidTargets(chooseRecipe(s,'stash',0))['Power Regulator'],5);
 assert.equal(raidTargets(chooseRecipe(s,'stash',0)).Detonators,undefined);
});
test('permanent tiers are single goals; bank tiers replace each other',()=>{
 const s=emptyState();assert.throws(()=>chooseRecipe(s,'gunsmith',2));
 const selected=chooseRecipe(chooseRecipe(s,'bank-1',1),'bank-3',1);
 assert.deepEqual(selected.selected,{'bank-3':1});assert.equal(recipeTotals(selected)['DMZ Cash'],100000);
 assert.throws(()=>parseBackup(JSON.stringify({...s,selected:{'bank-1':1,'bank-2':1}})));
});
test('shared ingredients are summed once across recipes and quantities',()=>{
 const s=emptyState(); s.selected={'bandage':2,'smoke':3,'medkit':1};
 assert.deepEqual(recipeTotals(s),{'Synthetics':60,'Chemicals':90,'Binding Catalyst':1,'Biomaterials':5});
 assert.equal(Object.keys(recipeTotals(s)).filter(k=>k==='Chemicals').length,1);
});
test('target adjustments set raid amounts without changing recipe quantities',()=>{
 let s=emptyState();s.selected.bandage=2;s=setRaidTarget(s,'Chemicals',7);
 assert.equal(raidTargets(s).Chemicals,7);assert.equal(recipeTotals(s).Chemicals,30);
});
test('new raid clears only per-raid counts/completion',()=>{
 let s=emptyState();s.selected.bandage=2;s=setRaidTarget(s,'Chemicals',7);s.picked.Chemicals=5;s.completed=['Synthetics'];s.hideCompleted=true;
 const result=newRaid(s);assert.deepEqual(result.picked,{});assert.deepEqual(result.completed,[]);
 assert.deepEqual(result.selected,s.selected);assert.deepEqual(result.adjustments,s.adjustments);assert.deepEqual(result.extras,s.extras);assert.equal(result.hideCompleted,true);
 assert.equal(s.picked.Chemicals,5);
});
test('completion can be picked quantity or explicit raid check',()=>{
 const s=emptyState();s.picked.Chemicals=5;assert.equal(isComplete(s,'Chemicals',10),false);
 s.completed=['Chemicals'];assert.equal(isComplete(s,'Chemicals',10),true);
 s.completed=[];assert.equal(isComplete(s,'Chemicals',5),true);
});
test('backup round trip retains selected recipes, adjustments, extras, pickup counts and settings',()=>{
 const s=emptyState();s.selected['bank-3']=1;s.extras['DMZ Cash']=2000;s.picked['DMZ Cash']=100;s.completed=['DMZ Cash'];
 assert.deepEqual(parseBackup(serialize(s)),s);
});
test('corrupt, oversized, unknown and hostile backups are rejected',()=>{
 assert.throws(()=>parseBackup('{oops'),/valid JSON/);
 assert.throws(()=>parseBackup(' '.repeat(1_000_001)),/too large/);
 for(const patch of [{version:99},{picked:{Chemicals:-1}},{extras:{Chemicals:1.5}},{selected:{'not-real':1}},{selected:{'radiation-blockers':1}},{completed:['Chemicals','Chemicals']},{hideCompleted:'yes'},{picked:[]},{unexpected:true}]) assert.throws(()=>parseBackup(JSON.stringify({...emptyState(),...patch})));
 assert.throws(()=>parseBackup('{"version":1,"selected":{},"targets":{"__proto__":3},"picked":{},"completed":[],"hideCompleted":false}'));
 assert.equal({}.polluted,undefined);
});
test('whole-number count boundaries reject NaN, Infinity and unsafe numbers',()=>{
 for(const n of [-1,NaN,Infinity,0.5,100000001,'3',null])assert.throws(()=>count(n));
 assert.equal(count(0),0);assert.equal(count(100000000),100000000);
});

test('owner-verified MIA II uses required quantities, explicitly zero cash, and retains tier rules',()=>{
 const recipe=recipes.find(r=>r.id==='mia-2');
 const expected={'Nuclear Program Files':5,'Degraded Execution Footage':5,'Binding Catalyst':10,'Nitro Compounds':10};
 assert.deepEqual(recipe.costs,expected);assert.deepEqual(recipe.reportedCosts,expected);
 assert.equal(recipe.ownerVerification.date,'2026-10-25');assert.equal(recipe.ownerVerification.cashRequired,0);
 assert.equal(recipe.effect,'5% recovery cost reduction');assert.match(recipe.status,/Owner-verified/);
 const old=chooseRecipe(emptyState(),'mia-1',1);old.picked['Binding Catalyst']=20;old.picked['Nitro Compounds']=4;
 const state=chooseRecipe(old,'mia-2',1);assert.deepEqual(state.selected,{'mia-2':1});
 assert.deepEqual(recipeTotals(state),expected);assert.deepEqual(raidTargets(state),expected);
 assert.equal(recipeTotals(state)['DMZ Cash'],undefined);assert.equal(state.picked['Binding Catalyst'],20);
 assert.equal(state.picked['Nitro Compounds'],4);assert.deepEqual(parseBackup(serialize(state)),state);
 for(const id of ['mia-4','stash-4','stash-weapon-3','vendor-1','vendor-2','ddos','radiation-blockers'])assert.throws(()=>chooseRecipe(state,id,1));
});
