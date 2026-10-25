import {recipes,categories,materials,art as knownArt,checked,type Recipe,type Category} from './catalog.mjs';
import {installedImageFiles} from './asset-status.mjs';
import {type BoardState,sampleState,emptyState,parseBackup,serialize,count,recipeTotals,raidTargets,chooseRecipe,isComplete,newRaid,maxCount} from './core.mjs';
const $ = <T extends HTMLElement = HTMLElement>(id:string) => document.getElementById(id) as T;
const key='dmz-raid-board-state-v1';
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
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
function notice(message:string){$('notice').textContent=message;$('notice').hidden=!message;}
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
function costText(recipe:Recipe){if(!recipe.costs)return 'Cost unconfirmed';const cash=recipe.costs['DMZ Cash'];const itemCount=Object.keys(recipe.costs).filter(k=>k!=='DMZ Cash').length;return (cash?'$'+fmt(cash)+' + ':'')+itemCount+' ingredient'+(itemCount===1?'':'s');}
function renderGoals(){
 const goals=recipes.filter(r=>['gunsmith','stash'].includes(r.id)||(state.selected[r.id]||0)>0);
 $('upgrades').innerHTML=goals.map(r=>`<button class="upgrade ${state.selected[r.id]?'on':''}" data-recipe="${escape(r.id)}" aria-pressed="${!!state.selected[r.id]}" aria-label="${escape(r.name)}"><span class="symbol" aria-hidden="true">${r.category==='Upgrades'?'◈':'+'}</span><div><h3>${escape(r.name)}</h3><p>${r.id==='gunsmith'?'5% off Gunsmith purchases':r.id==='stash'?'Expand your item stash':escape(r.category)}</p><p>${escape(costText(r))}${r.category!=='Upgrades'?' · Quantity '+(state.selected[r.id]||0):''}</p></div><span class="selection" aria-hidden="true">${state.selected[r.id]?'✓':'+'}</span></button>`).join('');
}
function renderCatalog(){
 const category=$<HTMLSelectElement>('category').value;
 const term=$<HTMLInputElement>('search').value.trim().toLowerCase();
 const shown=recipes.filter(r=>(category==='All'||r.category===category)&&[r.name,...Object.keys(r.costs||{})].join(' ').toLowerCase().includes(term));
 $('catalogStatus').textContent=shown.length+' entries shown · '+checked;
 $('catalogList').innerHTML=shown.length?shown.map(r=>{
  const selected=state.selected[r.id]||0;
  const costs=r.costs?Object.entries(r.costs).map(([name,n])=>name==='DMZ Cash'?'$'+fmt(n):fmt(n)+' × '+escape(name)).join(' · '):'Cost not confirmed — selection unavailable';
  return `<article class="catalogEntry"><div><h3>${escape(r.name)}</h3><p>${costs}</p><p class="status">${escape(r.status)} · ${checked}</p><p>${escape(r.note)}</p><details><summary>Source</summary><p class="sourceUrl">${escape(r.source)}</p></details></div>${r.costs?`<div class="catalogControl"><button class="secondary" data-recipe="${escape(r.id)}" aria-label="${selected?'Remove':'Add'} ${escape(r.name)}" aria-pressed="${!!selected}">${selected?'✓ Selected':'+ Select'}</button>${r.category!=='Upgrades'?`<label>Quantity <input type="number" min="0" max="99" step="1" value="${selected}" data-quantity="${escape(r.id)}" aria-label="${escape(r.name)} quantity"></label>`:'<span class="micro">FIXED PERMANENT TIER</span>'}</div>`:'<span class="unconfirmed">Unconfirmed</span>'}</article>`;
 }).join(''):'<p>No matching recipes in this category.</p>';
}
function render(){
 const raid=mode==='raid';$('plan').hidden=raid;$('raidIntro').hidden=!raid;
 for(const [id,active] of [['planTab',!raid],['raidTab',raid]] as const){$(id).classList.toggle('active',active);if(active)$(id).setAttribute('aria-current','page');else $(id).removeAttribute('aria-current');}
 $<HTMLInputElement>('hideDone').checked=state.hideCompleted;
 renderGoals();renderCatalog();
 const totals=recipeTotals(state),targets=raidTargets(state);
 const active=Object.keys(targets);const wanted=active.filter(name=>targets[name]>0);
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
  return `<article class="item ${asset?.rarity||''} ${raid&&complete?'done':''}" data-card="${escape(name)}"><div class="art">${asset?`<span class="rarity" title="${asset.rarity}"></span><img src="assets/${asset.file}" alt="${escape(name)}" data-game-image="true"><span class="fallback" hidden>Image unavailable</span>`:'<span class="fallback">No verified image yet</span>'}${raid?`<button class="complete" data-complete="${escape(name)}" aria-label="${complete?'Uncheck':'Complete'} ${escape(name)}" aria-pressed="${complete}">${complete?'✓':'○'}</button>`:''}</div><div class="itembody"><h3>${escape(name)}</h3><div class="for">${escape(users||'Direct raid target')}</div>${raid?`<div class="count">${fmt(Math.max(0,target-picked))} <span>left to find</span></div><div class="for">${fmt(picked)} picked up / ${fmt(target)} target${state.completed.includes(name)?' · checked manually':''}</div><div class="controls"><button data-delta="-1" data-item="${escape(name)}" aria-label="Remove one ${escape(name)}">−</button><button class="add" data-delta="1" data-item="${escape(name)}" aria-label="Collect one ${escape(name)}">+</button></div>`:`<p class="required">Recipe total: ${fmt(totals[name]||0)}${name in state.targets?' · custom target':''}</p><label class="target">Need this raid <input aria-label="${escape(name)} target" type="number" min="0" max="100000000" step="1" value="${target}" data-target="${escape(name)}"></label>`}</div></article>`;
 }).join('');
 for(const img of document.querySelectorAll<HTMLImageElement>('img[data-game-image]'))img.addEventListener('error',()=>{img.hidden=true;(img.nextElementSibling as HTMLElement).hidden=false;});
 $('empty').hidden=shown.length>0;
 $('cash').textContent='$'+fmt(totals['DMZ Cash']||0)+' total selected-goal cost';
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
$('backup').addEventListener('click',()=>fileDownload(serialize(state),'DMZ-Raid-Board-backup-'+new Date().toISOString().slice(0,10)+'.json'));
$('import').addEventListener('click',()=>{$<HTMLInputElement>('importFile').value='';$<HTMLInputElement>('importFile').click();});
$('importFile').addEventListener('change',async()=>{
 const file=$<HTMLInputElement>('importFile').files?.[0];if(!file)return;
 try {if(file.size>1_000_000)throw new Error('Backup is too large (maximum 1 MB).');const next=parseBackup(await file.text());ask('Replace your board?','Import this valid backup and replace your current selections, raid targets, picked-up counts and checks? Your current board will be retained as a local recovery copy.',()=>{try{localStorage.setItem(key+'-recovery',corruptRaw??serialize(state));}catch{throw new Error('Could not preserve the current board. Export a backup first; import canceled.');}state=next;corruptRaw=null;storageAvailable=true;$('recovery').hidden=true;notice('Backup imported.');render();},'Import backup');}catch(e){showError(e);}
});
$('exportRecovery').addEventListener('click',()=>{if(corruptRaw!==null)fileDownload(corruptRaw,'DMZ-Raid-Board-recovery.txt');});
$('freshBoard').addEventListener('click',()=>ask('Start a fresh board?','Keep the unreadable saved text as a recovery copy and replace the active board with an empty board?',()=>{try{localStorage.setItem(key+'-recovery',corruptRaw||'');}catch{throw new Error('Recovery copy could not be saved. Export the saved text first.');}state=emptyState();corruptRaw=null;storageAvailable=true;$('recovery').hidden=true;render();},'Start fresh'));
$('sourcesBtn').addEventListener('click',()=>$<HTMLDialogElement>('sources').showModal());
$('closeSources').addEventListener('click',()=>$<HTMLDialogElement>('sources').close());
$<HTMLSelectElement>('category').innerHTML='<option>All</option>'+categories.map(c=>`<option ${c==='Upgrades'?'selected':''}>${c}</option>`).join('');
$<HTMLSelectElement>('directItem').innerHTML=materials.filter(m=>m!=='DMZ Cash').map(m=>`<option>${escape(m)}</option>`).join('');
const coverage=`${recipes.length} entries · ${recipes.filter(r=>r.costs).length} costed · ${Object.keys(art).length} pictures`;
$('coverage').textContent=coverage;$('sourceCoverage').textContent=coverage+'. '+recipes.filter(r=>!r.costs).length+' entries have unknown/conflicting costs and are disabled. Category coverage does not mean complete recipe coverage.';
render();
