export const categories = ['Upgrades','Consumables','Plate Carriers','Backpacks','Tacticals','Lethals','Field Upgrades','Fire Support','Gear','Ingredients'] as const;
export type Category = typeof categories[number];
export type Costs = Record<string, number>;
export interface Recipe { id: string; name: string; category: Category; costs: Costs | null; source: string; status: string; note: string; image?: string }
export const checked = '2026-10-25';
const codex = 'https://dmzcodex.com';
const central = 'https://codcentral.net/blog/mw4-dmz-3d-printer-recipes/';
const r = (id: string, name: string, category: Category, costs: Costs | null, source: string, note = '', status = 'Community reported'): Recipe => ({id,name,category,costs,source,status,note});
// Deliberately bounded factual sample. Unknown recipes are never treated as zero cost.
export const recipes: Recipe[] = [
 r('gunsmith','Gunsmith Upgrade I','Upgrades',{'Reactive Metals':20,'CPU':10,'Power Regulator':5,'DMZ Cash':50000},'https://www.oghub.fr/en/game/call-of-duty/mw4/dmz/upgrades','5% off Gunsmith purchases. Requires Gunsmith station; fixed permanent tier.'),
 r('stash','Stash Item Upgrade II','Upgrades',{'Detonators':20,'Nylon Cloth':10,'Power Regulator':5,'DMZ Cash':50000},'https://www.oghub.fr/en/game/call-of-duty/mw4/dmz/upgrades','Expand your item stash. Requires Stash Item Upgrade I already purchased in game; fixed permanent tier.'),
 r('uncommon-printing','Uncommon Ingredient Printing','Upgrades',{'Biomaterials':20,'High-Tenacity Fibers':10,'Comms Module':5,'DMZ Cash':50000},codex+'/upgrades/ingredient-printing/','Requires the 3D Printer. Check your current game card.'),
 r('epic-printing','Epic Ingredient Printing','Upgrades',{'Binding Catalyst':10,'Printed Circuit Board':10,'Military Composites':5,'DMZ Cash':100000},codex+'/upgrades/epic-ingredient-printing/','Requires the 3D Printer.'),
 ...[20000,50000,100000,200000,500000,500000].map((cash,i)=>r('bank-'+(i+1),'Bank Upgrade · Tier '+(i+1),'Upgrades',{'DMZ Cash':cash,...([{}, {}, {'Infantry Invasion Plans':5}, {'Ballistic Flight Logs':5,'Regional Combat Notes':5},{'Degraded Execution Footage':10},{'Nuclear Program Files':10,'Encrypted Archive':10}][i])},codex+'/upgrades/bank-upgrade/','Only this tier is counted. Requires previous tier; do not select all tiers unless you need all costs.')),
 ...['Stash Item Upgrade · later tiers','Stash Weapon Upgrade · later tiers','Dog Tag Case Storage · later tiers','Gunsmith Discount · later tiers','MIA Recovery Discount · later tiers','Vendor Item Slots · later tiers'].map((name,i)=>r('unknown-upgrade-'+i,name,'Upgrades',null,codex+'/upgrades/','Current tier costs need an owner game screenshot.','Costs unconfirmed')),
 r('energy-drink','Energy Drink','Consumables',{'Chemicals':10,'Metals':10},central,'Find recipe in game.'),
 r('bandage','Bandage','Consumables',{'Synthetics':15,'Chemicals':15},central,'Available from the start.'),
 r('medkit','Medkit','Consumables',{'Chemicals':30,'Binding Catalyst':1,'Biomaterials':5},central,'Available from the start.'),
 r('radiation-blockers','Radiation Blockers','Consumables',null,central,'Sources disagree: COD Central and DMZHub show different costs. Verify game card.','Sources differ'),
 r('one-plate','1-Plate Armor Vest','Plate Carriers',{'Synthetics':25,'Metals':25},central),
 r('two-plate','2-Plate Armor Vest','Plate Carriers',{'Synthetics':50,'Reactive Metals':5},central),
 r('three-plate','3-Plate Armor Vest','Plate Carriers',null,codex+'/items/plate-carriers/','Recipe cost not yet transcribed.','Costs unconfirmed'),
 r('small-backpack','Small Backpack','Backpacks',{'Synthetics':25,'Metals':25},central),
 r('medium-backpack','Medium Backpack','Backpacks',{'Synthetics':50,'Rigid Synthetics':5},central),
 r('large-secure-backpack','Large Secure Backpack','Backpacks',null,codex+'/items/backpacks/','Recipe cost not yet verified for this build.','Costs unconfirmed'),
 r('concussion','Concussion Grenade','Tacticals',{'Synthetics':10,'Chemicals':10},central,'DMZ Level 4.'),
 r('smoke','Smoke Grenade','Tacticals',{'Synthetics':10,'Chemicals':10},central,'DMZ Level 4.'),
 r('frag','Frag Grenade','Lethals',{'Chemicals':10,'Metals':10},central,'DMZ Level 7.'),
 r('throwing-knife','Throwing Knife','Lethals',{'Chemicals':25,'Metals':25},central,'DMZ Level 7.'),
 r('ammo-box','Ammo Box','Field Upgrades',{'Synthetics':15,'Metals':15},central,'DMZ Level 12.'),
 r('armor-box','Armor Box','Field Upgrades',null,codex+'/items/','Recipe cost not yet verified for this build.','Costs unconfirmed'),
 r('uav','UAV','Fire Support',{'Electronics':30,'Structural Alloy':2,'Electronic Sensors':5},central,'DMZ Level 31.'),
 r('care-package','Care Package','Fire Support',{'Electronics':20,'Control Unit':2,'Rigid Synthetics':2},central,'DMZ Level 28.'),
 r('weak-nvg','Weak Night Vision Goggles','Gear',{'Metals':25,'Control Unit':5},central,'Find recipe in game.'),
 r('gas-mask','Gas Mask','Gear',null,codex+'/items/','Recipe cost not yet transcribed.','Costs unconfirmed'),
 r('print-biomaterials','Biomaterials','Ingredients',null,codex+'/items/ingredients/','Use Add direct target to collect this ingredient; printing recipe not verified.','Costs unconfirmed'),
 r('print-comms','Comms Module','Ingredients',null,codex+'/items/ingredients/','Use Add direct target to collect this ingredient; printing recipe not verified.','Costs unconfirmed')
];
export const materials = ['DMZ Cash','Synthetics','Electronics','Chemicals','Metals','Biomaterials','Control Unit','Detonators','Electronic Sensors','Reactive Metals','Rigid Synthetics','Binding Catalyst','CPU','Printed Circuit Board','Stock Rod','Structural Alloy','High-Tenacity Fibers','Nylon Cloth','Nitro Compounds','Alloyed Plating','Ballistic Fabric','Comms Module','Nylon Laminate','Power Regulator','Stabilized Reagents','Turned Components','Volatile Explosives','Military Composites','Experimental Compounds','Nano-Structured Alloy','Prototype RF Module','Regional Combat Notes','Infantry Invasion Plans','Ballistic Flight Logs','Degraded Execution Footage','Nuclear Program Files','Encrypted Archive'];
export const art: Record<string,{file:string;rarity:string}> = {
 'Reactive Metals':{file:'reactive-metals.png',rarity:'uncommon'},
 'CPU':{file:'cpu.png',rarity:'rare'},
 'Power Regulator':{file:'power-regulator.png',rarity:'epic'},
 'Detonators':{file:'detonators.png',rarity:'uncommon'},
 'Nylon Cloth':{file:'nylon-cloth.png',rarity:'rare'}
};
