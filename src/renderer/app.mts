import {themes,normalizeTheme,themeKey,defaultTheme} from './themes.mjs';
import {buildFlavor,appVersion} from './build-status.mjs';
import {recipes,categories,materials,art as knownArt,checked,type Recipe,type Category,type ArtAsset} from './catalog.mjs';
import {installedImageFiles} from './asset-status.mjs';
import {compareNames,sortedNames} from './ordering.mjs';
import {type BoardState,sampleState,emptyState,parseBackup,serialize,count,recipeTotals,raidTargets,chooseRecipe,isComplete,plannedProduction,newRaid,maxCount} from './core.mjs';
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
const key='dmz-raid-board-state-v1';
$('appVersion').textContent='DMZ Raid Board '+appVersion;
const fmt=(n:number)=>n.toLocaleString();
const art=Object.fromEntries(Object.entries(knownArt).filter(([,asset])=>installedImageFiles.includes(asset.file)));
let state:BoardState=sampleState();
let mode:'plan'|'raid'='plan';
let corruptRaw:string|null=null;
let storageAvailable=true;
try { const raw=localStorage.getItem(key);if(raw!==null){try{state=parseBackup(raw);}catch(e){corruptRaw=raw;$('recovery').hidden=false;$('recoveryReason').textContent=String((e as Error).message);}}const savedMode=localStorage.getItem('dmz-raid-board-mode');if(savedMode==='raid')mode='raid'; }
catch {storageAvailable=false;}
let pending:(()=>void)|null=null;
let lastFocus:HTMLElement|null=null;
const confirmDialog=$<HTMLDialogElement>('confirmDialog');
function notice(message:string){const target=settings.open?$('settingsMessage'):$('notice');const other=settings.open?$('notice'):$('settingsMessage');target.textContent=message;target.hidden=!message;other.textContent='';other.hidden=true;}
function showError(error:unknown){notice(error instanceof Error?error.message:'This action could not be completed. Your board has not changed.');}
function save(){
 if(corruptRaw!==null){$('saved').textContent='Session only · saved data needs recovery';return;}
 try {if(!storageAvailable)throw new Error('Storage unavailable');localStorage.setItem(key,serialize(state));localStorage.setItem('dmz-raid-board-mode',mode);$('saved').textContent='● Saved on this device';}
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
const installedRecipeImage=(recipe:Recipe)=>recipe.image&&installedImageFiles.includes(recipe.image)?recipe.image:undefined;
function materialImage(name:string,asset:ArtAsset):string {
 const image='<img src="assets/'+escape(asset.file)+'" alt="'+escape(name)+'" data-game-image="true">';
 return asset.presentation==='regional-notes-screenshot'?'<span class="source-crop regional-notes-screenshot">'+image+'</span>':image;
}
function renderGoals(){
 const goals=recipes.filter(r=>['gunsmith','stash'].includes(r.id)||(state.selected[r.id]||0)>0);
 $('upgrades').innerHTML=goals.map(r=>`<button class="upgrade ${state.selected[r.id]?'on':''}" data-recipe="${escape(r.id)}" aria-pressed="${!!state.selected[r.id]}" aria-label="${escape(r.name)}"><span class="symbol" aria-hidden="true">${installedRecipeImage(r)?`<img src="assets/${escape(installedRecipeImage(r)!)}" alt="">`:r.category==='Upgrades'?'◈':'+'}</span><div><h3>${escape(r.name)}</h3><p>${r.id==='gunsmith'?'Gunsmith upgrade goal':r.id==='stash'?'Expand your item stash':escape(r.category)}</p><p>${escape(costText(r))}${r.category!=='Upgrades'?' · Quantity '+(state.selected[r.id]||0):''}</p></div><span class="selection" aria-hidden="true">${state.selected[r.id]?'✓':'+'}</span></button>`).join('');
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
  return `<article class="catalogEntry">${installedRecipeImage(r)?`<img class="catalogThumb" src="assets/${escape(installedRecipeImage(r)!)}" alt="${escape(r.name)}">`:''}<div class="catalogText"><h3>${escape(r.name)}</h3><p>${costs}</p><p class="status">${r.ownerVerification?'Owner-verified item requirements':'Community-reported item requirements'} · ${escape(r.checked||checked)}</p><p>${r.costs?'Confirm the current in-game requirements and unlocks before planning.':'This entry remains unavailable until its full requirements are verified.'}</p>${r.requires?`<p>Requires: ${escape(r.requires)}</p>`:''}<details><summary>Source</summary><p class="sourceUrl">${(r.sources||[{url:r.source,checked}]).map(s=>escape(s.url)+' · checked '+escape(s.checked)).join('<br>')}</p></details></div>${r.costs?`<div class="catalogControl"><button class="secondary" data-recipe="${escape(r.id)}" aria-label="${selected?'Remove':'Add'} ${escape(r.name)}" aria-pressed="${!!selected}">${selected?'✓ Selected':'+ Select'}</button>${r.category!=='Upgrades'?`<label>${r.category==='Ingredients'?'Planned prints':'Quantity'} <input type="number" min="0" max="99" step="1" value="${selected}" data-quantity="${escape(r.id)}" aria-label="${escape(r.name)} quantity"></label>`:'<span class="micro">FIXED PERMANENT TIER</span>'}</div>`:'<span class="unconfirmed">Unconfirmed</span>'}</article>`;
 }).join(''):'<p>No matching recipes in this category.</p>';
}
function render(){
 const raid=mode==='raid';$('plan').hidden=raid;$('raidIntro').hidden=!raid;
 for(const [id,active] of [['planTab',!raid],['raidTab',raid]] as const){$(id).classList.toggle('active',active);if(active)$(id).setAttribute('aria-current','page');else $(id).removeAttribute('aria-current');}
 $<HTMLInputElement>('hideDone').checked=state.hideCompleted;
 renderGoals();renderCatalog();
 const totals=recipeTotals(state),targets=raidTargets(state);
 const active=sortedNames(Object.keys(targets));const wanted=active.filter(name=>targets[name]>0);
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
  return `<article class="item ${asset?.rarity||''} ${raid&&complete?'done':''}" data-card="${escape(name)}"><div class="art">${asset?`<span class="rarity" title="${asset.rarity}"></span>${materialImage(name,asset)}<span class="fallback" hidden>Image unavailable</span>`:'<span class="fallback">No verified image yet</span>'}${raid?`<button class="complete" data-complete="${escape(name)}" aria-label="${complete?'Uncheck':'Complete'} ${escape(name)}" aria-pressed="${complete}">${complete?'✓':'○'}</button>`:''}</div><div class="itembody"><h3>${escape(name)}</h3><div class="for">${escape(users||'Direct raid target')}</div>${raid?`<div class="count">${fmt(Math.max(0,target-picked))} <span>left to find</span></div><div class="for">${fmt(picked)} picked up / ${fmt(target)} target${state.completed.includes(name)?' · checked manually':''}</div><div class="controls"><button data-delta="-1" data-item="${escape(name)}" aria-label="Remove one ${escape(name)}">−</button><button class="add" data-delta="1" data-item="${escape(name)}" aria-label="Collect one ${escape(name)}">+</button></div>`:`<p class="required">Recipe total: ${fmt(totals[name]||0)}${name in state.targets?' · custom target':''}</p><label class="target">Need this raid <input aria-label="${escape(name)} target" type="number" min="0" max="100000000" step="1" value="${target}" data-target="${escape(name)}"></label>`}</div></article>`;
 }).join('');
 for(const img of document.querySelectorAll<HTMLImageElement>('img[data-game-image]'))img.addEventListener('error',()=>{const view=img.closest<HTMLElement>('.source-crop')||img;view.hidden=true;const fallback=img.closest('.art')?.querySelector<HTMLElement>('.fallback');if(fallback)fallback.hidden=false;});
 $('empty').hidden=shown.length>0;
 save();
}
document.addEventListener('click',event=>{
 const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button');if(!button)return;
 const d=button.dataset;
 try {
  if(d.recipe){const current=state.selected[d.recipe]||0;state=chooseRecipe(state,d.recipe,current?0:1);notice('Recipe selections updated. Custom raid targets stay as entered.');render();}
  if(d.item){const value=count(Math.max(0,Math.min(maxCount,(state.picked[d.item]||0)+Number(d.delta))));state.picked[d.item]=value;if(d.delta==='-1')state.completed=state.completed.filter(k=>k!==d.item);render();document.querySelector<HTMLButtonElement>(`button[data-item="${CSS.escape(d.item)}"][data-delta="${d.delta}"]`)?.focus();}
  if(d.complete){const target=raidTargets(state)[d.complete]||0;if(isComplete(state,d.complete,target)){state.completed=state.completed.filter(k=>k!==d.complete);if((state.picked[d.complete]||0)>=target)notice('This target is complete from picked-up counts. Use − to correct a count.');}else state.completed.push(d.complete);render();}
 }catch(e){showError(e);}
});
document.addEventListener('change',event=>{
 const input=event.target as HTMLInputElement;
 try {
  if(input.dataset.target){if(input.value.trim()==='')throw new Error('Enter a whole-number target.');state.targets[input.dataset.target]=count(Number(input.value));render();}
  if(input.dataset.quantity){if(input.value.trim()==='')throw new Error('Enter a whole-number quantity.');state=chooseRecipe(state,input.dataset.quantity,count(Number(input.value),99));render();}
 }catch(e){showError(e);render();}
});
$('planTab').addEventListener('click',()=>setMode('plan'));
for(const id of ['raidTab','startRaid'])$(id).addEventListener('click',()=>setMode('raid'));
$('hideDone').addEventListener('change',()=>{state.hideCompleted=$<HTMLInputElement>('hideDone').checked;render();});
$('newRaid').addEventListener('click',()=>ask('Start a new raid?','Clear this raid’s picked-up counts and manual checks? Recipe selections and raid targets will stay the same.',()=>{state=newRaid(state);notice('New raid ready. Targets kept; picked-up counts and checks cleared.');render();},'New raid'));
$('restoreTotals').addEventListener('click',()=>ask('Use recipe totals?','Replace all custom raid targets with the selected recipes’ totals? Picked-up counts stay unchanged.',()=>{state.targets={};render();},'Use totals'));
$('addTarget').addEventListener('click',()=>{try{const name=$<HTMLSelectElement>('directItem').value;const input=$<HTMLInputElement>('directCount');if(!input.value.trim())throw new Error('Enter a target.');state.targets[name]=count(Number(input.value));notice(name+' target updated.');render();}catch(e){showError(e);}});
$('category').addEventListener('change',renderCatalog);$('search').addEventListener('input',renderCatalog);
function exportBackup(){try{fileDownload(serialize(state),'DMZ-Raid-Board-backup-'+new Date().toISOString().slice(0,10)+'.json');if(settings.open){$('settingsMessage').textContent='Backup export started. Choose where to save the JSON file.';$('settingsMessage').hidden=false;}}catch(e){showError(e);}}
function importBackup(){openSettings();$('settingsImport').focus();$<HTMLInputElement>('importFile').value='';$<HTMLInputElement>('importFile').click();}
$('backup').addEventListener('click',exportBackup);$('settingsBackup').addEventListener('click',exportBackup);$('settingsImport').addEventListener('click',importBackup);
$('import').addEventListener('click',importBackup);
$('importFile').addEventListener('change',async()=>{
 const file=$<HTMLInputElement>('importFile').files?.[0];if(!file)return;
 try {if(file.size>1_000_000)throw new Error('Backup is too large (maximum 1 MB).');const next=parseBackup(await file.text());ask('Replace your board?','Import this valid backup and replace your current selections, raid targets, picked-up counts and checks? Your current board will be retained as a local recovery copy.',()=>{try{localStorage.setItem(key+'-recovery',corruptRaw??serialize(state));}catch{throw new Error('Could not preserve the current board. Export a backup first; import canceled.');}state=next;corruptRaw=null;storageAvailable=true;$('recovery').hidden=true;if(settings.open)closeSettings();notice('Backup imported.');render();},'Import backup');}catch(e){showError(e);}
});
$('exportRecovery').addEventListener('click',()=>{if(corruptRaw!==null)fileDownload(corruptRaw,'DMZ-Raid-Board-recovery.txt');});
$('freshBoard').addEventListener('click',()=>ask('Start a fresh board?','Keep the unreadable saved text as a recovery copy and replace the active board with an empty board?',()=>{try{localStorage.setItem(key+'-recovery',corruptRaw||'');}catch{throw new Error('Recovery copy could not be saved. Export the saved text first.');}state=emptyState();corruptRaw=null;storageAvailable=true;$('recovery').hidden=true;render();},'Start fresh'));
$('sourcesBtn').addEventListener('click',()=>$<HTMLDialogElement>('sources').showModal());
$('closeSources').addEventListener('click',()=>$<HTMLDialogElement>('sources').close());
$<HTMLSelectElement>('category').innerHTML='<option>All</option>'+categories.map(c=>`<option ${c==='Upgrades'?'selected':''}>${c}</option>`).join('');
$<HTMLSelectElement>('directItem').innerHTML=materials.filter(m=>m!=='DMZ Cash').map(m=>`<option>${escape(m)}</option>`).join('');
const coverage=`${recipes.length} entries · ${recipes.filter(r=>r.costs).length} selectable · ${Object.keys(art).length} target images`;
$('coverage').textContent=coverage;$('sourceCoverage').textContent=coverage+'. '+recipes.filter(r=>!r.costs).length+' entries have unresolved requirements and are disabled. Category coverage does not mean complete recipe coverage.';
render();
