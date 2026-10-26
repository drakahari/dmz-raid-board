import {themes,normalizeTheme,themeKey,defaultTheme} from './themes.mjs';
import {buildFlavor,appVersion} from './build-status.mjs';
import {recipes,categories,materials,art as knownArt,checked,type Recipe,type Category,type ArtAsset} from './catalog.mjs';
import {installedImageFiles} from './asset-status.mjs';
import {compareNames,sortedNames} from './ordering.mjs';
import {type BoardState,sampleState,emptyState,parseBackup,serialize,count,recipeTotals,raidTargets,chooseRecipe,isComplete,plannedProduction,newRaid,maxCount,setRaidTarget,addExtra,removeExtra,resetAdjustments} from './core.mjs';
const $ = <T extends HTMLElement = HTMLElement>(id:string) => document.getElementById(id) as T;
$('buildLabel').textContent=buildFlavor==='public'?'PUBLIC PRERELEASE / NO GAME ART':buildFlavor==='artwork'?'UNOFFICIAL PRERELEASE / GAME ART':'PRIVATE WINDOWS PROTOTYPE / 01';
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const settings=$<HTMLDialogElement>('settings');
const themePicker=$<HTMLSelectElement>('themePicker');
themePicker.innerHTML=[...new Set(themes.map(t=>t.group))].map(group=>'<optgroup label="'+escape(group)+'">'+themes.filter(t=>t.group===group).map(t=>'<option value="'+t.id+'">'+escape(t.name)+'</option>').join('')+'</optgroup>').join('');
let selectedTheme=defaultTheme;try{selectedTheme=normalizeTheme(localStorage.getItem(themeKey));}catch{}
document.documentElement.dataset.theme=selectedTheme;themePicker.value=selectedTheme;
function openSettings(){if(!settings.open)settings.showModal();$('settingsMessage').hidden=true;themePicker.focus();}
function closeSettings(){settings.close();}
$('settingsBtn').addEventListener('click',openSettings);$('closeSettings').addEventListener('click',closeSettings);
settings.addEventListener('close',()=>$('settingsBtn').focus());
themePicker.addEventListener('change',()=>{selectedTheme=normalizeTheme(themePicker.value);document.documentElement.dataset.theme=selectedTheme;try{localStorage.setItem(themeKey,selectedTheme);$('themeFeedback').textContent=themes.find(t=>t.id===selectedTheme)!.name+' applied and saved.';}catch{$('themeFeedback').textContent='Theme applied for this session; device storage is unavailable.';}});
const key='dmz-raid-board-state-v2';
const legacyKey='dmz-raid-board-state-v1';
const clearRecoveryKey=key+'-before-clear';
let migratedLegacy=false;
$('appVersion').textContent='DMZ Raid Board '+appVersion;
const fmt=(n:number)=>n.toLocaleString();
const art=Object.fromEntries(Object.entries(knownArt).filter(([,asset])=>installedImageFiles.includes(asset.file)));
let state:BoardState=emptyState();
let mode:'plan'|'raid'='plan';
let corruptRaw:string|null=null;
let storageAvailable=true;
try {
 const raw=localStorage.getItem(key)??localStorage.getItem(legacyKey);
 if(raw!==null){try{state=parseBackup(raw);migratedLegacy=JSON.parse(raw).version===1;}catch(e){corruptRaw=raw;$('recovery').hidden=false;$('recoveryReason').textContent=String((e as Error).message);}if(migratedLegacy){try{if(localStorage.getItem(key+'-before-migration')===null)localStorage.setItem(key+'-before-migration',raw);}catch{storageAvailable=false;}}}
 const savedMode=localStorage.getItem('dmz-raid-board-mode-v2')??localStorage.getItem('dmz-raid-board-mode');if(savedMode==='raid')mode='raid';
}catch{storageAvailable=false;}

let pending:(()=>void)|null=null;
let lastFocus:HTMLElement|null=null;
const confirmDialog=$<HTMLDialogElement>('confirmDialog');
function notice(message:string){const target=settings.open?$('settingsMessage'):$('notice');const other=settings.open?$('notice'):$('settingsMessage');target.textContent=message;target.hidden=!message;other.textContent='';other.hidden=true;}
function showError(error:unknown){notice(error instanceof Error?error.message:'This action could not be completed. Your board has not changed.');}
function save(){
 if(corruptRaw!==null){$('saved').textContent='Session only · saved data needs recovery';return;}
 try {if(!storageAvailable)throw new Error('Storage unavailable');localStorage.setItem(key,serialize(state));localStorage.setItem('dmz-raid-board-mode-v2',mode);$('saved').textContent='● Saved on this device';}
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
function setMode(value:'plan'|'raid'){mode=value;notice('');render();$('planTab').focus();}
function costText(recipe:Recipe){if(!recipe.costs)return 'Requirements unconfirmed';const itemCount=Object.keys(recipe.costs).filter(k=>k!=='DMZ Cash').length;return itemCount?itemCount+' loot ingredient'+(itemCount===1?'':'s'):'No loot ingredients listed';}
function lootEntries(recipe:Recipe){return Object.entries(recipe.costs||recipe.reportedCosts||{}).filter(([name])=>name!=='DMZ Cash');}
const itemBenefit=(recipe:Recipe)=>recipe.ownerVerification&&recipe.effect&&!/(cash|money|cost|price|discount|purchase|wallet|bank)/i.test(recipe.effect)?recipe.effect:undefined;
const installedRecipeImage=(recipe:Recipe)=>recipe.image&&installedImageFiles.includes(recipe.image)?recipe.image:undefined;
function materialImage(name:string,asset:ArtAsset):string {
 const image='<img src="assets/'+escape(asset.file)+'" alt="'+escape(name)+'" data-game-image="true">';
 return asset.presentation==='regional-notes-screenshot'?'<span class="source-crop regional-notes-screenshot">'+image+'</span>':image;
}
function renderGoals(){
 const goals=recipes.filter(r=>['gunsmith','stash'].includes(r.id)||(state.selected[r.id]||0)>0);
 $('upgrades').innerHTML=goals.map(r=>`<button class="upgrade ${state.selected[r.id]?'on':''}" data-recipe="${escape(r.id)}" aria-pressed="${!!state.selected[r.id]}" aria-label="${escape(r.name)}"><span class="symbol" aria-hidden="true">${installedRecipeImage(r)?`<img src="assets/${escape(installedRecipeImage(r)!)}" alt="">`:r.category==='Upgrades'?'◈':'+'}</span><div><h3>${escape(r.name)}</h3><p>${r.id==='gunsmith'?'Gunsmith upgrade goal':r.id==='stash'?'Expand your item stash':escape(itemBenefit(r)||r.category)}</p><p>${escape(costText(r))}${r.category!=='Upgrades'?' · Quantity '+(state.selected[r.id]||0):''}</p></div><span class="selection" aria-hidden="true">${state.selected[r.id]?'✓':'+'}</span></button>`).join('');
}
function renderCatalog(){
 const category=$<HTMLSelectElement>('category').value;
 const term=$<HTMLInputElement>('search').value.trim().toLowerCase();
 const shown=recipes.filter(r=>(category==='All'||r.category===category)&&[r.name,...lootEntries(r).map(([name])=>name)].join(' ').toLowerCase().includes(term)).sort((a,b)=>compareNames(a.name,b.name)||compareNames(a.id,b.id));
 $('catalogStatus').textContent=shown.length+' entries shown · '+checked;
 $('catalogList').innerHTML=shown.length?shown.map(r=>{
  const selected=state.selected[r.id]||0;
  const entries=lootEntries(r);
  const costs=(entries.length?entries.map(([name,n])=>fmt(n)+' x '+escape(name)).join(' · '):r.costs?'No loot ingredients listed':'No confirmed item requirements')+(!r.costs?' · Requirements unresolved: selection unavailable':'');
  return `<article class="catalogEntry">${installedRecipeImage(r)?`<img class="catalogThumb" src="assets/${escape(installedRecipeImage(r)!)}" alt="${escape(r.name)}">`:''}<div class="catalogText"><h3>${escape(r.name)}</h3><p>${costs}</p><p class="status">${r.ownerVerification?'Owner-verified item requirements':'Community-reported item requirements'} · ${escape(r.checked||checked)}</p><p>${r.costs?'Confirm the current in-game requirements and unlocks before planning.':'This entry remains unavailable until its full requirements are verified.'}</p>${itemBenefit(r)?`<p>${escape(itemBenefit(r)!)}</p>`:''}${r.requires?`<p>Requires: ${escape(r.requires)}</p>`:''}<details><summary>Source</summary><p class="sourceUrl">${(r.sources||[{url:r.source,checked}]).map(s=>escape(s.url)+' · checked '+escape(s.checked)).join('<br>')}</p></details></div>${r.costs?`<div class="catalogControl"><button class="secondary" data-recipe="${escape(r.id)}" aria-label="${selected?'Remove':'Add'} ${escape(r.name)}" aria-pressed="${!!selected}">${selected?'✓ Selected':'+ Select'}</button>${r.category!=='Upgrades'?`<label>${r.category==='Ingredients'?'Planned prints':'Quantity'} <input type="number" min="0" max="99" step="1" value="${selected}" data-quantity="${escape(r.id)}" aria-label="${escape(r.name)} quantity"></label>`:'<span class="micro">FIXED PERMANENT TIER</span>'}</div>`:'<span class="unconfirmed">Unconfirmed</span>'}</article>`;
 }).join(''):'<p>No matching recipes in this category.</p>';
}
function render(){
 const raid=mode==='raid';$('plan').hidden=raid;$('raidIntro').hidden=!raid;
 for(const [id,active] of [['planTab',!raid],['raidTab',raid]] as const){$(id).classList.toggle('active',active);if(active)$(id).setAttribute('aria-current','page');else $(id).removeAttribute('aria-current');}
 $<HTMLInputElement>('hideDone').checked=state.hideCompleted;
 renderGoals();renderCatalog();
 const totals=recipeTotals(state),targets=raidTargets(state);
 const active=sortedNames(Object.keys(targets));const wanted=active;
 const omitted=sortedNames(Object.keys(totals).filter(name=>name!=='DMZ Cash'&&totals[name]>0&&!targets[name]));
 $('omittedTargets').innerHTML=omitted.length?'<p>Omitted for this raid (not in the checklist):</p>'+omitted.map(name=>'<p>'+escape(name)+' · recipe baseline '+fmt(totals[name])+' <button class="secondary targetAction" data-reset-target="'+escape(name)+'" aria-label="Use baseline for '+escape(name)+'">Use baseline</button></p>').join(''):'';
 const printing=plannedProduction(state);$('printingNote').hidden=!Object.keys(printing).length;$('printingNote').textContent='Planned printing: '+sortedNames(Object.keys(printing)).map(name=>fmt(printing[name])+' '+name).join(', ')+'. These planned outputs offset matching required ingredients once. Print only with already-unlocked recipes; no other recipe is expanded automatically and no real production is credited.';
 $('navCount').textContent=String(wanted.length);
 let collected=0,total=0;
 for(const name of wanted){total+=targets[name];collected+=Math.min(targets[name],state.picked[name]||0);}
 const done=wanted.filter(name=>isComplete(state,name,targets[name])).length;
 $('progressText').textContent=fmt(collected)+' / '+fmt(total)+' picked up · '+done+' / '+wanted.length+' targets done';
 $<HTMLProgressElement>('progress').max=total||1;$<HTMLProgressElement>('progress').value=collected;
 const shown=active.filter(name=>!raid||(targets[name]>0&&(!state.hideCompleted||!isComplete(state,name,targets[name]))));
 $('items').innerHTML=shown.map(name=>{
  const target=targets[name],picked=state.picked[name]||0,complete=isComplete(state,name,target),asset=art[name];
  const users=recipes.filter(r=>(state.selected[r.id]||0)>0&&r.costs?.[name]).map(r=>r.id==='gunsmith'?'Gunsmith I':r.id==='stash'?'Stash II':r.name).join(' + ');
  return `<article class="item ${asset?.rarity||''} ${raid&&complete?'done':''}" data-card="${escape(name)}"><div class="art">${asset?`<span class="rarity" title="${asset.rarity}"></span>${materialImage(name,asset)}<span class="fallback" hidden>Image unavailable</span>`:'<span class="fallback">No verified image yet</span>'}${raid?`<button class="complete" data-complete="${escape(name)}" aria-label="${complete?'Uncheck':'Complete'} ${escape(name)}" aria-pressed="${complete}">${complete?'✓':'○'}</button>`:''}</div><div class="itembody"><h3>${escape(name)}</h3><div class="for">${escape(users||'Manual extra')}</div>${raid?`<div class="count">${fmt(Math.max(0,target-picked))} <span>left to find</span></div><div class="for">${fmt(picked)} picked up / ${fmt(target)} target${state.completed.includes(name)?' · checked manually':''}</div><div class="controls"><button data-delta="-1" data-item="${escape(name)}" aria-label="Remove one ${escape(name)}">−</button><button class="add" data-delta="1" data-item="${escape(name)}" aria-label="Collect one ${escape(name)}">+</button></div>`:`<p class="required">Recipe baseline: ${fmt(totals[name]||0)} · Adjustment: ${(state.adjustments[name]||0)>0?'+':''}${fmt(state.adjustments[name]||0)} · Extra: +${fmt(state.extras[name]||0)}</p><label class="target">Need this raid <input aria-label="${escape(name)} target" type="number" min="0" max="100000000" step="1" value="${target}" data-target="${escape(name)}"></label><div class="targetActions">${state.adjustments[name]?`<button class="secondary targetAction" data-reset-target="${escape(name)}" aria-label="Reset ${escape(name)} adjustment">Reset adjustment</button>`:''}${state.extras[name]?`<button class="secondary targetAction" data-remove-extra="${escape(name)}" aria-label="Remove ${escape(name)} extra">Remove extra</button>`:''}</div>`}<button class="secondary targetAction itemRemove" data-remove-target="${escape(name)}" aria-label="Remove ${escape(name)} from list">Remove item</button></div></article>`;
 }).join('');
 for(const img of document.querySelectorAll<HTMLImageElement>('img[data-game-image]'))img.addEventListener('error',()=>{const view=img.closest<HTMLElement>('.source-crop')||img;view.hidden=true;const fallback=img.closest('.art')?.querySelector<HTMLElement>('.fallback');if(fallback)fallback.hidden=false;});
 $('empty').hidden=shown.length>0;
 $('empty').textContent=raid&&wanted.length?'All '+wanted.length+' targets are complete and hidden. Turn off Hide completed to review them.':Object.keys(totals).some(name=>name!=='DMZ Cash'&&totals[name]>0)?'All recipe items are omitted for this raid. Restore an item under manual extras or select another goal.':'No raid targets. Select a goal or add manual extras in Plan your raid.';
 $('settingsClear').toggleAttribute('disabled',!Object.keys(state.selected).length&&!Object.keys(state.adjustments).length&&!Object.keys(state.extras).length&&!Object.keys(state.picked).length&&!state.completed.length);
 try{$('settingsRestoreClear').toggleAttribute('disabled',localStorage.getItem(clearRecoveryKey)===null);}catch{$('settingsRestoreClear').setAttribute('disabled','');}
 save();
}
document.addEventListener('click',event=>{
 const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button');if(!button)return;
 const d=button.dataset;
 try {
  if(d.removeTarget){state=setRaidTarget(state,d.removeTarget,0);notice(d.removeTarget+' removed from this raid list. New raid keeps this removal. Recipe items can be restored under manual extras.');render();}
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
 try {if(file.size>1_000_000)throw new Error('Backup is too large (maximum 1 MB).');const original=await file.text();const next=parseBackup(original);const legacyImport=JSON.parse(original).version===1;ask('Replace your board?','Import this valid backup and replace your current selections, raid targets, picked-up counts and checks? Your current board will be retained as a local recovery copy.',()=>{try{localStorage.setItem(key+'-recovery',corruptRaw??serialize(state));localStorage.setItem(key+'-last-import-original',original);localStorage.setItem(key,serialize(next));}catch{throw new Error('Could not preserve the current board. Export a backup first; import canceled.');}state=next;corruptRaw=null;storageAvailable=true;$('recovery').hidden=true;if(settings.open)closeSettings();notice(legacyImport?'Older backup imported: positive targets became labeled adjustments or extras; old zero overrides were dropped so selected baselines are visible. Review manual extras below; your original file is unchanged.':'Backup imported.');render();},'Import backup');}catch(e){showError(e);}
});
// Save the recovery snapshot and replacement before changing session state. Failure leaves the board intact.
function replaceWithRecovery(next:BoardState,snapshotKey:string){
 if(corruptRaw!==null)throw new Error('Recover the unreadable saved board first.');
 try{localStorage.setItem(snapshotKey,serialize(state));localStorage.setItem(key,serialize(next));}catch{throw new Error('Recovery/replacement could not be saved. Your list has not changed; export a backup first.');}
 state=next;storageAvailable=true;mode='plan';try{localStorage.setItem('dmz-raid-board-mode-v2',mode);}catch{}render();
}
$('settingsClear').addEventListener('click',()=>ask('Clear entire list?','Remove all selected goals, recipe adjustments, manual extras, picked-up counts and checks? A recovery copy will be saved first. Your theme stays unchanged.',()=>{replaceWithRecovery(emptyState(),clearRecoveryKey);notice('Entire list cleared. Restore cleared list is available here.');$('settingsRestoreClear').focus();},'Clear entire list'));
$('settingsRestoreClear').addEventListener('click',()=>{try{const raw=localStorage.getItem(clearRecoveryKey);if(raw===null)throw new Error('No cleared list is available.');const previous=parseBackup(raw);ask('Restore cleared list?','Replace the current list with your last cleared list? The current list will be saved as a recovery copy. Your theme stays unchanged.',()=>{replaceWithRecovery(previous,key+'-before-restore-clear');notice('Cleared list restored.');},'Restore list');}catch(e){showError(e);}});
$('exportRecovery').addEventListener('click',()=>{if(corruptRaw!==null)fileDownload(corruptRaw,'DMZ-Raid-Board-recovery.txt');});
$('freshBoard').addEventListener('click',()=>ask('Start a fresh board?','Keep the unreadable saved text as a recovery copy and replace the active board with an empty board?',()=>{try{localStorage.setItem(key+'-recovery',corruptRaw||'');}catch{throw new Error('Recovery copy could not be saved. Export the saved text first.');}state=emptyState();corruptRaw=null;storageAvailable=true;$('recovery').hidden=true;render();},'Start fresh'));
$('sourcesBtn').addEventListener('click',()=>$<HTMLDialogElement>('sources').showModal());
$('closeSources').addEventListener('click',()=>$<HTMLDialogElement>('sources').close());
$<HTMLSelectElement>('category').innerHTML='<option>All</option>'+categories.map(c=>`<option ${c==='Upgrades'?'selected':''}>${c}</option>`).join('');
$<HTMLSelectElement>('directItem').innerHTML=materials.filter(m=>m!=='DMZ Cash').map(m=>`<option>${escape(m)}</option>`).join('');
const coverage=`${recipes.length} entries · ${recipes.filter(r=>r.costs).length} selectable · ${Object.keys(art).length} target images`;
$('coverage').textContent=coverage;$('sourceCoverage').textContent=coverage+'. '+recipes.filter(r=>!r.costs).length+' entries have unresolved requirements and are disabled. Category coverage does not mean complete recipe coverage.';
render();
if(migratedLegacy){$('migrationNotice').hidden=false;$('migrationNotice').textContent='Older board migrated: positive targets became labeled adjustments or extras. Old zero overrides were dropped; selected recipes now supply their baseline. Your previous board is kept unchanged for rollback. Review extras below, reset adjustments, or use Settings to clear the entire list.';}
