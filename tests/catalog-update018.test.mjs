import test from 'node:test';import assert from 'node:assert/strict';
import {recipes,art} from '../dist/renderer/catalog.mjs';import {emptyState,chooseRecipe,raidTargets,addExtra,newRaid,parseBackup,serialize} from '../dist/renderer/core.mjs';
test('Vendor I owner screenshot requirements are selectable, aggregate CPU and survive backups without treating owned counts as needs',()=>{
 const r=recipes.find(x=>x.id==='vendor-1');const expected={'Electronic Sensors':20,CPU:10,'Printed Circuit Board':10,'Prototype RF Module':2};
 assert.deepEqual(r.costs,expected);assert.equal(r.ownerVerification.date,'2026-10-29');assert.match(r.effect,/additional purchase options/);assert.equal(r.ownerVerification.cashRequired,undefined);
 let s=chooseRecipe(emptyState(),r.id,1);assert.deepEqual(raidTargets(s),expected);s=addExtra(chooseRecipe(s,'gunsmith',1),'CPU',2);assert.equal(raidTargets(s).CPU,22);s=newRaid(parseBackup(serialize(s)));assert.equal(raidTargets(s).CPU,22);s=chooseRecipe(s,'vendor-1',0);assert.equal(raidTargets(s).CPU,12);assert.equal(raidTargets(s)['Electronic Sensors'],undefined);
});
test('four consistent complete item reports are selectable but retain web confidence, dates and no invented financial assertion',()=>{
 const expected={'stash-4':{'Gold Skull':5,'Alloyed Plating':30,'Experimental Compounds':10,'Turned Components':30},'stash-weapon-3':{'Gold Bar':5,'Stabilized Reagents':30,'Volatile Explosives':30,'Nano-Structured Alloy':10},'mia-4':{'Sanctioned Assassination List':5,'Ballistic Fabric':30,'Nylon Laminate':30,'Prototype RF Module':10},'vendor-2':{'Control Unit':20,'High-Tenacity Fibers':10,'Nylon Cloth':10,'Nano-Structured Alloy':2}};
 for(const [id,costs] of Object.entries(expected)){const r=recipes.find(x=>x.id===id);assert.deepEqual(r.costs,costs);assert.equal(r.ownerVerification,undefined);assert.match(r.status,/Community-reported.*not confirmed in game/);assert.equal(r.checked,'2026-10-29');assert(r.sources.some(s=>s.url==='https://dmzmap.com/upgrades'&&s.checked==='2026-10-29'));assert(r.sources.some(s=>s.url.startsWith('https://detonated.com/')));assert.deepEqual(raidTargets(chooseRecipe(emptyState(),id,1)),costs);assert.equal(r.costs['DMZ Cash'],undefined);}
 let s=chooseRecipe(chooseRecipe(emptyState(),'vendor-1',1),'vendor-2',1);assert.deepEqual(s.selected,{'vendor-2':1});assert.equal(raidTargets(s).CPU,undefined);
});
test('all catalog entries are selectable after owner evidence settles the two conflicts; prior owner evidence is retained',()=>{
 assert.equal(recipes.filter(r=>!r.costs).length,0);assert.equal(recipes.filter(r=>r.costs).length,120);
 for(const id of ['mia-2','mia-3','stash-3','dog-tag-2','epic-printing','uncommon-printing'])assert(recipes.find(r=>r.id===id).ownerVerification,id);
});
test('owner DDOS and Radiation requirements use required counts, retain conflict provenance and aggregate shared loot safely',()=>{
 const expected={'ddos':{Electronics:30,Detonators:3},'radiation-blockers':{Chemicals:30,Biomaterials:3}};
 for(const [id,costs] of Object.entries(expected)){const r=recipes.find(x=>x.id===id);assert.deepEqual(r.costs,costs);assert.equal(r.ownerVerification.date,'2026-10-29');assert.match(r.note,/Previous uncertainty retained/);assert(r.sources.length===2);assert.equal(r.ownerVerification.cashRequired,undefined);assert.deepEqual(raidTargets(chooseRecipe(emptyState(),id,1)),costs);}
 let s=chooseRecipe(chooseRecipe(emptyState(),'ddos',2),'radiation-blockers',2);assert.deepEqual(raidTargets(s),{Electronics:60,Detonators:6,Chemicals:60,Biomaterials:6});s=chooseRecipe(s,'medkit',1);assert.equal(raidTargets(s).Biomaterials,11);assert.equal(raidTargets(s).Chemicals,90);assert.deepEqual(raidTargets(parseBackup(serialize(newRaid(s)))),raidTargets(s));
});

test('Foreign Intelligence owner image mapping preserves the previously owner-confirmed MIA III requirements',()=>{assert.equal(art['Foreign Intelligence Targets'].file,'owner-foreign-intelligence-targets.png');assert.equal(art['Foreign Intelligence Targets'].presentation,'foreign-intelligence-targets-screenshot');assert.equal(art['Foreign Intelligence Targets'].verified,true);assert.deepEqual(recipes.find(r=>r.id==='mia-3').costs,{'W.M.D. Manifest':5,'Foreign Intelligence Targets':5,'Power Regulator':10,'Comms Module':10});});
