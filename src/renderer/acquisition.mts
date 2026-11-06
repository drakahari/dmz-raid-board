import {recipes,materials,type Costs} from './catalog.mjs';
import {sortedNames} from './ordering.mjs';
import {acquisitionData,printerUnlockData} from './acquisition-data.mjs';
import {catalogArtwork} from './artwork-data.mjs';
import {fieldBoxArtwork,type FieldBoxCrop} from './field-box-artwork.mjs';

export type CatalogKind='printer-recipe'|'weapon-manual'|'cosmetic-blueprint'|'item';
export type AcquisitionMethod='printer'|'gunsmith'|'vendor'|'loot'|'reward'|'battle-pass'|'store'|'unknown';
export type BlueprintProgress='not-found'|'found'|'unlocked';
export type ItemStatus='have'|'want'|'neither';
export interface EvidenceSource {url:string;checked:string;sourceUpdated?:string}
export interface PrinterUnlockOverlay {id:string;unlock:string;checked:string;status:string;sources:EvidenceSource[]}
export interface AcquisitionRoute {
 id:string;method:AcquisitionMethod;label:string;location?:string;unlock?:string;
 requirements:Costs|null;recipeId?:string;outputQuantity?:number;note?:string;
 sources?:EvidenceSource[];checked?:string;unlockChecked?:string;unlockStatus?:string;
}
export interface CatalogEntry {
 id:string;name:string;category:string;kind:CatalogKind;season:'preseason'|'season-1'|'unknown';
 description:string;blueprintRequirement?:string;image?:string;isLoot?:boolean;routes:AcquisitionRoute[];
 imageLabel?:string;imageCredit?:string;imageSource?:string;imageRights?:string;
 imageCrop?:FieldBoxCrop;
 sources:EvidenceSource[];checked:string;status:string;
}
export interface AcquisitionPlan {routeId:string;quantity:number}
export interface CatalogProgressState {
 blueprintProgress:Partial<Record<string,Exclude<BlueprintProgress,'not-found'>>>;
 wanted:string[];
 owned?:string[];
}
export interface CatalogFilters {
 search?:string;category?:string;season?:string;kind?:string;method?:string;
 progress?:string;wantedOnly?:boolean;status?:string;
}

const printerEntries:CatalogEntry[]=recipes.map(recipe=>{
 const overlay=printerUnlockData.find(value=>value.id===recipe.id);
 return {
 id:'printer:'+recipe.id,name:recipe.name,category:recipe.category,kind:'printer-recipe',season:recipe.season||'preseason',
 description:recipe.note,blueprintRequirement:overlay?.unlock||recipe.requires,
 ...(recipe.isLoot?{isLoot:true}:{}),
 image:recipe.image,status:recipe.status,checked:recipe.checked,
 sources:[...(recipe.sources||[{url:recipe.source,checked:recipe.checked}]),...(overlay?.sources||[])],
 routes:[{id:'printer',method:'printer',label:recipe.category==='Upgrades'?'Printer upgrade':'Print item',
  location:recipe.printerLocation||'FOB 3D Printer',unlock:overlay?.unlock||recipe.requires,unlockChecked:overlay?.checked,unlockStatus:overlay?.status,requirements:recipe.costs,recipeId:recipe.id,
  outputQuantity:recipe.outputPerCraft||1,note:recipe.category==='Upgrades'?'One permanent tier per family; earlier tiers must already be owned.':undefined}]
};});
export const catalogEntries:CatalogEntry[]=[...printerEntries,...acquisitionData].map(entry=>{
 const image=fieldBoxArtwork[entry.id]||catalogArtwork[entry.id];
 return image?{...entry,image:image.file,imageLabel:image.label,imageCredit:image.credit,imageSource:image.sourcePage,imageRights:image.rights,...('crop' in image?{imageCrop:image.crop}:{})}:entry;
});
export const catalogMaterials=sortedNames([...new Set([...materials,...catalogEntries.filter(entry=>entry.isLoot).map(entry=>entry.name),...catalogEntries.flatMap(entry=>entry.routes.flatMap(route=>Object.keys(route.requirements||{})))])]);
export const getCatalogEntry=(id:string)=>catalogEntries.find(entry=>entry.id===id);
export const getCatalogRoute=(entryId:string,routeId:string)=>getCatalogEntry(entryId)?.routes.find(route=>route.id===routeId);
export const canTrackBlueprint=(entry:CatalogEntry)=>entry.kind!=='item';
export const routeCanPlan=(route:AcquisitionRoute)=>route.requirements!==null&&Object.keys(route.requirements).length>0;

/** Null requirements mean unknown/not applicable, never free crafting. */
export function validateCatalogEntries(entries:CatalogEntry[]=catalogEntries):void {
 const entryIds=new Set<string>();
 const safeKey=(value:string)=>typeof value==='string'&&value.length>0&&value.length<=200&&!['__proto__','constructor','prototype'].includes(value);
 const sourceValid=(source:EvidenceSource)=>/^https:\/\//.test(source.url)&&/^\d{4}-\d{2}-\d{2}$/.test(source.checked);
 for(const entry of entries){
  if(!safeKey(entry.id)||entryIds.has(entry.id))throw new Error('Duplicate or invalid catalog ID: '+entry.id);entryIds.add(entry.id);
  if(!entry.name||!entry.category||!entry.status||!/^\d{4}-\d{2}-\d{2}$/.test(entry.checked)||!entry.sources.length||!entry.sources.every(sourceValid))throw new Error('Invalid catalog evidence: '+entry.id);
  if(entry.isLoot!==undefined&&(typeof entry.isLoot!=='boolean'||entry.isLoot&&!safeKey(entry.name)))throw new Error('Invalid loot target: '+entry.id);
  if(!['printer-recipe','weapon-manual','cosmetic-blueprint','item'].includes(entry.kind)||!['preseason','season-1','unknown'].includes(entry.season)||!entry.routes.length)throw new Error('Invalid catalog classification: '+entry.id);
  const routes=new Set<string>();
  for(const route of entry.routes){
   if(!safeKey(route.id)||routes.has(route.id)||!route.label||!['printer','gunsmith','vendor','loot','reward','battle-pass','store','unknown'].includes(route.method))throw new Error('Invalid acquisition route: '+entry.id);routes.add(route.id);
   if(route.sources&&!route.sources.every(sourceValid))throw new Error('Invalid route evidence: '+entry.id);
   if(route.outputQuantity!==undefined&&(!Number.isSafeInteger(route.outputQuantity)||route.outputQuantity<=0))throw new Error('Invalid output quantity: '+entry.id);
   if(route.requirements!==null){
    if(Object.getPrototypeOf(route.requirements)!==Object.prototype||Object.keys(route.requirements).length===0)throw new Error('Unknown requirements must be null: '+entry.id);
    for(const [name,n] of Object.entries(route.requirements))if(!safeKey(name)||!Number.isSafeInteger(n)||n<=0||n>100_000_000)throw new Error('Invalid acquisition requirement: '+entry.id);
   }
   if(route.recipeId){
    const recipe=recipes.find(value=>value.id===route.recipeId);
    if(!recipe||entry.id!=='printer:'+recipe.id||route.method!=='printer'||JSON.stringify(route.requirements)!==JSON.stringify(recipe.costs))throw new Error('Invalid existing recipe reference: '+entry.id);
   }
  }
 }
}
validateCatalogEntries();

export function filterCatalog(filters:CatalogFilters={},state?:CatalogProgressState):CatalogEntry[] {
 const term=(filters.search||'').trim().toLocaleLowerCase();
 const match=(filter:string|undefined,value:string)=>!filter||filter==='all'||filter==='All'||filter===value;
 return catalogEntries.filter(entry=>
  match(filters.category,entry.category)&&match(filters.season,entry.season)&&match(filters.kind,entry.kind)&&
  (!filters.method||filters.method==='all'||entry.routes.some(route=>route.method===filters.method))&&
  (!filters.wantedOnly||state?.wanted.includes(entry.id))&&
  match(filters.status,state?.owned?.includes(entry.id)?'have':state?.wanted.includes(entry.id)?'want':'neither')&&
  (!filters.progress||filters.progress==='all'||canTrackBlueprint(entry)&&filters.progress===(state?.blueprintProgress[entry.id]||'not-found'))&&
  (!term||[entry.name,entry.description,entry.blueprintRequirement,...entry.routes.flatMap(route=>[route.label,route.location,route.unlock,route.note,...Object.keys(route.requirements||{})])].filter(Boolean).join(' ').toLocaleLowerCase().includes(term))
 ).sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:'base'})||a.id.localeCompare(b.id));
}
