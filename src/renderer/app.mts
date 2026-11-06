import {themes,normalizeTheme,themeKey,defaultTheme} from './themes.mjs';
import {buildFlavor,appVersion} from './build-status.mjs';
import {recipes,categories,materials,art as knownArt,checked,type Recipe,type Category,type ArtAsset} from './catalog.mjs';
import {catalogEntries,catalogMaterials,getCatalogEntry,getCatalogRoute,filterCatalog,type CatalogEntry} from './acquisition.mjs';
import {installedImageFiles} from './asset-status.mjs';
import {compareNames,sortedNames} from './ordering.mjs';
import {type BoardState,type ItemStatus,emptyState,parseBackup,serialize,count,recipeTotals,raidTargets,chooseRecipe,isComplete,plannedProduction,newRaid,maxCount,setRaidTarget,addExtra,removeExtra,resetAdjustments,setItemStatus,getItemStatus,wantedRaidItems,setWantedBulk} from './core.mjs';
const $ = <T extends HTMLElement = HTMLElement>(id:string) => document.getElementById(id) as T;
$('buildLabel').textContent=buildFlavor==='public'?'PUBLIC RELEASE / NO GAME ART':buildFlavor==='artwork'?'UNOFFICIAL RELEASE / GAME ART':'PRIVATE WINDOWS PROTOTYPE / 01';
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const settings=$<HTMLDialogElement>('settings');
const themePicker=$<HTMLSelectElement>('themePicker');
const artworkPreview=$<HTMLDialogElement>('artworkPreview');
let artworkPreviewTrigger:HTMLButtonElement|null=null;
function openArtworkPreview(entryId:string,trigger:HTMLButtonElement){
 const entry=getCatalogEntry(entryId);
 if(!entry?.image||!installedImageFiles.includes(entry.image))return;
 const image=$<HTMLImageElement>('artworkPreviewImage');
 artworkPreviewTrigger=trigger;
 $('artworkPreviewHeading').textContent=entry.name;
 image.alt=entry.imageLabel?entry.name+' — '+entry.imageLabel:entry.name;
 image.hidden=false;
 $('artworkPreviewError').hidden=true;
 image.src='assets/'+entry.image;
 $('artworkPreviewCaption').textContent=[
  entry.imageLabel,
  entry.imageCredit?'Credit: '+entry.imageCredit:undefined,
  entry.imageSource?'Source: '+entry.imageSource:undefined,
  entry.imageRights||'Game artwork © Activision/respective rights holders. All rights reserved. Attribution does not establish a license.'
 ].filter(Boolean).join('\n');
 if(!artworkPreview.open)artworkPreview.showModal();
 $('closeArtworkPreview').focus();
}
$('closeArtworkPreview').addEventListener('click',()=>artworkPreview.close());
artworkPreview.addEventListener('close',()=>{
 if(artworkPreviewTrigger?.isConnected)artworkPreviewTrigger.focus();
 else $('librarySearch').focus();
 artworkPreviewTrigger=null;
});
$('artworkPreviewImage').addEventListener('error',()=>{
 $('artworkPreviewImage').hidden=true;
 $('artworkPreviewError').hidden=false;
});
themePicker.innerHTML=[...new Set(themes.map(t=>t.group))].map(group=>'<optgroup label="'+escape(group)+'">'+themes.filter(t=>t.group===group).map(t=>'<option value="'+t.id+'">'+escape(t.name)+'</option>').join('')+'</optgroup>').join('');
let selectedTheme=defaultTheme;try{selectedTheme=normalizeTheme(localStorage.getItem(themeKey));}catch{}
document.documentElement.dataset.theme=selectedTheme;themePicker.value=selectedTheme;
function openSettings(){if(!settings.open)settings.showModal();$('settingsMessage').hidden=true;themePicker.focus();}
function closeSettings(){settings.close();}
$('settingsBtn').addEventListener('click',openSettings);$('closeSettings').addEventListener('click',closeSettings);
settings.addEventListener('close',()=>$('settingsBtn').focus());
themePicker.addEventListener('change',()=>{selectedTheme=normalizeTheme(themePicker.value);document.documentElement.dataset.theme=selectedTheme;try{localStorage.setItem(themeKey,selectedTheme);$('themeFeedback').textContent=themes.find(t=>t.id===selectedTheme)!.name+' applied and saved.';}catch{$('themeFeedback').textContent='Theme applied for this session; device storage is unavailable.';}});
const key='dmz-raid-board-state-v4';
const previousKey='dmz-raid-board-state-v3';
const olderKey='dmz-raid-board-state-v2';
const legacyKey='dmz-raid-board-state-v1';
const clearRecoveryKey=key+'-before-clear';
let migratedLegacy=false;
let migratedVersion=4;
$('appVersion').textContent='DMZ Raid Board '+appVersion;
const fmt=(n:number)=>n.toLocaleString();
const art=Object.fromEntries(Object.entries(knownArt).filter(([,asset])=>asset.verified!==false&&installedImageFiles.includes(asset.file)));
let state:BoardState=emptyState();
let bulkUndo:Array<{id:string;before:ItemStatus;after:ItemStatus}>|null=null;
type ViewMode='plan'|'raid'|'library';
let mode:ViewMode='plan';
let corruptRaw:string|null=null;
let storageAvailable=true;
try {
 const raw=localStorage.getItem(key)??localStorage.getItem(previousKey)??localStorage.getItem(olderKey)??localStorage.getItem(legacyKey);
 if(raw!==null){try{state=parseBackup(raw);migratedVersion=JSON.parse(raw).version;migratedLegacy=migratedVersion<4;}catch(e){corruptRaw=raw;$('recovery').hidden=false;$('recoveryReason').textContent=String((e as Error).message);}if(migratedLegacy){try{if(localStorage.getItem(key+'-before-migration')===null)localStorage.setItem(key+'-before-migration',raw);}catch{storageAvailable=false;}}}
 const savedMode=localStorage.getItem('dmz-raid-board-mode-v4')??localStorage.getItem('dmz-raid-board-mode-v3')??localStorage.getItem('dmz-raid-board-mode-v2')??localStorage.getItem('dmz-raid-board-mode');if(savedMode==='raid'||savedMode==='library')mode=savedMode;
}catch{storageAvailable=false;}

let pending:(()=>void)|null=null;
let lastFocus:HTMLElement|null=null;
const confirmDialog=$<HTMLDialogElement>('confirmDialog');
function notice(message:string){const target=settings.open?$('settingsMessage'):$('notice');const other=settings.open?$('notice'):$('settingsMessage');target.textContent=message;target.hidden=!message;other.textContent='';other.hidden=true;}
function showError(error:unknown){notice(error instanceof Error?error.message:'This action could not be completed. Your board has not changed.');}
function save(){
 if(corruptRaw!==null){$('saved').textContent='Session only · saved data needs recovery';return;}
 try {if(!storageAvailable)throw new Error('Storage unavailable');localStorage.setItem(key,serialize(state));localStorage.setItem('dmz-raid-board-mode-v4',mode);$('saved').textContent='● Saved on this device';}
 catch {$('saved').textContent='Storage unavailable · export a backup';storageAvailable=false;}
}
function ask(title:string,body:string,action:()=>void,label='Confirm'){
 lastFocus=document.activeElement as HTMLElement;pending=action;$('confirmHeading').textContent=title;$('confirmBody').textContent=body;$('confirmAction').textContent=label;confirmDialog.showModal();$('cancelAction').focus();
}
function closeConfirm(){pending=null;confirmDialog.close();lastFocus?.focus();}
$('cancelAction').addEventListener('click',closeConfirm);
confirmDialog.addEventListener('cancel',()=>{pending=null;});
$('confirmAction').addEventListener('click',()=>{const action=pending;pending=null;confirmDialog.close();try{action?.();}catch(e){showError(e);}lastFocus?.focus();});
function fileDownload(text:string,name:string){
 const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
function setMode(value:ViewMode){mode=value;notice('');render();$(value==='plan'?'planTab':value==='raid'?'raidTab':'libraryTab').focus();}
function costText(recipe:Recipe){if(!recipe.costs)return 'Requirements unconfirmed';const itemCount=Object.keys(recipe.costs).filter(k=>k!=='DMZ Cash').length;return itemCount?itemCount+' loot ingredient'+(itemCount===1?'':'s'):'No loot ingredients listed';}
function lootEntries(recipe:Recipe){return Object.entries(recipe.costs||recipe.reportedCosts||{}).filter(([name])=>name!=='DMZ Cash');}
const itemBenefit=(recipe:Recipe)=>recipe.ownerVerification&&recipe.effect&&!/(cash|money|cost|price|discount|purchase|wallet|bank)/i.test(recipe.effect)?recipe.effect:undefined;
const installedRecipeImage=(recipe:Recipe)=>recipe.image&&installedImageFiles.includes(recipe.image)?recipe.image:undefined;
function materialImage(name:string,asset:ArtAsset):string {
 const image='<img src="assets/'+escape(asset.file)+'" alt="'+escape(name)+'" data-game-image="true">';
 return asset.presentation?'<span class="source-crop '+escape(asset.presentation)+'">'+image+'</span>':image;
}
function renderGoals(){
 const goals=recipes.filter(r=>(state.selected[r.id]||0)>0);
 $('goalEmpty').hidden=goals.length>0;
 $('upgrades').innerHTML=goals.map(r=>`<article class="upgrade on selectedGoal" data-goal="${escape(r.id)}"><span class="symbol" aria-hidden="true">${installedRecipeImage(r)?`<img src="assets/${escape(installedRecipeImage(r)!)}" alt="">`:'+'}</span><div class="goalText"><h3>${escape(r.name)}</h3><p>${r.id==='gunsmith'?'Gunsmith upgrade goal':r.id==='stash'?'Expand your item stash':escape(itemBenefit(r)||r.category)}</p><p>${escape(costText(r))}${r.category!=='Upgrades'?' · Quantity '+(state.selected[r.id]||0):''}</p></div><button class="secondary goalRemove" data-summary-remove="${escape(r.id)}" aria-label="Remove ${escape(r.name)} goal">Remove</button></article>`).join('');
}
function addUpgrades(){const browse=$<HTMLDetailsElement>('browse');browse.open=true;$<HTMLSelectElement>('category').value='Upgrades';$<HTMLInputElement>('search').value='';renderCatalog();$('search').focus();}
$('addUpgrades').addEventListener('click',addUpgrades);
$('browse').addEventListener('toggle',()=>$('addUpgrades').setAttribute('aria-expanded',String($<HTMLDetailsElement>('browse').open)));

function renderCatalog(){
 const category=$<HTMLSelectElement>('category').value;
 const term=$<HTMLInputElement>('search').value.trim().toLowerCase();
 const shown=recipes.filter(r=>(category==='All'||r.category===category)&&[r.name,...lootEntries(r).map(([name])=>name)].join(' ').toLowerCase().includes(term)).sort((a,b)=>compareNames(a.name,b.name)||compareNames(a.id,b.id));
 $('catalogStatus').textContent=shown.length+' entries shown · '+checked;
 $('catalogList').innerHTML=shown.length?shown.map(r=>{
  const selected=state.selected[r.id]||0;
  const entries=lootEntries(r);
  const unlock=getCatalogEntry('printer:'+r.id)?.routes[0]?.unlock||r.requires;
  const costs=(entries.length?entries.map(([name,n])=>fmt(n)+' x '+escape(name)).join(' · '):r.costs?'No loot ingredients listed':'No confirmed item requirements')+(!r.costs?' · Requirements unresolved: selection unavailable':'');
  return `<article class="catalogEntry">${installedRecipeImage(r)?`<img class="catalogThumb" src="assets/${escape(installedRecipeImage(r)!)}" alt="${escape(r.name)}">`:''}<div class="catalogText"><h3>${escape(r.name)}</h3><p>${costs}</p><p class="status">${r.ownerVerification?'Owner-verified item requirements':'Community-reported item requirements (not confirmed in game)'} · ${escape(r.checked||checked)}</p><p>${r.costs?'Confirm the current in-game requirements and unlocks before planning.':'This entry remains unavailable until its full requirements are verified.'}</p>${r.costConflict?`<p class="libraryUnknown"><strong>Conflicting reports:</strong> ${escape(r.costConflict)}</p>`:''}${itemBenefit(r)?`<p>${escape(itemBenefit(r)!)}</p>`:''}${unlock?`<p>Requires: ${escape(unlock)}</p>`:''}<details><summary>Source</summary><p class="sourceUrl">${(r.sources||[{url:r.source,checked}]).map(s=>escape(s.url)+' · checked '+escape(s.checked)).join('<br>')}</p></details></div>${r.costs?`<div class="catalogControl"><button class="secondary" data-recipe="${escape(r.id)}" aria-label="${selected?'Remove':'Add'} ${escape(r.name)}" aria-pressed="${!!selected}">${selected?'✓ Selected':'+ Select'}</button>${r.category!=='Upgrades'?`<label>${r.category==='Ingredients'?'Planned prints':'Quantity'} <input type="number" min="0" max="99" step="1" value="${selected}" data-quantity="${escape(r.id)}" aria-label="${escape(r.name)} quantity"></label>`:'<span class="micro">FIXED PERMANENT TIER</span>'}</div>`:'<span class="unconfirmed">Unconfirmed</span>'}</article>`;
 }).join(''):'<p>No matching recipes in this category.</p>';
}
const kindLabels:Record<string,string>={'printer-recipe':'Printer recipes & upgrades','weapon-manual':'Weapon Manuals','cosmetic-blueprint':'Cosmetic blueprints',item:'Items'};
const itemStatusLabels={have:'Have it',want:'Want it',neither:'Neither'} as const;
type WantedRaidGroup=ReturnType<typeof wantedRaidItems>[number];
let libraryPage=0;
const libraryPageSize=20;
function filteredLibraryEntries():CatalogEntry[]{
 return filterCatalog({search:$<HTMLInputElement>('librarySearch').value,category:$<HTMLSelectElement>('libraryCategory').value,kind:$<HTMLSelectElement>('libraryKind').value,season:$<HTMLSelectElement>('librarySeason').value,status:$<HTMLSelectElement>('libraryItemStatus').value},state).sort((a,b)=>compareNames(a.name,b.name)||compareNames(a.id,b.id));
}
function renderLibrary(){
 const shown=filteredLibraryEntries();
 const wantCount=shown.filter(entry=>getItemStatus(state,entry.id)==='neither').length;
 const clearCount=shown.filter(entry=>getItemStatus(state,entry.id)==='want').length;
 $('libraryWantAll').textContent='Select all matches as wanted ('+wantCount+')';
 ($('libraryWantAll') as HTMLButtonElement).disabled=wantCount===0;
 $('libraryClearWanted').textContent='Unselect wanted matches ('+clearCount+')';
 ($('libraryClearWanted') as HTMLButtonElement).disabled=clearCount===0;
 $('libraryBulkScope').textContent='Applies to all '+shown.length+' filtered matches across every page. Have it items are kept.';
 $('libraryUndoBulk').hidden=!bulkUndo;
 $('libraryUndoNote').hidden=!bulkUndo;
 const pages=Math.max(1,Math.ceil(shown.length/libraryPageSize));libraryPage=Math.max(0,Math.min(libraryPage,pages-1));
 const start=libraryPage*libraryPageSize;
 const dated=sortedNames(catalogEntries.map(entry=>entry.checked)).at(-1)||'2026-11-06';
 $('libraryStatus').textContent=shown.length+' matching records / '+catalogEntries.length+' catalog records · checked '+dated+(shown.length?' · showing '+(start+1)+'–'+Math.min(start+libraryPageSize,shown.length):'');
 $('libraryPageLabel').textContent='Page '+(libraryPage+1)+' of '+pages;
 ($('libraryPrevious') as HTMLButtonElement).disabled=libraryPage===0;
 ($('libraryNext') as HTMLButtonElement).disabled=libraryPage>=pages-1;
 $('libraryViewRaid').textContent='View raid checklist ('+wantedRaidItems(state).length+' wanted)';
 $('libraryList').innerHTML=shown.slice(start,start+libraryPageSize).map(entry=>{
  const status=getItemStatus(state,entry.id);
  const image=entry.image&&installedImageFiles.includes(entry.image)?entry.image:undefined;
  return `<article class="libraryCard librarySimpleCard" data-library-entry="${escape(entry.id)}" data-item-status-current="${status}">
   <div class="libraryCardHeading"><div class="libraryArt">${image?`<button type="button" class="libraryArtButton" data-artwork-preview="${escape(entry.id)}" aria-label="View image for ${escape(entry.name)}" aria-haspopup="dialog" aria-controls="artworkPreview"><img src="assets/${escape(image)}" alt="${escape(entry.imageLabel||entry.name)}" data-library-image><span class="libraryArtFallback" hidden>Image unavailable</span></button>`:'<span class="libraryArtFallback">No verified image</span>'}</div><div><p class="libraryBadges">${escape(kindLabels[entry.kind]||entry.kind)}${entry.season==='season-1'?' <span class="seasonBadge">SEASON 1</span>':''}</p><h3>${escape(entry.name)}</h3><p>${escape(entry.category)}</p></div></div>
   ${image&&(entry.imageLabel||entry.imageCredit)?`<p class="libraryImageCredit">${entry.imageLabel?'<span>'+escape(entry.imageLabel)+'</span>':''}${entry.imageCredit?'<span>Credit: '+escape(entry.imageCredit)+'</span>':''}</p>`:''}
   <div class="itemStatusControls" role="group" aria-label="Status for ${escape(entry.name)}">${(['have','want','neither'] as const).map(value=>`<button type="button" class="secondary itemStatusButton ${status===value?'isSelected':''}" data-item-status="${value}" data-status-id="${escape(entry.id)}" aria-pressed="${status===value}">${itemStatusLabels[value]}</button>`).join('')}</div>
   <details class="librarySources"><summary>Evidence &amp; sources</summary><p>${escape(entry.status)} · ${escape(entry.checked)}</p><p>${entry.sources.map(source=>escape(source.url)+' · checked '+escape(source.checked)).join('<br>')}</p></details>
  </article>`;
 }).join('')||'<p class="libraryNoResults">No records match these filters.</p>';
 for(const image of document.querySelectorAll<HTMLImageElement>('img[data-library-image]'))image.addEventListener('error',()=>{image.hidden=true;image.nextElementSibling?.removeAttribute('hidden');});
 $('librarySourceCoverage').textContent=catalogEntries.length+' library records: '+catalogEntries.filter(entry=>entry.kind==='printer-recipe').length+' printer recipes/upgrades, '+catalogEntries.filter(entry=>entry.kind==='weapon-manual').length+' Weapon Manual records, '+catalogEntries.filter(entry=>entry.kind==='cosmetic-blueprint').length+' cosmetic blueprints and '+catalogEntries.filter(entry=>entry.kind==='item').length+' other items. Available records do not establish a complete in-game catalog.';
}
function initializeLibraryFilters(){
 const options=(id:string,values:string[],labels:Record<string,string>={})=>{$<HTMLSelectElement>(id).innerHTML='<option value="all">All</option>'+values.map(value=>'<option value="'+escape(value)+'">'+escape(labels[value]||value)+'</option>').join('');};
 options('libraryCategory',sortedNames([...new Set(catalogEntries.map(entry=>entry.category))]));
 options('libraryKind',Object.keys(kindLabels),kindLabels);
 options('librarySeason',['season-1','preseason'],{'season-1':'Season 1','preseason':'Preseason'});
 options('libraryItemStatus',['have','want','neither'],itemStatusLabels);
 for(const id of ['libraryCategory','libraryKind','librarySeason','libraryItemStatus'])$(id).addEventListener('change',()=>{libraryPage=0;renderLibrary();});
 $('librarySearch').addEventListener('input',()=>{libraryPage=0;renderLibrary();});
 $('libraryPrevious').addEventListener('click',()=>{libraryPage--;renderLibrary();$('libraryStatus').focus();});
 $('libraryNext').addEventListener('click',()=>{libraryPage++;renderLibrary();$('libraryStatus').focus();});
 $('libraryReset').addEventListener('click',()=>{$<HTMLInputElement>('librarySearch').value='';for(const id of ['libraryCategory','libraryKind','librarySeason','libraryItemStatus'])$<HTMLSelectElement>(id).value='all';libraryPage=0;renderLibrary();$('librarySearch').focus();});
 $('libraryViewRaid').addEventListener('click',()=>setMode('raid'));
 $('libraryWantAll').addEventListener('click',()=>applyBulkWanted(filteredLibraryEntries().map(entry=>entry.id),true));
 $('libraryClearWanted').addEventListener('click',()=>{
  const entries=filteredLibraryEntries();
  const ids=entries.filter(entry=>getItemStatus(state,entry.id)==='want').map(entry=>entry.id);
  if(!ids.length)return;
  ask('Unselect '+ids.length+' wanted matches?','Remove Want it from '+ids.length+' matching records across all pages of the current '+entries.length+' filtered matches? Have it items and wanted records outside these matches are kept.',()=>applyBulkWanted(ids,false),'Unselect '+ids.length+' wanted matches');
 });
 $('libraryUndoBulk').addEventListener('click',()=>{
  if(!bulkUndo)return;
  const changes=bulkUndo.filter(change=>getItemStatus(state,change.id)===change.after);
  for(const change of changes)state=setItemStatus(state,change.id,change.before);
  bulkUndo=null;render();notice('Undid the bulk change for '+changes.length+' records. Later individual status changes were kept.');$('librarySearch').focus();
 });
}
function applyBulkWanted(ids:string[],wanted:boolean){
 const eligible=ids.filter(id=>getItemStatus(state,id)===(wanted?'neither':'want'));
 if(!eligible.length)return;
 const changes=eligible.map(id=>({id,before:getItemStatus(state,id),after:(wanted?'want':'neither') as ItemStatus}));
 state=setWantedBulk(state,eligible,wanted);
 bulkUndo=changes.filter(change=>getItemStatus(state,change.id)===change.after);
 render();notice((wanted?'Selected ':'Unselected ')+bulkUndo.length+' matching records '+(wanted?'as wanted.':'from wanted items.')+' Undo is available for this session.');
}
function wantedActions(group:WantedRaidGroup,merged=false):string {
 return '<div class="wantedActions"><button class="secondary" data-raid-have="'+escape(group.entry.id)+'" aria-label="Have '+escape(group.entry.name)+'">Have it</button><button class="secondary" data-raid-remove-want="'+escape(group.entry.id)+'" aria-label="Remove wanted '+escape(group.entry.name)+'">'+(merged?'Remove want':'Remove')+'</button></div>';
}
function wantedCard(group:WantedRaidGroup):string {
 const entry=group.entry,image=entry.image&&installedImageFiles.includes(entry.image)?entry.image:undefined;
 return `<article class="item wantedItem" data-wanted-card="${escape(entry.id)}"><div class="art">${image?`<button type="button" class="libraryArtButton wantedArtButton" data-artwork-preview="${escape(entry.id)}" aria-label="View image for ${escape(entry.name)}" aria-haspopup="dialog" aria-controls="artworkPreview"><img src="assets/${escape(image)}" alt="${escape(entry.imageLabel||entry.name)}" data-game-image="true"><span class="fallback" hidden>Image unavailable</span></button>`:'<span class="fallback">No verified image yet</span>'}</div><div class="itembody"><span class="wantedBadge">Wanted item</span><h3>${escape(entry.name)}</h3><p class="for">${escape(entry.category)}</p>${image&&(entry.imageLabel||entry.imageCredit)?`<p class="libraryImageCredit">${entry.imageLabel?'<span>'+escape(entry.imageLabel)+'</span>':''}${entry.imageCredit?'<span>Credit: '+escape(entry.imageCredit)+'</span>':''}</p>`:''}${wantedActions(group)}</div></article>`;
}
function clearRecoveryRaw():string|null {
 return localStorage.getItem(clearRecoveryKey)??localStorage.getItem(previousKey+'-before-clear')??localStorage.getItem(olderKey+'-before-clear');
}

function render(){
 const raid=mode==='raid',library=mode==='library';$('plan').hidden=mode!=='plan';$('raidIntro').hidden=!raid;$('library').hidden=!library;$('items').hidden=library;$('printingNote').hidden=library;$('empty').hidden=library;
 for(const [id,active] of [['planTab',mode==='plan'],['raidTab',raid],['libraryTab',library]] as const){$(id).classList.toggle('active',active);if(active)$(id).setAttribute('aria-current','page');else $(id).removeAttribute('aria-current');}
 $<HTMLInputElement>('hideDone').checked=state.hideCompleted;
 renderGoals();renderCatalog();renderLibrary();
 const totals=recipeTotals(state),targets=raidTargets(state);
 const active=sortedNames(Object.keys(targets));const wanted=active;
 const wantedGroups=wantedRaidItems(state);
 const wantedByMaterial=new Map(wantedGroups.filter(group=>group.materialName).map(group=>[group.materialName!,group]));
 const standaloneWanted=wantedGroups.filter(group=>!group.materialName);
 $('wantedRaidSummary').hidden=!raid||wantedGroups.length===0;
 $('wantedRaidSummary').textContent=wantedGroups.length+' wanted item'+(wantedGroups.length===1?'':'s')+' · use Have it when you find one.';
 $('materialProgressLine').hidden=active.length===0;
 const omitted=sortedNames(Object.keys(totals).filter(name=>name!=='DMZ Cash'&&totals[name]>0&&!targets[name]));
 $('omittedSection').hidden=omitted.length===0;
 $('omittedCount').textContent=String(omitted.length);
 if(!omitted.length)$<HTMLDetailsElement>('omittedSection').open=false;
 $('omittedTargets').innerHTML=omitted.map(name=>'<p>'+escape(name)+' · recipe baseline '+fmt(totals[name])+' <button class="secondary targetAction" data-reset-target="'+escape(name)+'" aria-label="Use baseline for '+escape(name)+'">Use baseline</button></p>').join('');

 const printing=plannedProduction(state);$('printingNote').hidden=library||!Object.keys(printing).length;$('printingNote').textContent='Planned printing: '+sortedNames(Object.keys(printing)).map(name=>fmt(printing[name])+' '+name).join(', ')+'. These planned outputs offset matching required ingredients once. Print only with already-unlocked recipes; no other recipe is expanded automatically and no real production is credited.';
 $('navCount').textContent=String(active.length+standaloneWanted.length);
 let collected=0,total=0;
 for(const name of wanted){total+=targets[name];collected+=Math.min(targets[name],state.picked[name]||0);}
 const done=wanted.filter(name=>isComplete(state,name,targets[name])).length;
 $('progressText').textContent=fmt(collected)+' / '+fmt(total)+' picked up · '+done+' / '+wanted.length+' targets done';
 $<HTMLProgressElement>('progress').max=total||1;$<HTMLProgressElement>('progress').value=collected;
 const shown=active.filter(name=>!raid||(targets[name]>0&&(!state.hideCompleted||!isComplete(state,name,targets[name])||wantedByMaterial.has(name))));
 $('items').innerHTML=shown.map(name=>{
  const target=targets[name],picked=state.picked[name]||0,complete=isComplete(state,name,target),asset=art[name],wantedGroup=raid?wantedByMaterial.get(name):undefined;
  const users=[...recipes.filter(r=>(state.selected[r.id]||0)>0&&r.costs?.[name]).map(r=>r.id==='gunsmith'?'Gunsmith I':r.id==='stash'?'Stash II':r.name),...Object.entries(state.acquisitionPlans).filter(([id,plan])=>!!getCatalogRoute(id,plan.routeId)?.requirements?.[name]).map(([id])=>getCatalogEntry(id)!.name)].join(' + ');
  return `<article class="item ${asset?.rarity||''} ${raid&&complete?'done':''} ${wantedGroup?'withWanted':''}" data-card="${escape(name)}"><div class="art">${asset?`<span class="rarity" title="${asset.rarity}"></span>${materialImage(name,asset)}<span class="fallback" hidden>Image unavailable</span>`:'<span class="fallback">No verified image yet</span>'}${raid?`<button class="complete" data-complete="${escape(name)}" aria-label="${complete?'Uncheck':'Complete'} ${escape(name)}" aria-pressed="${complete}">${complete?'✓':'○'}</button>`:''}</div><div class="itembody">${wantedGroup?'<span class="wantedBadge">Wanted item</span>':''}<h3>${escape(name)}</h3><div class="for">${escape(users||'Manual extra')}</div>${raid?`<div class="count">${fmt(Math.max(0,target-picked))} <span>left to find</span></div><div class="for">${fmt(picked)} picked up / ${fmt(target)} target${state.completed.includes(name)?' · checked manually':''}</div><div class="controls"><button data-delta="-1" data-item="${escape(name)}" aria-label="Remove one ${escape(name)}">−</button><button class="add" data-delta="1" data-item="${escape(name)}" aria-label="Collect one ${escape(name)}">+</button></div>`:`<p class="required">Recipe baseline: ${fmt(totals[name]||0)} · Adjustment: ${(state.adjustments[name]||0)>0?'+':''}${fmt(state.adjustments[name]||0)} · Extra: +${fmt(state.extras[name]||0)}</p><label class="target">Need this raid <input aria-label="${escape(name)} target" type="number" min="0" max="100000000" step="1" value="${target}" data-target="${escape(name)}"></label><div class="targetActions">${state.adjustments[name]?`<button class="secondary targetAction" data-reset-target="${escape(name)}" aria-label="Reset ${escape(name)} adjustment">Reset adjustment</button>`:''}${state.extras[name]?`<button class="secondary targetAction" data-remove-extra="${escape(name)}" aria-label="Remove ${escape(name)} extra">Remove extra</button>`:''}</div>`}<button class="secondary targetAction itemRemove" data-remove-target="${escape(name)}" aria-label="Remove ${escape(name)} from list">Remove item</button>${wantedGroup?wantedActions(wantedGroup,true):''}</div></article>`;
 }).join('')+(raid?standaloneWanted.map(wantedCard).join(''):'');
 for(const img of document.querySelectorAll<HTMLImageElement>('img[data-game-image]'))img.addEventListener('error',()=>{const view=img.closest<HTMLElement>('.source-crop')||img;view.hidden=true;const fallback=img.closest('.art')?.querySelector<HTMLElement>('.fallback');if(fallback)fallback.hidden=false;});
 $('empty').hidden=library||shown.length>0||(raid&&standaloneWanted.length>0);
 $('empty').textContent=raid&&wanted.length?'All '+wanted.length+' targets are complete and hidden. Turn off Hide completed to review them.':Object.keys(totals).some(name=>name!=='DMZ Cash'&&totals[name]>0)?'All recipe items are omitted for this raid. Expand Omitted for this raid to restore an item, or select another goal.':'No raid targets. Select a goal or add manual extras in Plan your raid.';
 $('settingsClear').toggleAttribute('disabled',!Object.keys(state.selected).length&&!Object.keys(state.acquisitionPlans).length&&!Object.keys(state.adjustments).length&&!Object.keys(state.extras).length&&!Object.keys(state.picked).length&&!state.completed.length&&!state.wanted.length);
 try{$('settingsRestoreClear').toggleAttribute('disabled',clearRecoveryRaw()===null);}catch{$('settingsRestoreClear').setAttribute('disabled','');}
 save();
}
document.addEventListener('click',event=>{
 const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button');if(!button)return;
 const d=button.dataset;
 try {
  if(d.artworkPreview)openArtworkPreview(d.artworkPreview,button);
  if(d.statusId&&d.itemStatus){
   const status=d.itemStatus;if(status!=='have'&&status!=='want'&&status!=='neither')throw new Error('Choose a supported item status.');
   const entry=getCatalogEntry(d.statusId)!;state=setItemStatus(state,entry.id,status);render();
   notice(status==='want'?entry.name+' added to Raid checklist.':status==='have'?entry.name+' marked Have it.':entry.name+' set to Neither.');
   const control=document.querySelector<HTMLButtonElement>('button[data-status-id="'+CSS.escape(entry.id)+'"][data-item-status="'+status+'"]');(control||$('librarySearch')).focus();
  }
  if(d.raidHave||d.raidRemoveWant){
   const id=d.raidHave||d.raidRemoveWant;const group=wantedRaidItems(state).find(value=>value.entry.id===id||value.ids.includes(id!));
   if(group){for(const itemId of group.ids)state=setItemStatus(state,itemId,d.raidHave?'have':'neither');render();notice(d.raidHave?group.entry.name+' marked Have it.':group.entry.name+' removed from wanted items.');$('raidTab').focus();}
  }
  if(d.summaryRemove){state=chooseRecipe(state,d.summaryRemove,0);notice('Goal removed. Other goals, manual extras and picked-up counts are kept.');render();$('addUpgrades').focus();}
  if(d.removeTarget){state=setRaidTarget(state,d.removeTarget,0);notice(d.removeTarget+' removed from this raid list. New raid keeps this removal. Expand Omitted for this raid to restore recipe items.');render();}
  if(d.resetTarget){state=resetAdjustments(state,d.resetTarget);notice('Recipe adjustment reset. Manual extras kept.');render();}
  if(d.removeExtra){state=removeExtra(state,d.removeExtra);notice('Manual extra removed.');render();}
  if(d.recipe){const current=state.selected[d.recipe]||0;state=chooseRecipe(state,d.recipe,current?0:1);notice('Recipe baselines updated. Adjustments follow needed ingredients; manual extras stay until removed.');render();}
  if(d.item){const value=count(Math.max(0,Math.min(maxCount,(state.picked[d.item]||0)+Number(d.delta))));state.picked[d.item]=value;if(d.delta==='-1')state.completed=state.completed.filter(k=>k!==d.item);render();document.querySelector<HTMLButtonElement>(`button[data-item="${CSS.escape(d.item)}"][data-delta="${d.delta}"]`)?.focus();}
  if(d.complete){const target=raidTargets(state)[d.complete]||0;if(isComplete(state,d.complete,target)){state.completed=state.completed.filter(k=>k!==d.complete);if((state.picked[d.complete]||0)>=target)notice('This target is complete from picked-up counts. Use − to correct a count.');}else state.completed.push(d.complete);render();}
 }catch(e){showError(e);}
});
document.addEventListener('change',event=>{
 const input=event.target as HTMLInputElement;
 try {
  if(input.dataset.target){if(input.value.trim()==='')throw new Error('Enter a whole-number target.');state=setRaidTarget(state,input.dataset.target,count(Number(input.value)));render();}
  if(input.dataset.quantity){if(input.value.trim()==='')throw new Error('Enter a whole-number quantity.');state=chooseRecipe(state,input.dataset.quantity,count(Number(input.value),99));render();}
 }catch(e){showError(e);render();}
});
$('planTab').addEventListener('click',()=>setMode('plan'));
$('libraryTab').addEventListener('click',()=>setMode('library'));
for(const id of ['raidTab','startRaid'])$(id).addEventListener('click',()=>setMode('raid'));
$('hideDone').addEventListener('change',()=>{state.hideCompleted=$<HTMLInputElement>('hideDone').checked;render();});
$('newRaid').addEventListener('click',()=>ask('Start a new raid?','Clear this raid’s picked-up counts and manual checks? Recipe selections, raid targets and Have it / Want it choices will stay the same.',()=>{state=newRaid(state);notice('New raid ready. Targets kept; picked-up counts and checks cleared.');render();},'New raid'));
$('restoreTotals').addEventListener('click',()=>ask('Reset recipe adjustments?','Use the selected recipes’ baseline amounts again? Explicit manual extras and picked-up counts will stay.',()=>{state=resetAdjustments(state);notice('Recipe adjustments reset; manual extras kept.');render();},'Reset adjustments'));
$('addTarget').addEventListener('click',()=>{try{const name=$<HTMLSelectElement>('directItem').value;const input=$<HTMLInputElement>('directCount');if(!input.value.trim())throw new Error('Enter an extra quantity.');state=addExtra(state,name,count(Number(input.value)));notice(name+' extra added.');render();}catch(e){showError(e);}});

$('category').addEventListener('change',renderCatalog);$('search').addEventListener('input',renderCatalog);
function exportBackup(){try{fileDownload(serialize(state),'DMZ-Raid-Board-backup-'+new Date().toISOString().slice(0,10)+'.json');if(settings.open){$('settingsMessage').textContent='Backup export started. Choose where to save the JSON file.';$('settingsMessage').hidden=false;}}catch(e){showError(e);}}
function importBackup(){openSettings();$('settingsImport').focus();$<HTMLInputElement>('importFile').value='';$<HTMLInputElement>('importFile').click();}
$('backup').addEventListener('click',exportBackup);$('settingsBackup').addEventListener('click',exportBackup);$('settingsImport').addEventListener('click',importBackup);
$('import').addEventListener('click',importBackup);
$('importFile').addEventListener('change',async()=>{
 const file=$<HTMLInputElement>('importFile').files?.[0];if(!file)return;
 try {if(file.size>1_000_000)throw new Error('Backup is too large (maximum 1 MB).');const original=await file.text();const next=parseBackup(original);const importVersion=JSON.parse(original).version;const legacyImport=importVersion===1;ask('Replace your board?','Import this valid backup and replace your current selections, raid targets, picked-up counts, checks, Have it items and wanted list? Your current board will be retained as a local recovery copy.',()=>{try{localStorage.setItem(key+'-recovery',corruptRaw??serialize(state));localStorage.setItem(key+'-last-import-original',original);localStorage.setItem(key,serialize(next));}catch{throw new Error('Could not preserve the current board. Export a backup first; import canceled.');}state=next;bulkUndo=null;corruptRaw=null;storageAvailable=true;$('recovery').hidden=true;if(settings.open)closeSettings();notice(legacyImport?'Older backup imported: positive targets became labeled adjustments or extras; old zero overrides were dropped so selected baselines are visible. Review manual extras below; your original file is unchanged.':importVersion<4?'Older backup imported. Existing printer plans and any wanted items were retained. Older found/unlocked notes were kept without marking items Have it.':'Backup imported, including Have it and Want it choices.');render();},'Import backup');}catch(e){showError(e);}
});
// Save the recovery snapshot and replacement before changing session state. Failure leaves the board intact.
function replaceWithRecovery(next:BoardState,snapshotKey:string){
 if(corruptRaw!==null)throw new Error('Recover the unreadable saved board first.');
 try{localStorage.setItem(snapshotKey,serialize(state));localStorage.setItem(key,serialize(next));}catch{throw new Error('Recovery/replacement could not be saved. Your list has not changed; export a backup first.');}
 state=next;bulkUndo=null;storageAvailable=true;mode='plan';try{localStorage.setItem('dmz-raid-board-mode-v4',mode);}catch{}render();
}
$('settingsClear').addEventListener('click',()=>ask('Clear entire list?','Remove all selected goals, wanted items, recipe adjustments, manual extras, picked-up counts and checks? A recovery copy will be saved first. Have it items, older unlock notes and your theme are kept.',()=>{replaceWithRecovery({...emptyState(),owned:[...state.owned],blueprintProgress:{...state.blueprintProgress}},clearRecoveryKey);notice('Entire list cleared, including wanted items. Restore cleared list is available here.');$('settingsRestoreClear').focus();},'Clear entire list'));
$('settingsRestoreClear').addEventListener('click',()=>{try{const raw=clearRecoveryRaw();if(raw===null)throw new Error('No cleared list is available.');const previous=parseBackup(raw);ask('Restore cleared list?','Replace your current plan, wanted items and raid progress with the saved cleared list? The current list will be saved as a recovery copy. Your latest Have it items, older unlock notes and theme are kept.',()=>{replaceWithRecovery({...previous,owned:[...state.owned],blueprintProgress:{...state.blueprintProgress},wanted:previous.wanted.filter(id=>!state.owned.includes(id))},key+'-before-restore-clear');notice('Cleared list restored.');},'Restore list');}catch(e){showError(e);}});
$('exportRecovery').addEventListener('click',()=>{if(corruptRaw!==null)fileDownload(corruptRaw,'DMZ-Raid-Board-recovery.txt');});
$('freshBoard').addEventListener('click',()=>ask('Start a fresh board?','Keep the unreadable saved text as a recovery copy and replace the active board with an empty board?',()=>{try{localStorage.setItem(key+'-recovery',corruptRaw||'');}catch{throw new Error('Recovery copy could not be saved. Export the saved text first.');}state=emptyState();bulkUndo=null;corruptRaw=null;storageAvailable=true;$('recovery').hidden=true;render();},'Start fresh'));
$('sourcesBtn').addEventListener('click',()=>$<HTMLDialogElement>('sources').showModal());
$('closeSources').addEventListener('click',()=>$<HTMLDialogElement>('sources').close());
$<HTMLSelectElement>('category').innerHTML='<option>All</option>'+categories.map(c=>`<option ${c==='Upgrades'?'selected':''}>${c}</option>`).join('');
$<HTMLSelectElement>('directItem').innerHTML=catalogMaterials.filter(m=>m!=='DMZ Cash').map(m=>`<option>${escape(m)}</option>`).join('');
const coverage=`${recipes.length} entries · ${recipes.filter(r=>r.costs).length} selectable · ${Object.keys(art).length} target images`;
$('coverage').textContent=coverage;$('sourceCoverage').textContent=coverage+'. '+recipes.filter(r=>!r.costs).length+' entries have unresolved requirements and are disabled. Category coverage does not mean complete recipe coverage.';
$('unconfirmedList').textContent=recipes.filter(r=>!r.costs).map(r=>r.name).join(', ')||'None in this catalog snapshot';
initializeLibraryFilters();
render();
if(migratedLegacy){$('migrationNotice').hidden=false;$('migrationNotice').textContent=(migratedVersion===1?'Older positive targets became adjustments or extras and stale zero overrides were dropped. ':'')+'Your existing printer plans and raid counts were carried forward. Any wanted items now appear directly in Raid checklist. Older found/unlocked notes were retained without marking items Have it. The original saved board remains unchanged for rollback.';}
