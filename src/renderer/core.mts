import { recipes, type Costs } from './catalog.mjs';
import {catalogEntries,catalogMaterials,getCatalogEntry,getCatalogRoute,canTrackBlueprint,routeCanPlan,type AcquisitionPlan,type BlueprintProgress,type CatalogEntry,type ItemStatus} from './acquisition.mjs';
import {compareNames} from './ordering.mjs';
export type {ItemStatus} from './acquisition.mjs';
export interface BoardState {
 version: 4;
 selected: Record<string, number>;
 adjustments: Record<string, number>;
 extras: Record<string, number>;
 picked: Record<string, number>;
 completed: string[];
 hideCompleted: boolean;
 blueprintProgress:Partial<Record<string,Exclude<BlueprintProgress,'not-found'>>>;
 wanted:string[];
 owned:string[];
 acquisitionPlans:Record<string,AcquisitionPlan>;
}
export const emptyState = (): BoardState => ({version:4,selected:{},adjustments:{},extras:{},picked:{},completed:[],hideCompleted:false,blueprintProgress:{},wanted:[],owned:[],acquisitionPlans:{}});
export function sampleState(): BoardState { return {...emptyState(),selected:{gunsmith:1,stash:1}}; }
export const maxCount = 100_000_000;
const knownRecipes = new Set(recipes.map(r=>r.id));
const knownMaterials = new Set(catalogMaterials);
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
type PlanState=Pick<BoardState,'selected'>&Partial<Pick<BoardState,'acquisitionPlans'>>;
export function recipeTotals(state: PlanState): Costs {
 const totals: Costs = {};
 for (const recipe of recipes) {
  const n=state.selected[recipe.id] || 0;
  if(!recipe.costs || !n) continue;
  for(const [name,amount] of Object.entries(recipe.costs))totals[name]=count((totals[name]||0)+amount*n);
 }
 // One chosen acquisition route per catalog item. Existing printer recipes live only in selected.
 for(const [entryId,plan] of Object.entries(state.acquisitionPlans||{})){
  const route=getCatalogRoute(entryId,plan.routeId);
  if(!route||route.recipeId||!routeCanPlan(route))throw new Error('Invalid or unconfirmed acquisition route.');
  count(plan.quantity,99);if(!plan.quantity)throw new Error('Acquisition quantity must be positive.');
  for(const [name,amount] of Object.entries(route.requirements!))totals[name]=count((totals[name]||0)+amount*plan.quantity);
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
 if(!plain(value)||(value.version!==1&&value.version!==2&&value.version!==3&&value.version!==4))throw new Error('This is not a supported DMZ Raid Board backup.');
 const expected=value.version===1?['version','selected','targets','picked','completed','hideCompleted']:['version','selected','adjustments','extras','picked','completed','hideCompleted',...((value.version===3||value.version===4)?['blueprintProgress','wanted','acquisitionPlans']:[]),...(value.version===4?['owned']:[])];
 if(Object.keys(value).some(k=>!expected.includes(k)))throw new Error('Backup contains unsupported fields.');
 if(typeof value.hideCompleted!=='boolean'||!Array.isArray(value.completed)||value.completed.length>catalogMaterials.length||value.completed.some(k=>typeof k!=='string'||!knownMaterials.has(k))||new Set(value.completed).size!==value.completed.length)throw new Error('Invalid completion data.');
 const selected=readCounts(value.selected,knownRecipes,99);
 for(const [id,n] of Object.entries(selected)){
  const recipe=recipes.find(r=>r.id===id);
  if(n&&!recipe?.costs)throw new Error('Cannot select an unconfirmed recipe.');
  if(recipe?.category==='Upgrades'&&n>1)throw new Error('Permanent upgrade tiers can only be selected once.');
  if(!n)delete selected[id];
 }
 const families=new Set<string>();
 for(const id of Object.keys(selected)){const family=recipes.find(r=>r.id===id)?.family;if(family){if(families.has(family))throw new Error('Select one tier per upgrade family; earlier tiers must already be owned.');families.add(family);}}
 const result:BoardState={...emptyState(),selected,picked:readCounts(value.picked,knownMaterials),completed:[...value.completed] as string[],hideCompleted:value.hideCompleted};
 if(value.version===3||value.version===4){
  if(!plain(value.blueprintProgress))throw new Error('Invalid blueprint progress.');
  for(const [id,progress] of Object.entries(value.blueprintProgress)){
   const entry=getCatalogEntry(id);
   if(!entry||!canTrackBlueprint(entry)||(progress!=='found'&&progress!=='unlocked'))throw new Error('Invalid blueprint progress.');
   result.blueprintProgress[id]=progress;
  }
  if(!Array.isArray(value.wanted)||value.wanted.some(id=>typeof id!=='string'||!getCatalogEntry(id))||new Set(value.wanted).size!==value.wanted.length)throw new Error('Invalid wanted catalog entries.');
  result.wanted=[...value.wanted] as string[];
  if(value.version===4){
   if(!Array.isArray(value.owned)||value.owned.some(id=>typeof id!=='string'||!getCatalogEntry(id))||new Set(value.owned).size!==value.owned.length)throw new Error('Invalid owned catalog entries.');
   result.owned=[...value.owned] as string[];
   if(result.owned.some(id=>result.wanted.includes(id)))throw new Error('An item cannot be both Have it and Want it.');
  }
  if(!plain(value.acquisitionPlans))throw new Error('Invalid acquisition plans.');
  for(const [id,plan] of Object.entries(value.acquisitionPlans)){
   if(!plain(plan)||Object.keys(plan).some(key=>!['routeId','quantity'].includes(key))||typeof plan.routeId!=='string')throw new Error('Invalid acquisition plan.');
   const route=getCatalogRoute(id,plan.routeId);
   if(!route||route.recipeId||!routeCanPlan(route))throw new Error('Invalid or unconfirmed acquisition route.');
   const quantity=count(plan.quantity,99);if(!quantity)throw new Error('Acquisition quantity must be positive.');
   result.acquisitionPlans[id]={routeId:plan.routeId,quantity};
  }
 }
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
/** Manual recipe/blueprint discovery is independent of planning and raid pickups. */
export function setBlueprintProgress(state:BoardState,id:string,progress:BlueprintProgress):BoardState {
 const entry=getCatalogEntry(id);
 if(!entry||!canTrackBlueprint(entry)||!['not-found','found','unlocked'].includes(progress))throw new Error('Choose a supported blueprint or recipe progress state.');
 const blueprintProgress={...state.blueprintProgress};
 if(progress==='not-found')delete blueprintProgress[id];else blueprintProgress[id]=progress;
 return {...state,blueprintProgress};
}
export function setWanted(state:BoardState,id:string,wanted:boolean):BoardState {
 if(!getCatalogEntry(id)||typeof wanted!=='boolean')throw new Error('Choose a supported catalog item.');
 return wanted?setItemStatus(state,id,'want'):{...state,wanted:state.wanted.filter(value=>value!==id)};
}
/** Bulk wishlist changes apply only to the supplied scope and never replace Have it choices. */
export function setWantedBulk(state:BoardState,ids:string[],wanted:boolean):BoardState {
 if(!Array.isArray(ids)||typeof wanted!=='boolean')throw new Error('Choose supported catalog items.');
 for(const id of ids)if(typeof id!=='string'||!getCatalogEntry(id))throw new Error('Choose supported catalog items.');
 const scope=new Set(ids),next=new Set(state.wanted);
 if(wanted){const owned=new Set(state.owned);for(const id of scope)if(!owned.has(id))next.add(id);}
 else for(const id of scope)next.delete(id);
 const result=[...next];
 return result.length===state.wanted.length&&result.every((id,index)=>id===state.wanted[index])?state:{...state,wanted:result};
}
/** Finished-item ownership and wishlist choices are independent of legacy recipe notes and plans. */
export function getItemStatus(state:Pick<BoardState,'owned'|'wanted'>,id:string):ItemStatus {
 if(!getCatalogEntry(id))throw new Error('Choose a supported catalog item.');
 return state.owned.includes(id)?'have':state.wanted.includes(id)?'want':'neither';
}
export function setItemStatus(state:BoardState,id:string,status:ItemStatus):BoardState {
 if(!getCatalogEntry(id)||!['have','want','neither'].includes(status))throw new Error('Choose a supported item status.');
 const wanted=status==='want'?(state.wanted.includes(id)?[...state.wanted]:[...state.wanted,id]):state.wanted.filter(value=>value!==id);
 const owned=status==='have'?(state.owned.includes(id)?[...state.owned]:[...state.owned,id]):state.owned.filter(value=>value!==id);
 return {...state,wanted,owned};
}
export interface WantedRaidItem {entry:CatalogEntry;ids:string[];materialName?:string}
/** Wishlist outputs appear once; existing ingredient targets remain unchanged. */
export function wantedRaidItems(state:BoardState):WantedRaidItem[] {
 const normalize=(name:string)=>name.trim().toLowerCase();
 const materialNames=new Map(Object.keys(raidTargets(state)).map(name=>[normalize(name),name]));
 const wanted=new Set(state.wanted),grouped=new Map<string,WantedRaidItem>();
 for(const entry of catalogEntries){
  if(!wanted.has(entry.id))continue;
  const name=normalize(entry.name),group=grouped.get(name);
  if(group)group.ids.push(entry.id);
  else grouped.set(name,{entry,ids:[entry.id],...(materialNames.has(name)?{materialName:materialNames.get(name)!}:{})});
 }
 return [...grouped.values()].sort((a,b)=>compareNames(a.entry.name,b.entry.name)||compareNames(a.entry.id,b.entry.id));
}
export function acquisitionQuantity(state:BoardState,entryId:string,routeId?:string):number {
 const entry=getCatalogEntry(entryId);if(!entry)return 0;
 const route=routeId?getCatalogRoute(entryId,routeId):entry.routes.find(value=>value.recipeId);
 if(route?.recipeId)return state.selected[route.recipeId]||0;
 const plan=state.acquisitionPlans[entryId];return plan&&(!routeId||plan.routeId===routeId)?plan.quantity:0;
}
export function chooseAcquisition(state:BoardState,entryId:string,routeId:string,quantity:number):BoardState {
 const entry=getCatalogEntry(entryId),route=getCatalogRoute(entryId,routeId);
 if(!entry||!route)throw new Error('Choose a supported acquisition route.');
 if(route.recipeId)return chooseRecipe(state,route.recipeId,quantity);
 count(quantity,99);
 if(quantity&&!routeCanPlan(route))throw new Error('This route has no verified planning requirements.');
 const acquisitionPlans={...state.acquisitionPlans};
 if(quantity)acquisitionPlans[entryId]={routeId,quantity};else delete acquisitionPlans[entryId];
 const next={...state,acquisitionPlans,adjustments:{...state.adjustments}};
 // A newly added route must not inherit an old zero override on its incoming requirements.
 if(quantity){const old=raidTargets(state),before=recipeTotals(state),after=recipeTotals(next);for(const name of Object.keys(after))if((after[name]||0)>(before[name]||0)&&!old[name])delete next.adjustments[name];}
 return changedPlan(state,next);
}
export function isComplete(state:BoardState,name:string,target:number):boolean {return state.completed.includes(name)||(state.picked[name]||0)>=target;}
export function newRaid(state:BoardState):BoardState {return {...state,picked:{},completed:[]};}
export function serialize(state:BoardState):string {return JSON.stringify(validateState(state),null,2);}
