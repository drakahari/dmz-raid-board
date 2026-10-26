import { recipes, materials, type Costs } from './catalog.mjs';
export interface BoardState {
 version: 2;
 selected: Record<string, number>;
 adjustments: Record<string, number>;
 extras: Record<string, number>;
 picked: Record<string, number>;
 completed: string[];
 hideCompleted: boolean;
}
export const emptyState = (): BoardState => ({version:2,selected:{},adjustments:{},extras:{},picked:{},completed:[],hideCompleted:false});
export function sampleState(): BoardState { return {...emptyState(),selected:{gunsmith:1,stash:1}}; }
export const maxCount = 100_000_000;
const knownRecipes = new Set(recipes.map(r=>r.id));
const knownMaterials = new Set(materials);
const plain = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
export function count(value: unknown, max = maxCount): number {
 if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > max) throw new Error('Counts must be whole numbers from 0 to '+max.toLocaleString()+'.');
 return value;
}
function readCounts(value: unknown, allowed: Set<string>, limit = maxCount, signed=false): Record<string, number> {
 if (!plain(value)) throw new Error('Invalid counts in backup.');
 const result: Record<string,number> = {};
 for (const [key,n] of Object.entries(value)) {
  if (!allowed.has(key)) throw new Error('Backup includes an unknown item: '+key);
  if(signed){if(typeof n!=='number'||!Number.isSafeInteger(n)||Math.abs(n)>limit)throw new Error('Invalid recipe adjustment.');result[key]=n;}
  else result[key] = count(n,limit);
 }
 return result;
}
export function recipeTotals(state: Pick<BoardState,'selected'>): Costs {
 const totals: Costs = {};
 for (const recipe of recipes) {
  const n=state.selected[recipe.id] || 0;
  if(!recipe.costs || !n) continue;
  for(const [name,amount] of Object.entries(recipe.costs))totals[name]=(totals[name]||0)+amount*n;
 }
 // Only explicit ingredient-print plans offset outputs. No automatic expansion, production or unlock.
 for(const [name,amount] of Object.entries(plannedProduction(state)))if(name in totals){totals[name]=Math.max(0,totals[name]-amount);if(totals[name]===0)delete totals[name];}
 return totals;
}
export function plannedProduction(state:Pick<BoardState,'selected'>):Costs {
 const outputs:Costs={};
 for(const recipe of recipes)if(recipe.category==='Ingredients'&&recipe.costs&&(state.selected[recipe.id]||0)>0)outputs[recipe.name]=(outputs[recipe.name]||0)+(state.selected[recipe.id]||0)*(recipe.outputPerCraft||1);
 return outputs;
}
export function raidTargets(state:BoardState):Costs {
 const baseline=recipeTotals(state),result:Costs={};
 for(const name of new Set([...Object.keys(baseline),...Object.keys(state.extras)])){
  if(name==='DMZ Cash')continue;
  const base=baseline[name]||0;
  const total=Math.max(0,base+(base>0?(state.adjustments[name]||0):0)+(state.extras[name]||0));
  count(total);if(total>0)result[name]=total;
 }
 return result;
}
export function validateState(value: unknown): BoardState {
 if(!plain(value)||(value.version!==1&&value.version!==2))throw new Error('This is not a supported DMZ Raid Board backup.');
 const expected=value.version===1?['version','selected','targets','picked','completed','hideCompleted']:['version','selected','adjustments','extras','picked','completed','hideCompleted'];
 if(Object.keys(value).some(k=>!expected.includes(k)))throw new Error('Backup contains unsupported fields.');
 if(typeof value.hideCompleted!=='boolean'||!Array.isArray(value.completed)||value.completed.length>materials.length||value.completed.some(k=>typeof k!=='string'||!knownMaterials.has(k))||new Set(value.completed).size!==value.completed.length)throw new Error('Invalid completion data.');
 const selected=readCounts(value.selected,knownRecipes,99);
 for(const [id,n] of Object.entries(selected)){
  const recipe=recipes.find(r=>r.id===id);
  if(n&&!recipe?.costs)throw new Error('Cannot select an unconfirmed recipe.');
  if(recipe?.category==='Upgrades'&&n>1)throw new Error('Permanent upgrade tiers can only be selected once.');
  if(!n)delete selected[id];
 }
 const families=new Set<string>();
 for(const id of Object.keys(selected)){const family=recipes.find(r=>r.id===id)?.family;if(family){if(families.has(family))throw new Error('Select one tier per upgrade family; earlier tiers must already be owned.');families.add(family);}}
 const result:BoardState={version:2,selected,adjustments:{},extras:{},picked:readCounts(value.picked,knownMaterials),completed:[...value.completed] as string[],hideCompleted:value.hideCompleted};
 const baseline=recipeTotals(result);
 if(value.version===1){
  // Preserve positive legacy targets. Zero overrides are stale legacy artifacts, not new explicit removals; original input is retained by the UI.
  for(const [name,n] of Object.entries(readCounts(value.targets,knownMaterials))){
   if(!n){if(baseline[name])result.completed=result.completed.filter(item=>item!==name);continue;}
   if((baseline[name]||0)>0&&name!=='DMZ Cash'){const delta=n-baseline[name];if(delta)result.adjustments[name]=delta;}
   else if(n)result.extras[name]=n;
  }
 }else{
  result.adjustments=readCounts(value.adjustments,knownMaterials,maxCount,true);
  result.extras=readCounts(value.extras,knownMaterials);
  // No dormant deltas can attach themselves to a future, newly selected goal.
  for(const name of Object.keys(result.adjustments))if(!baseline[name]||!result.adjustments[name]||name==='DMZ Cash')delete result.adjustments[name];
  for(const name of Object.keys(result.extras))if(!result.extras[name])delete result.extras[name];
 }
 raidTargets(result);return result;
}
export function parseBackup(text: string): BoardState {
 if(text.length>1_000_000)throw new Error('Backup is too large (maximum 1 MB).');
 try{return validateState(JSON.parse(text));}catch(error){if(error instanceof SyntaxError)throw new Error('Backup is not valid JSON. Your board has not changed.');throw error;}
}
function changedPlan(before:BoardState,next:BoardState):BoardState {
 const baseline=recipeTotals(next);next={...next,adjustments:{...next.adjustments}};
 for(const name of Object.keys(next.adjustments))if(!baseline[name])delete next.adjustments[name];
 const oldTargets=raidTargets(before),newTargets=raidTargets(next);
 // A manual check applies to its old target. Picked-up counts remain real per-raid input.
 return {...next,completed:next.completed.filter(name=>(oldTargets[name]||0)===(newTargets[name]||0))};
}
function material(name:string){if(!knownMaterials.has(name)||name==='DMZ Cash')throw new Error('Choose a supported loot ingredient.');}
export function setRaidTarget(state:BoardState,name:string,n:number):BoardState {
 material(name);count(n);
 const base=recipeTotals(state)[name]||0,adjustments={...state.adjustments},extras={...state.extras};
 if(n===0)delete extras[name];
 if(base>0){const delta=n-base-(extras[name]||0);if(delta)adjustments[name]=delta;else delete adjustments[name];}
 else {delete adjustments[name];if(n)extras[name]=n;else delete extras[name];}
 return changedPlan(state,{...state,adjustments,extras});
}
export function addExtra(state:BoardState,name:string,n:number):BoardState {
 material(name);count(n);if(!n)return state;
 const extras={...state.extras,[name]:count((state.extras[name]||0)+n)};
 return changedPlan(state,{...state,extras});
}
export function removeExtra(state:BoardState,name:string):BoardState {const extras={...state.extras};delete extras[name];return changedPlan(state,{...state,extras});}
export function resetAdjustments(state:BoardState,name?:string):BoardState {const adjustments=name?{...state.adjustments}:{};if(name)delete adjustments[name];return changedPlan(state,{...state,adjustments});}
export function chooseRecipe(state: BoardState, id: string, n: number): BoardState {
 const recipe=recipes.find(r=>r.id===id);if(!recipe?.costs)throw new Error('This recipe has unconfirmed requirements.');
 count(n,recipe.category==='Upgrades'?1:99);
 const selected={...state.selected};
 if(n&&recipe.family)for(const other of Object.keys(selected))if(recipes.find(r=>r.id===other)?.family===recipe.family)delete selected[other];
 if(n)selected[id]=n;else delete selected[id];
 const next={...state,selected,adjustments:{...state.adjustments}};
 // Re-adding a goal must not inherit an earlier zero/removal for its incoming requirements.
 if(n){const old=raidTargets(state),before=recipeTotals(state),after=recipeTotals(next);for(const name of Object.keys(after))if((after[name]||0)>(before[name]||0)&&!old[name])delete next.adjustments[name];}
 return changedPlan(state,next);
}
export function isComplete(state:BoardState,name:string,target:number):boolean {return state.completed.includes(name)||(state.picked[name]||0)>=target;}
export function newRaid(state:BoardState):BoardState {return {...state,picked:{},completed:[]};}
export function serialize(state:BoardState):string {return JSON.stringify(validateState(state),null,2);}
