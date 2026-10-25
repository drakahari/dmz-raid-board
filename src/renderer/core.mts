import { recipes, materials, type Costs } from './catalog.mjs';
export interface BoardState {
 version: 1;
 selected: Record<string, number>;
 targets: Record<string, number>;
 picked: Record<string, number>;
 completed: string[];
 hideCompleted: boolean;
}
export const emptyState = (): BoardState => ({version:1,selected:{},targets:{},picked:{},completed:[],hideCompleted:false});
export function sampleState(): BoardState { return {...emptyState(),selected:{gunsmith:1,stash:1}}; }
export const maxCount = 100_000_000;
const knownRecipes = new Set(recipes.map(r=>r.id));
const knownMaterials = new Set(materials);
const plain = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
export function count(value: unknown, max = maxCount): number {
 if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > max) throw new Error('Counts must be whole numbers from 0 to '+max.toLocaleString()+'.');
 return value;
}
function readCounts(value: unknown, allowed: Set<string>, limit = maxCount): Record<string, number> {
 if (!plain(value)) throw new Error('Invalid counts in backup.');
 const result: Record<string,number> = {};
 for (const [key,n] of Object.entries(value)) {
  if (!allowed.has(key)) throw new Error('Backup includes an unknown item: '+key);
  result[key] = count(n,limit);
 }
 return result;
}
export function validateState(value: unknown): BoardState {
 if (!plain(value) || value.version !== 1) throw new Error('This is not a supported DMZ Raid Board backup.');
 const expected=['version','selected','targets','picked','completed','hideCompleted'];
 if (Object.keys(value).some(k=>!expected.includes(k))) throw new Error('Backup contains unsupported fields.');
 if (typeof value.hideCompleted !== 'boolean' || !Array.isArray(value.completed) || value.completed.length > materials.length || value.completed.some(k=>typeof k!=='string'||!knownMaterials.has(k)) || new Set(value.completed).size!==value.completed.length) throw new Error('Invalid completion data.');
 const selected=readCounts(value.selected,knownRecipes,99);
 for (const [id,n] of Object.entries(selected)) {
  const recipe=recipes.find(r=>r.id===id);
  if(n && !recipe?.costs) throw new Error('Cannot select an unconfirmed recipe.');
  if(recipe?.category==='Upgrades' && n>1) throw new Error('Permanent upgrade tiers can only be selected once.');
 }
 const families=new Set<string>();
 for(const [id,n] of Object.entries(selected))if(n){const family=recipes.find(r=>r.id===id)?.family;if(family){if(families.has(family))throw new Error('Select one tier per upgrade family; earlier tiers must already be owned.');families.add(family);}}
 return {version:1,selected,targets:readCounts(value.targets,knownMaterials),picked:readCounts(value.picked,knownMaterials),completed:[...value.completed] as string[],hideCompleted:value.hideCompleted};
}
export function parseBackup(text: string): BoardState {
 if (text.length > 1_000_000) throw new Error('Backup is too large (maximum 1 MB).');
 try { return validateState(JSON.parse(text)); }
 catch (error) { if(error instanceof SyntaxError) throw new Error('Backup is not valid JSON. Your board has not changed.'); throw error; }
}
export function recipeTotals(state: BoardState): Costs {
 const totals: Costs = {};
 for (const recipe of recipes) {
  const n=state.selected[recipe.id] || 0;
  if(!recipe.costs || !n) continue;
  for(const [name,amount] of Object.entries(recipe.costs)) totals[name]=(totals[name]||0)+amount*n;
 }
 // Only explicitly selected ingredient crafts offset matching required outputs.
 // No recipes are expanded automatically, and planning never credits real production/stash.
 for(const [name,amount] of Object.entries(plannedProduction(state))){
  if(name in totals){totals[name]=Math.max(0,totals[name]-amount);if(totals[name]===0)delete totals[name];}
 }
 return totals;
}
export function plannedProduction(state:BoardState):Costs {
 const outputs:Costs={};
 for(const recipe of recipes)if(recipe.category==='Ingredients'&&recipe.costs&&(state.selected[recipe.id]||0)>0)outputs[recipe.name]=(outputs[recipe.name]||0)+(state.selected[recipe.id]||0)*(recipe.outputPerCraft||1);
 return outputs;
}
export function raidTargets(state: BoardState): Costs {
 const result={...recipeTotals(state),...state.targets};delete result['DMZ Cash'];return result;
}
export function chooseRecipe(state: BoardState, id: string, n: number): BoardState {
 const recipe=recipes.find(r=>r.id===id);
 if(!recipe?.costs) throw new Error('This recipe has unconfirmed costs.');
 count(n,recipe.category==='Upgrades'?1:99);
 const selected={...state.selected};
 if(n && recipe.family) for(const other of Object.keys(selected)) if(recipes.find(r=>r.id===other)?.family===recipe.family)delete selected[other];
 if(n)selected[id]=n;else delete selected[id];
 return {...state,selected};
}
export function isComplete(state: BoardState, name: string, target: number): boolean {
 return state.completed.includes(name) || (state.picked[name]||0)>=target;
}
export function newRaid(state: BoardState): BoardState {
 return {...state,picked:{},completed:[]};
}
export function serialize(state: BoardState): string { return JSON.stringify(validateState(state),null,2); }
