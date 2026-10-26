import {catalogData,materialNames} from './catalog-data.mjs';
import {materialArt,recipeImages} from './image-catalog.mjs';
import {sortedNames} from './ordering.mjs';
export const categories = ['Upgrades','Consumables','Plate Carriers','Backpacks','Tacticals','Lethals','Field Upgrades','Fire Support','Gear','Ingredients'] as const;
export type Category = typeof categories[number];
export type Costs = Record<string,number>;
export interface Recipe {
 id:string;name:string;category:Category;costs:Costs|null;reportedCosts?:Costs|null;
 source:string;status:string;note:string;checked:string;requires?:string;
 family?:string;tier?:number;outputPerCraft?:number;image?:string;effect?:string;
 ownerVerification?:{date:string;evidence:string;cashRequired?:number;scope?:string};
 sources?:Array<{url:string;checked:string;sourceUpdated?:string}>;
}
export const checked='2026-10-25';
export const recipes:Recipe[]=(catalogData as unknown as Recipe[]).map(row=>({...row,image:recipeImages[row.name]||row.image}));
export const materials=sortedNames(materialNames);
export interface ArtAsset {file:string;rarity:string;presentation?:'regional-notes-screenshot'}
export const art:Record<string,ArtAsset>=materialArt;
