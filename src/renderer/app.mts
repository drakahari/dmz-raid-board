import {themes,normalizeTheme,themeKey,defaultTheme} from './themes.mjs';
import {buildFlavor,appVersion} from './build-status.mjs';
import {recipes,categories,materials,art as knownArt,checked,type Recipe,type Category,type ArtAsset} from './catalog.mjs';
import {catalogEntries,catalogMaterials,getCatalogEntry,getCatalogRoute,filterCatalog,type CatalogEntry,type AcquisitionRoute} from './acquisition.mjs';
import {installedImageFiles} from './asset-status.mjs';
import {compareNames,sortedNames} from './ordering.mjs';
import {type BoardState,emptyState,parseBackup,serialize,count,recipeTotals,raidTargets,chooseRecipe,isComplete,plannedProduction,newRaid,maxCount,setRaidTarget,addExtra,removeExtra,resetAdjustments,setBlueprintProgress,setWanted,chooseAcquisition,acquisitionQuantity} from './core.mjs';
const $ = <T extends HTMLElement = HTMLElement>(id:string) => document.getElementById(id) as T;
$('buildLabel').textContent=buildFlavor==='public'?'PUBLIC PRERELEASE / NO GAME ART':buildFlavor==='artwork'?'UNOFFICIAL PRERELEASE / GAME ART':'PRIVATE WINDOWS PROTOTYPE / 01';
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
const key='dmz-raid-board-state-v3';
const previousKey='dmz-raid-board-state-v2';
const legacyKey='dmz-raid-board-state-v1';
const clearRecoveryKey=key+'-before-clear';
let migratedLegacy=false;
let migratedVersion=3;
$('appVersion').textContent='DMZ Raid Board '+appVersion;
const fmt=(n:number)=>n.toLocaleString();
const art=Object.fromEntries(Object.entries(knownArt).filter(([,asset])=>asset.verified!==false&&installedImageFiles.includes(asset.file)));
let state:BoardState=emptyState();
type ViewMode='plan'|'raid'|'library';
let mode:ViewMode='plan';
const libraryRoutes=new Map<string,string>();
const libraryQuantities=new Map<string,string>();
let corruptRaw:string|null=null;
let storageAvailable=true;
try {
 const raw=localStorage.getItem(key)??localStorage.getItem(previousKey)??localStorage.getItem(legacyKey);
 if(raw!==null){try{state=parseBackup(raw);migratedVersion=JSON.parse(raw).version;migratedLegacy=migratedVersion<3;}catch(e){corruptRaw=raw;$('recovery').hidden=false;$('recoveryReason').textContent=String((e as Error).message);}if(migratedLegacy){try{if(localStorage.getItem(key+'-before-migration')===null)localStorage.setItem(key+'-before-migration',raw);}catch{storageAvailable=false;}}}
 const savedMode=localStorage.getItem('dmz-raid-board-mode-v3')??localStorage.getItem('dmz-raid-board-mode-v2')??localStorage.getItem('dmz-raid-board-mode');if(savedMode==='raid'||savedMode==='library')mode=savedMode;
}catch{storageAvailable=false;}

let pending:(()=>void)|null=null;
let lastFocus:HTMLElement|null=null;
const confirmDialog=$<HTMLDialogElement>('confirmDialog');
function notice(message:string){const target=settings.open?$('settingsMessage'):$('notice');const other=settings.open?$('notice'):$('settingsMessage');target.textContent=message;target.hidden=!message;other.textContent='';other.hidden=true;}
function showError(error:unknown){notice(error instanceof Error?error.message:'This action could not be completed. Your board has not changed.');}
function save(){
 if(corruptRaw!==null){$('saved').textContent='Session only · saved data needs recovery';return;}
 try {if(!storageAvailable)throw new Error('Storage unavailable');localStorage.setItem(key,serialize(state));localStorage.setItem('dmz-raid-board-mode-v3',mode);$('saved').textContent='● Saved on this device';}
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
 $('goalEmpty').hidden=goals.length>0||Object.keys(state.acquisitionPlans).length>0;
 $('upgrades').innerHTML=goals.map(r=>`<article class="upgrade on selectedGoal" data-goal="${escape(r.id)}"><span class="symbol" aria-hidden="true">${installedRecipeImage(r)?`<img src="assets/${escape(installedRecipeImage(r)!)}" alt="">`:'+'}</span><div class="goalText"><h3>${escape(r.name)}</h3><p>${r.id==='gunsmith'?'Gunsmith upgrade goal':r.id==='stash'?'Expand your item stash':escape(itemBenefit(r)||r.category)}</p><p>${escape(costText(r))}${r.category!=='Upgrades'?' · Quantity '+(state.selected[r.id]||0):''}</p></div><button class="secondary goalRemove" data-summary-remove="${escape(r.id)}" aria-label="Remove ${escape(r.name)} goal">Remove</button></article>`).join('');
}
function renderAcquisitionGoals(){
 for(const [entryId,plan] of Object.entries(state.acquisitionPlans)){
  const entry=getCatalogEntry(entryId),route=getCatalogRoute(entryId,plan.routeId);if(!entry||!route)continue;
  const card=document.createElement('article');card.className='upgrade on selectedGoal';card.dataset.acquisitionGoal=entryId;
  card.innerHTML='<span class="symbol" aria-hidden="true">+</span><div class="goalText"><h3>'+escape(entry.name)+'</h3><p>'+escape(route.label)+'</p><p>Quantity '+fmt(plan.quantity)+'</p></div><button class="secondary goalRemove" data-acquisition-remove="'+escape(entryId)+'" aria-label="Remove '+escape(entry.name)+' acquisition goal">Remove</button>';
  $('upgrades').append(card);
 }
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
const methodLabels:Record<string,string>={printer:'3D Printer',gunsmith:'Gunsmith',vendor:'Vendor',loot:'Loot / extraction',reward:'Reward / unlock','battle-pass':'Battle Pass',store:'Store',unknown:'Unknown route'};
let libraryPage=0;
const libraryPageSize=20;
function currentRoute(entry:CatalogEntry):AcquisitionRoute {
 const id=libraryRoutes.get(entry.id)||state.acquisitionPlans[entry.id]?.routeId;
 return entry.routes.find(route=>route.id===id)||entry.routes[0];
}
function renderLibrary(){
 const shown=filterCatalog({search:$<HTMLInputElement>('librarySearch').value,category:$<HTMLSelectElement>('libraryCategory').value,kind:$<HTMLSelectElement>('libraryKind').value,season:$<HTMLSelectElement>('librarySeason').value,method:$<HTMLSelectElement>('libraryMethod').value,progress:$<HTMLSelectElement>('libraryProgress').value,wantedOnly:$<HTMLInputElement>('libraryWanted').checked},state).sort((a,b)=>compareNames(a.name,b.name)||compareNames(a.id,b.id));
 const pages=Math.max(1,Math.ceil(shown.length/libraryPageSize));libraryPage=Math.max(0,Math.min(libraryPage,pages-1));
 const start=libraryPage*libraryPageSize;
 const dated=sortedNames(catalogEntries.map(entry=>entry.checked)).at(-1)||'2026-11-06';
 $('libraryStatus').textContent=shown.length+' matching records / '+catalogEntries.length+' catalog records · checked '+dated+(shown.length?' · showing '+(start+1)+'–'+Math.min(start+libraryPageSize,shown.length):'');
 $('libraryPageLabel').textContent='Page '+(libraryPage+1)+' of '+pages;
 ($('libraryPrevious') as HTMLButtonElement).disabled=libraryPage===0;
 ($('libraryNext') as HTMLButtonElement).disabled=libraryPage>=pages-1;
 $('libraryList').innerHTML=shown.slice(start,start+libraryPageSize).map(entry=>{
  const route=currentRoute(entry),quantity=acquisitionQuantity(state,entry.id,route.id),hasPlan=acquisitionQuantity(state,entry.id)>0;
  const progress:string=state.blueprintProgress[entry.id]||'not-found',wanted=state.wanted.includes(entry.id);
  const image=entry.image&&installedImageFiles.includes(entry.image)?entry.image:undefined;
  const known=route.requirements!==null&&Object.keys(route.requirements).length>0;
  const requirements=known?Object.entries(route.requirements!).filter(([name])=>name!=='DMZ Cash').map(([name,n])=>fmt(n)+' × '+escape(name)).join(' · '):'';
  const entered=libraryQuantities.get(entry.id)??String(quantity||1);
  const max=entry.category==='Upgrades'?1:99;
  const sources=route.sources?.length?route.sources:entry.sources;
  return `<article class="libraryCard" data-library-entry="${escape(entry.id)}">
   <div class="libraryCardHeading"><div class="libraryArt">${image?`<button type="button" class="libraryArtButton" data-artwork-preview="${escape(entry.id)}" aria-label="View image for ${escape(entry.name)}" aria-haspopup="dialog" aria-controls="artworkPreview"><img src="assets/${escape(image)}" alt="${escape(entry.imageLabel||entry.name)}" data-library-image><span class="libraryArtFallback" hidden>Image unavailable</span></button>`:'<span class="libraryArtFallback">No verified image</span>'}</div><div><p class="libraryBadges">${escape(kindLabels[entry.kind]||entry.kind)}${entry.season==='season-1'?' <span class="seasonBadge">SEASON 1</span>':''}</p><h3>${escape(entry.name)}</h3><p>${escape(entry.category)}</p></div></div>
   ${image&&(entry.imageLabel||entry.imageCredit)?`<p class="libraryImageCredit">${entry.imageLabel?'<span>'+escape(entry.imageLabel)+'</span>':''}${entry.imageCredit?'<span>Credit: '+escape(entry.imageCredit)+'</span>':''}</p>`:''}
   <p>${escape(entry.description)}</p><p class="libraryEvidence">${escape(entry.status)} · ${escape(entry.checked)}</p>
   ${entry.blueprintRequirement?`<p>${escape(entry.blueprintRequirement)}</p>`:''}
   <div class="libraryProgress">${entry.kind!=='item'?`<label>Your unlock record<select data-blueprint-progress="${escape(entry.id)}" aria-label="${escape(entry.name)} blueprint progress"><option value="not-found" ${progress==='not-found'?'selected':''}>Not recorded</option><option value="found" ${progress==='found'?'selected':''}>Found / acquired</option><option value="unlocked" ${progress==='unlocked'?'selected':''}>Unlocked</option></select></label>`:'<span class="micro">ITEM · NO BLUEPRINT PROGRESS</span>'}<button class="secondary wantedButton" data-wanted="${escape(entry.id)}" aria-label="${wanted?'Unmark':'Mark'} ${escape(entry.name)} wanted" aria-pressed="${wanted}">${wanted?'Wanted ✓':'Want this'}</button></div>
   <div class="libraryRoute"><label>Acquisition route<select data-library-route="${escape(entry.id)}" aria-label="${escape(entry.name)} acquisition route">${entry.routes.map(r=>`<option value="${escape(r.id)}" ${r.id===route.id?'selected':''}>${escape(r.label)}</option>`).join('')}</select></label>
   <p class="libraryRouteMethod">${escape(methodLabels[route.method]||route.method)}${route.location?' · '+escape(route.location):''}</p>${route.unlock?`<p><strong>Unlock:</strong> ${escape(route.unlock)}</p>`:''}${route.note?`<p>${escape(route.note)}</p>`:''}
   <p class="${known?'libraryRequirements':'libraryUnknown'}">${known?(requirements||'No loot ingredient amounts on this route.'):'Loot requirements unknown or not applicable to this acquisition. No craft quantities assumed.'}${route.outputQuantity?'<br>Output per plan: '+fmt(route.outputQuantity):''}</p>
   <div class="libraryPlan"><label>Planned quantity<input data-catalog-quantity="${escape(entry.id)}" aria-label="${escape(entry.name)} planned quantity" type="number" min="0" max="${max}" step="1" value="${escape(entered)}" ${known?'':'disabled'}></label><button class="secondary" data-catalog-plan="${escape(entry.id)}" ${known?'':'disabled'}>${quantity?'Update plan':'Add to raid plan'}</button>${hasPlan?`<button class="secondary" data-catalog-remove="${escape(entry.id)}">Remove plan</button>`:''}</div>
   ${hasPlan?`<p class="libraryPlanned">Planned: ${acquisitionQuantity(state,entry.id)}${state.acquisitionPlans[entry.id]?' · '+escape(getCatalogRoute(entry.id,state.acquisitionPlans[entry.id].routeId)!.label):''}</p>`:''}
   </div>${entry.isLoot?`<div class="libraryLootTarget"><label>Loot target quantity<input data-catalog-track-quantity="${escape(entry.id)}" aria-label="${escape(entry.name)} loot target quantity" type="number" min="1" max="99" step="1" value="1"></label><button class="secondary" data-catalog-track="${escape(entry.id)}">Add item to raid</button><p>Add this loot item itself as a manual extra. Its acquisition requirements and unlock record stay separate.</p></div>`:''}<details class="librarySources"><summary>Evidence &amp; sources</summary><p>${sources.map(source=>escape(source.url)+' · checked '+escape(source.checked)).join('<br>')}</p></details>
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
 options('libraryMethod',Object.keys(methodLabels),methodLabels);
 options('libraryProgress',['not-found','found','unlocked'],{'not-found':'Not recorded',found:'Found / acquired',unlocked:'Unlocked'});
 for(const id of ['libraryCategory','libraryKind','librarySeason','libraryMethod','libraryProgress','libraryWanted'])$(id).addEventListener('change',()=>{libraryPage=0;renderLibrary();});
 $('librarySearch').addEventListener('input',()=>{libraryPage=0;renderLibrary();});
 $('libraryPrevious').addEventListener('click',()=>{libraryPage--;renderLibrary();$('libraryStatus').focus();});
 $('libraryNext').addEventListener('click',()=>{libraryPage++;renderLibrary();$('libraryStatus').focus();});
 $('libraryReset').addEventListener('click',()=>{$<HTMLInputElement>('librarySearch').value='';for(const id of ['libraryCategory','libraryKind','librarySeason','libraryMethod','libraryProgress'])$<HTMLSelectElement>(id).value='all';$<HTMLInputElement>('libraryWanted').checked=false;libraryPage=0;renderLibrary();$('librarySearch').focus();});
}

function render(){
 const raid=mode==='raid',library=mode==='library';$('plan').hidden=mode!=='plan';$('raidIntro').hidden=!raid;$('library').hidden=!library;$('items').hidden=library;$('printingNote').hidden=library;$('empty').hidden=library;
 for(const [id,active] of [['planTab',mode==='plan'],['raidTab',raid],['libraryTab',library]] as const){$(id).classList.toggle('active',active);if(active)$(id).setAttribute('aria-current','page');else $(id).removeAttribute('aria-current');}
 $<HTMLInputElement>('hideDone').checked=state.hideCompleted;
 renderGoals();renderAcquisitionGoals();renderCatalog();renderLibrary();
 const totals=recipeTotals(state),targets=raidTargets(state);
 const active=sortedNames(Object.keys(targets));const wanted=active;
 const omitted=sortedNames(Object.keys(totals).filter(name=>name!=='DMZ Cash'&&totals[name]>0&&!targets[name]));
 $('omittedSection').hidden=omitted.length===0;
 $('omittedCount').textContent=String(omitted.length);
 if(!omitted.length)$<HTMLDetailsElement>('omittedSection').open=false;
 $('omittedTargets').innerHTML=omitted.map(name=>'<p>'+escape(name)+' · recipe baseline '+fmt(totals[name])+' <button class="secondary targetAction" data-reset-target="'+escape(name)+'" aria-label="Use baseline for '+escape(name)+'">Use baseline</button></p>').join('');

 const printing=plannedProduction(state);$('printingNote').hidden=library||!Object.keys(printing).length;$('printingNote').textContent='Planned printing: '+sortedNames(Object.keys(printing)).map(name=>fmt(printing[name])+' '+name).join(', ')+'. These planned outputs offset matching required ingredients once. Print only with already-unlocked recipes; no other recipe is expanded automatically and no real production is credited.';
 $('navCount').textContent=String(wanted.length);
 let collected=0,total=0;
 for(const name of wanted){total+=targets[name];collected+=Math.min(targets[name],state.picked[name]||0);}
 const done=wanted.filter(name=>isComplete(state,name,targets[name])).length;
 $('progressText').textContent=fmt(collected)+' / '+fmt(total)+' picked up · '+done+' / '+wanted.length+' targets done';
 $<HTMLProgressElement>('progress').max=total||1;$<HTMLProgressElement>('progress').value=collected;
 const shown=active.filter(name=>!raid||(targets[name]>0&&(!state.hideCompleted||!isComplete(state,name,targets[name]))));
 $('items').innerHTML=shown.map(name=>{
  const target=targets[name],picked=state.picked[name]||0,complete=isComplete(state,name,target),asset=art[name];
  const users=[...recipes.filter(r=>(state.selected[r.id]||0)>0&&r.costs?.[name]).map(r=>r.id==='gunsmith'?'Gunsmith I':r.id==='stash'?'Stash II':r.name),...Object.entries(state.acquisitionPlans).filter(([id,plan])=>!!getCatalogRoute(id,plan.routeId)?.requirements?.[name]).map(([id])=>getCatalogEntry(id)!.name)].join(' + ');
  return `<article class="item ${asset?.rarity||''} ${raid&&complete?'done':''}" data-card="${escape(name)}"><div class="art">${asset?`<span class="rarity" title="${asset.rarity}"></span>${materialImage(name,asset)}<span class="fallback" hidden>Image unavailable</span>`:'<span class="fallback">No verified image yet</span>'}${raid?`<button class="complete" data-complete="${escape(name)}" aria-label="${complete?'Uncheck':'Complete'} ${escape(name)}" aria-pressed="${complete}">${complete?'✓':'○'}</button>`:''}</div><div class="itembody"><h3>${escape(name)}</h3><div class="for">${escape(users||'Manual extra')}</div>${raid?`<div class="count">${fmt(Math.max(0,target-picked))} <span>left to find</span></div><div class="for">${fmt(picked)} picked up / ${fmt(target)} target${state.completed.includes(name)?' · checked manually':''}</div><div class="controls"><button data-delta="-1" data-item="${escape(name)}" aria-label="Remove one ${escape(name)}">−</button><button class="add" data-delta="1" data-item="${escape(name)}" aria-label="Collect one ${escape(name)}">+</button></div>`:`<p class="required">Recipe baseline: ${fmt(totals[name]||0)} · Adjustment: ${(state.adjustments[name]||0)>0?'+':''}${fmt(state.adjustments[name]||0)} · Extra: +${fmt(state.extras[name]||0)}</p><label class="target">Need this raid <input aria-label="${escape(name)} target" type="number" min="0" max="100000000" step="1" value="${target}" data-target="${escape(name)}"></label><div class="targetActions">${state.adjustments[name]?`<button class="secondary targetAction" data-reset-target="${escape(name)}" aria-label="Reset ${escape(name)} adjustment">Reset adjustment</button>`:''}${state.extras[name]?`<button class="secondary targetAction" data-remove-extra="${escape(name)}" aria-label="Remove ${escape(name)} extra">Remove extra</button>`:''}</div>`}<button class="secondary targetAction itemRemove" data-remove-target="${escape(name)}" aria-label="Remove ${escape(name)} from list">Remove item</button></div></article>`;
 }).join('');
 for(const img of document.querySelectorAll<HTMLImageElement>('img[data-game-image]'))img.addEventListener('error',()=>{const view=img.closest<HTMLElement>('.source-crop')||img;view.hidden=true;const fallback=img.closest('.art')?.querySelector<HTMLElement>('.fallback');if(fallback)fallback.hidden=false;});
 $('empty').hidden=library||shown.length>0;
 $('empty').textContent=raid&&wanted.length?'All '+wanted.length+' targets are complete and hidden. Turn off Hide completed to review them.':Object.keys(totals).some(name=>name!=='DMZ Cash'&&totals[name]>0)?'All recipe items are omitted for this raid. Expand Omitted for this raid to restore an item, or select another goal.':'No raid targets. Select a goal or add manual extras in Plan your raid.';
 $('settingsClear').toggleAttribute('disabled',!Object.keys(state.selected).length&&!Object.keys(state.acquisitionPlans).length&&!Object.keys(state.adjustments).length&&!Object.keys(state.extras).length&&!Object.keys(state.picked).length&&!state.completed.length);
 try{$('settingsRestoreClear').toggleAttribute('disabled',localStorage.getItem(clearRecoveryKey)===null);}catch{$('settingsRestoreClear').setAttribute('disabled','');}
 save();
}
document.addEventListener('click',event=>{
 const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button');if(!button)return;
 const d=button.dataset;
 try {
  if(d.artworkPreview)openArtworkPreview(d.artworkPreview,button);
  if(d.acquisitionRemove){const plan=state.acquisitionPlans[d.acquisitionRemove];if(plan){state=chooseAcquisition(state,d.acquisitionRemove,plan.routeId,0);notice('Acquisition goal removed. Your library progress is unchanged.');render();}}
  if(d.wanted){state=setWanted(state,d.wanted,!state.wanted.includes(d.wanted));render();document.querySelector<HTMLButtonElement>('button[data-wanted="'+CSS.escape(d.wanted)+'"]')?.focus();}
  if(d.catalogTrack){const entry=getCatalogEntry(d.catalogTrack)!;if(!entry.isLoot)throw new Error('This record is not a loot item.');const input=document.querySelector<HTMLInputElement>('input[data-catalog-track-quantity="'+CSS.escape(entry.id)+'"]')!;if(!input.value.trim())throw new Error('Enter a whole-number loot target quantity.');const amount=count(Number(input.value),99);if(!amount)throw new Error('Choose at least one loot item.');state=addExtra(state,entry.name,amount);notice(entry.name+' added as a manual raid extra. Unlock progress is unchanged.');render();}
  if(d.catalogPlan){const entry=getCatalogEntry(d.catalogPlan)!;const route=currentRoute(entry);const input=document.querySelector<HTMLInputElement>('input[data-catalog-quantity="'+CSS.escape(entry.id)+'"]')!;if(!input.value.trim())throw new Error('Enter a whole-number quantity.');state=chooseAcquisition(state,entry.id,route.id,count(Number(input.value),entry.category==='Upgrades'?1:99));notice(entry.name+' plan updated. Unlock progress and picked-up counts are unchanged.');render();}
  if(d.catalogRemove){const entry=getCatalogEntry(d.catalogRemove)!;const planned=state.acquisitionPlans[entry.id];const route=planned?getCatalogRoute(entry.id,planned.routeId)!:currentRoute(entry);state=chooseAcquisition(state,entry.id,route.id,0);notice('Plan removed. Library progress kept.');render();}
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
  if(input.dataset.libraryRoute){libraryRoutes.set(input.dataset.libraryRoute,input.value);libraryQuantities.delete(input.dataset.libraryRoute);renderLibrary();}
  if(input.dataset.blueprintProgress){state=setBlueprintProgress(state,input.dataset.blueprintProgress,input.value as 'not-found'|'found'|'unlocked');render();document.querySelector<HTMLSelectElement>('select[data-blueprint-progress="'+CSS.escape(input.dataset.blueprintProgress)+'"]')?.focus();}
  if(input.dataset.catalogQuantity)libraryQuantities.set(input.dataset.catalogQuantity,input.value);
  if(input.dataset.target){if(input.value.trim()==='')throw new Error('Enter a whole-number target.');state=setRaidTarget(state,input.dataset.target,count(Number(input.value)));render();}
  if(input.dataset.quantity){if(input.value.trim()==='')throw new Error('Enter a whole-number quantity.');state=chooseRecipe(state,input.dataset.quantity,count(Number(input.value),99));render();}
 }catch(e){showError(e);render();}
});
$('planTab').addEventListener('click',()=>setMode('plan'));
$('libraryTab').addEventListener('click',()=>setMode('library'));
for(const id of ['raidTab','startRaid'])$(id).addEventListener('click',()=>setMode('raid'));
$('hideDone').addEventListener('change',()=>{state.hideCompleted=$<HTMLInputElement>('hideDone').checked;render();});
$('newRaid').addEventListener('click',()=>ask('Start a new raid?','Clear this raid’s picked-up counts and manual checks? Recipe selections and raid targets will stay the same.',()=>{state=newRaid(state);notice('New raid ready. Targets kept; picked-up counts and checks cleared.');render();},'New raid'));
$('restoreTotals').addEventListener('click',()=>ask('Reset recipe adjustments?','Use the selected recipes’ baseline amounts again? Explicit manual extras and picked-up counts will stay.',()=>{state=resetAdjustments(state);notice('Recipe adjustments reset; manual extras kept.');render();},'Reset adjustments'));
$('addTarget').addEventListener('click',()=>{try{const name=$<HTMLSelectElement>('directItem').value;const input=$<HTMLInputElement>('directCount');if(!input.value.trim())throw new Error('Enter an extra quantity.');state=addExtra(state,name,count(Number(input.value)));notice(name+' extra added.');render();}catch(e){showError(e);}});

$('category').addEventListener('change',renderCatalog);$('search').addEventListener('input',renderCatalog);
function exportBackup(){try{fileDownload(serialize(state),'DMZ-Raid-Board-backup-'+new Date().toISOString().slice(0,10)+'.json');if(settings.open){$('settingsMessage').textContent='Backup export started. Choose where to save the JSON file.';$('settingsMessage').hidden=false;}}catch(e){showError(e);}}
function importBackup(){openSettings();$('settingsImport').focus();$<HTMLInputElement>('importFile').value='';$<HTMLInputElement>('importFile').click();}
$('backup').addEventListener('click',exportBackup);$('settingsBackup').addEventListener('click',exportBackup);$('settingsImport').addEventListener('click',importBackup);
$('import').addEventListener('click',importBackup);
$('importFile').addEventListener('change',async()=>{
 const file=$<HTMLInputElement>('importFile').files?.[0];if(!file)return;
 try {if(file.size>1_000_000)throw new Error('Backup is too large (maximum 1 MB).');const original=await file.text();const next=parseBackup(original);const importVersion=JSON.parse(original).version;const legacyImport=importVersion===1;ask('Replace your board?','Import this valid backup and replace your current selections, raid targets, picked-up counts, checks, blueprint progress and wanted list? Your current board will be retained as a local recovery copy.',()=>{try{localStorage.setItem(key+'-recovery',corruptRaw??serialize(state));localStorage.setItem(key+'-last-import-original',original);localStorage.setItem(key,serialize(next));}catch{throw new Error('Could not preserve the current board. Export a backup first; import canceled.');}state=next;corruptRaw=null;storageAvailable=true;$('recovery').hidden=true;if(settings.open)closeSettings();notice(legacyImport?'Older backup imported: positive targets became labeled adjustments or extras; old zero overrides were dropped so selected baselines are visible. Review manual extras below; your original file is unchanged.':importVersion===2?'Older backup imported. Your plan and raid progress are preserved; blueprint progress starts empty.':'Backup imported, including library progress.');render();},'Import backup');}catch(e){showError(e);}
});
// Save the recovery snapshot and replacement before changing session state. Failure leaves the board intact.
function replaceWithRecovery(next:BoardState,snapshotKey:string){
 if(corruptRaw!==null)throw new Error('Recover the unreadable saved board first.');
 try{localStorage.setItem(snapshotKey,serialize(state));localStorage.setItem(key,serialize(next));}catch{throw new Error('Recovery/replacement could not be saved. Your list has not changed; export a backup first.');}
 state=next;storageAvailable=true;mode='plan';try{localStorage.setItem('dmz-raid-board-mode-v3',mode);}catch{}render();
}
$('settingsClear').addEventListener('click',()=>ask('Clear entire list?','Remove all selected goals, recipe adjustments, manual extras, picked-up counts and checks? A recovery copy will be saved first. Blueprint progress, wanted items and your theme are kept.',()=>{replaceWithRecovery({...emptyState(),blueprintProgress:{...state.blueprintProgress},wanted:[...state.wanted]},clearRecoveryKey);notice('Entire list cleared. Restore cleared list is available here.');$('settingsRestoreClear').focus();},'Clear entire list'));
$('settingsRestoreClear').addEventListener('click',()=>{try{const raw=localStorage.getItem(clearRecoveryKey);if(raw===null)throw new Error('No cleared list is available.');const previous=parseBackup(raw);ask('Restore cleared list?','Replace the current list with your last cleared list? The current list will be saved as a recovery copy. Current blueprint progress, wanted items and theme are kept.',()=>{replaceWithRecovery({...previous,blueprintProgress:{...state.blueprintProgress},wanted:[...state.wanted]},key+'-before-restore-clear');notice('Cleared list restored.');},'Restore list');}catch(e){showError(e);}});
$('exportRecovery').addEventListener('click',()=>{if(corruptRaw!==null)fileDownload(corruptRaw,'DMZ-Raid-Board-recovery.txt');});
$('freshBoard').addEventListener('click',()=>ask('Start a fresh board?','Keep the unreadable saved text as a recovery copy and replace the active board with an empty board?',()=>{try{localStorage.setItem(key+'-recovery',corruptRaw||'');}catch{throw new Error('Recovery copy could not be saved. Export the saved text first.');}state=emptyState();corruptRaw=null;storageAvailable=true;$('recovery').hidden=true;render();},'Start fresh'));
$('sourcesBtn').addEventListener('click',()=>$<HTMLDialogElement>('sources').showModal());
$('closeSources').addEventListener('click',()=>$<HTMLDialogElement>('sources').close());
$<HTMLSelectElement>('category').innerHTML='<option>All</option>'+categories.map(c=>`<option ${c==='Upgrades'?'selected':''}>${c}</option>`).join('');
$<HTMLSelectElement>('directItem').innerHTML=catalogMaterials.filter(m=>m!=='DMZ Cash').map(m=>`<option>${escape(m)}</option>`).join('');
const coverage=`${recipes.length} entries · ${recipes.filter(r=>r.costs).length} selectable · ${Object.keys(art).length} target images`;
$('coverage').textContent=coverage;$('sourceCoverage').textContent=coverage+'. '+recipes.filter(r=>!r.costs).length+' entries have unresolved requirements and are disabled. Category coverage does not mean complete recipe coverage.';
$('unconfirmedList').textContent=recipes.filter(r=>!r.costs).map(r=>r.name).join(', ')||'None in this catalog snapshot';
initializeLibraryFilters();
render();
if(migratedLegacy){$('migrationNotice').hidden=false;$('migrationNotice').textContent=migratedVersion===1?'Older board migrated: positive targets became adjustments or extras and old zero overrides were dropped. Blueprint progress starts empty. The original saved board remains unchanged for rollback.':'Your earlier plan, targets and raid counts were carried forward. Blueprint progress starts empty. The original saved board remains unchanged for rollback.';}
