// Additive owner-requested catalog data. Null means unresolved, never free printing.
const checked='2026-11-06';
const orders='https://codcentral.net/blog/mw4-dmz-orders/';
const recipes='https://codcentral.net/blog/mw4-dmz-3d-printer-recipes/';
const nameVerification={date:checked,evidence:'Owner-provided in-game Field Upgrades list; item labels and icons only. Inventory counts are not recipe requirements.'};
const unresolved='Full ingredient quantities have not been verified. The owner screenshot shows the item name and icon, not the required materials. Use Want it in the library to track the box itself; recipe planning remains unavailable until a complete printer card is verified.';
export const fieldUpgradeData=[
 {id:'consumable-box',name:'Consumable Box',category:'Field Upgrades',season:'season-1',costs:null,reportedCosts:null,
  source:orders,status:'Owner-observed item; recipe requirements unresolved',note:unresolved,checked,
  requires:'Recipe reward: complete X01 Orders page 2. Ingredient quantities and exact printer station remain unverified.',
  printerLocation:'In-game 3D Printer; specific station unverified',nameVerification,
  sources:[{url:orders,checked,sourceUpdated:checked}],image:'field-upgrade-boxes-owner-screenshot.png'},
 {id:'medical-box',name:'Medical Box',category:'Field Upgrades',season:'season-1',costs:null,reportedCosts:null,
  source:orders,status:'Owner-observed item; recipe requirements unresolved',note:unresolved,checked,
  requires:'Recipe reward: complete X01 Orders page 2. Ingredient quantities and exact printer station remain unverified.',
  printerLocation:'In-game 3D Printer; specific station unverified',nameVerification,
  sources:[{url:orders,checked,sourceUpdated:checked}],image:'field-upgrade-boxes-owner-screenshot.png'},
 {id:'hazmat-box',name:'Hazmat Box',category:'Field Upgrades',season:'season-1',costs:null,reportedCosts:null,
  source:orders,status:'Owner-observed item; recipe requirements unresolved',note:unresolved,checked,
  requires:'Recipe reward: complete X01 Orders page 3. Ingredient quantities and exact printer station remain unverified.',
  printerLocation:'In-game 3D Printer; specific station unverified',nameVerification,
  sources:[{url:orders,checked,sourceUpdated:checked}],image:'field-upgrade-boxes-owner-screenshot.png'},
 {id:'utility-box',name:'Utility Box',category:'Field Upgrades',season:'unknown',costs:null,reportedCosts:null,
  source:'https://ggranked.com/games/call-of-duty-modern-warfare-4/modes/dmz/database/items/printed-circuit-board',
  status:'Owner-observed item; recipe requirements unresolved',note:unresolved+' A partial reference to Printed Circuit Board is not a complete bill and is not imported as a craftable recipe.',checked,
  requires:'Recipe unlock, ingredient quantities and introduction season unverified; check your current in-game card.',
  printerLocation:'Printer location unverified',nameVerification,
  sources:[{url:'https://ggranked.com/games/call-of-duty-modern-warfare-4/modes/dmz/database/items/printed-circuit-board',checked}],image:'field-upgrade-boxes-owner-screenshot.png'},
 {id:'survivor-box',name:'Survivor Box',category:'Field Upgrades',season:'season-1',
  costs:{'SR-16 Bio Agent Sample':1,'Ballistic Fabric':2,'High-Tenacity Fibers':3},
  reportedCosts:{'SR-16 Bio Agent Sample':1,'Ballistic Fabric':2,'High-Tenacity Fibers':3},
  source:recipes,status:'Cross-checked community item requirements; owner-observed name',checked,
  note:'Deploys survival items. Two community references agree on the item quantities; the owner list verifies the name and icon only. This is an X01 printer recipe, not a FOB printer recipe.',
  requires:'X01 3D Printer only: Production Assembly E5, Data Center floor. Check current in-game eligibility.',
  printerLocation:'X01 3D Printer only - Production Assembly E5, Data Center floor',nameVerification,
  sources:[{url:recipes,checked,sourceUpdated:checked},{url:'https://dmzmap.com/3d-printer',checked,sourceUpdated:'2026-10-27'}],image:'field-upgrade-boxes-owner-screenshot.png'}
].map(row=>({...row,isLoot:true}));
