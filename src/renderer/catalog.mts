import {catalogData,materialNames} from './catalog-data.mjs';
import {materialArt,recipeImages} from './image-catalog.mjs';
import {sortedNames} from './ordering.mjs';
import {additionalLootArt} from './artwork-data.mjs';
import {fieldUpgradeData} from './field-upgrade-data.mjs';
import {fieldBoxArtwork,type FieldBoxCrop} from './field-box-artwork.mjs';
export const categories = ['Upgrades','Consumables','Plate Carriers','Backpacks','Tacticals','Lethals','Field Upgrades','Fire Support','Gear','Ingredients'] as const;
export type Category = typeof categories[number];
export type Costs = Record<string,number>;
export interface Recipe {
 id:string;name:string;category:Category;costs:Costs|null;reportedCosts?:Costs|null;
 source:string;status:string;note:string;checked:string;requires?:string;
 costConflict?:string;
 family?:string;tier?:number;outputPerCraft?:number;image?:string;effect?:string;
 ownerVerification?:{date:string;evidence:string;cashRequired?:number;scope?:string};
 sources?:Array<{url:string;checked:string;sourceUpdated?:string}>;
 season?:'preseason'|'season-1'|'unknown';
 printerLocation?:string;
 nameVerification?:{date:string;evidence:string};
 isLoot?:boolean;
}
export const checked='2026-10-25';
export const recipes:Recipe[]=([...catalogData,...fieldUpgradeData] as unknown as Recipe[]).map(row=>({...row,image:recipeImages[row.name]||row.image}));
export const materials=sortedNames([...new Set([...materialNames,...fieldUpgradeData.flatMap(row=>Object.keys(row.costs||{}))])]);
export interface ArtAsset {file:string;rarity:string;verified?:boolean;crop?:FieldBoxCrop;presentation?:'regional-notes-screenshot'|'military-composites-screenshot'|'foreign-intelligence-targets-screenshot'}
const fieldLootArt=Object.fromEntries(fieldUpgradeData.map(row=>{const image=fieldBoxArtwork['printer:'+row.id];return [row.name,{file:image.file,rarity:'unknown',verified:true,crop:image.crop}];}));
export const art:Record<string,ArtAsset>={...materialArt,...additionalLootArt,...fieldLootArt};
