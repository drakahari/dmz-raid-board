/** Viewport coordinates on the unchanged owner screenshot; no cropped bitmap is created. */
export interface FieldBoxCrop {
 x:number;y:number;width:number;height:number;sourceWidth:number;sourceHeight:number;
}
export interface FieldBoxArtwork {
 file:string;label:string;credit:string;sourcePage:string;rights:string;crop:FieldBoxCrop;
}
const file='field-upgrade-boxes-owner-screenshot.png';
const credit='Activision / respective rights holders; owner-provided in-game screenshot';
const sourcePage='Owner-provided in-game screenshot';
const rights='Game artwork belongs to Activision/respective rights holders. All rights reserved. No reuse or redistribution license is established by attribution.';
const box=(name:string,x:number,y:number,width:number,height:number):FieldBoxArtwork=>({
 file,label:name+' icon from owner screenshot (display crop)',credit,sourcePage,rights,
 crop:{x,y,width,height,sourceWidth:613,sourceHeight:961}
});
export const fieldBoxArtwork:Record<string,FieldBoxArtwork>={
 'printer:consumable-box':box('Consumable Box',82,41,61,63),
 'printer:medical-box':box('Medical Box',82,172,61,64),
 'printer:hazmat-box':box('Hazmat Box',82,304,61,64),
 'printer:utility-box':box('Utility Box',82,694,61,67),
 'printer:survivor-box':box('Survivor Box',82,826,62,65)
};
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
let viewportId=0;
/** Only this SVG viewport is visible; the original local screenshot remains byte-identical. */
export function renderFieldBoxCrop(artwork:Pick<FieldBoxArtwork,'file'|'crop'>,label:string):string {
 const {crop}=artwork;
 const clipId='fieldBoxViewport'+(++viewportId);
 // Explicit clipping also excludes source pixels from any aspect-ratio letterboxing.
 return '<svg xmlns="http://www.w3.org/2000/svg" class="fieldBoxCrop" data-field-box-crop="'+escape(artwork.file)+'" viewBox="'+[crop.x,crop.y,crop.width,crop.height].join(' ')+'" preserveAspectRatio="xMidYMid meet" role="img" aria-label="'+escape(label)+'"><title>'+escape(label)+'</title><defs><clipPath id="'+clipId+'" clipPathUnits="userSpaceOnUse"><rect x="'+crop.x+'" y="'+crop.y+'" width="'+crop.width+'" height="'+crop.height+'"/></clipPath></defs><image data-field-box-image="true" href="assets/'+escape(artwork.file)+'" x="0" y="0" width="'+crop.sourceWidth+'" height="'+crop.sourceHeight+'" clip-path="url(#'+clipId+')"/></svg>';
}
