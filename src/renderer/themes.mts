import {themeSources} from './theme-data.mjs';
export const themeKey='dmz-raid-board-theme-v1';
export const defaultTheme='original';
export const rgb=(hex:string)=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
export function mix(a:string,b:string,fraction:number):string{return '#'+rgb(a).map((n,i)=>Math.round(n*(1-fraction)+rgb(b)[i]*fraction).toString(16).padStart(2,'0')).join('');}
export function contrast(a:string,b:string):number{
 const luminance=(color:string)=>rgb(color).map(v=>v/255).reduce((sum,v,i)=>sum+(v<=.04045?v/12.92:((v+.055)/1.055)**2.4)*[.2126,.7152,.0722][i],0);
 const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
function readable(color:string,backgrounds:string[],minimum:number):string{
 const target=['#000000','#ffffff'].sort((a,b)=>Math.min(...backgrounds.map(bg=>contrast(b,bg)))-Math.min(...backgrounds.map(bg=>contrast(a,bg))))[0];
 for(let n=0;n<=100;n++){const result=mix(color,target,n/100);if(backgrounds.every(bg=>contrast(result,bg)>=minimum))return result;}
 throw Error('Palette cannot provide consistent text contrast');
}
function derive(source:typeof themeSources[number]){
 const bg=source.background.toLowerCase(),panel=mix(bg,source.foreground,.035),raised=mix(bg,source.foreground,.075),selected=mix(bg,source.accent,source.mode==='dark'?.14:.09);
 const surfaces=[bg,panel,raised,selected];
 const text=readable(source.foreground,surfaces,7),muted=readable(source.muted,surfaces,5),accent=readable(source.accent,surfaces,4.5);
 const onAccent=contrast('#000000',accent)>contrast('#ffffff',accent)?'#000000':'#ffffff';
 const border=readable(source.muted,surfaces,3),warning=readable('#bf8700',surfaces,5);
 return {bg,panel,raised,selected,text,muted,accent,onAccent,border,warning,art:'#1b201b'};
}
export const themes=[{id:defaultTheme,name:'Original Raid Board (default)',group:'Raid Board',mode:'dark',colors:null},...themeSources.map(source=>({...source,colors:derive(source)}))];
export function normalizeTheme(value:unknown):string{return typeof value==='string'&&themes.some(t=>t.id===value)?value:defaultTheme;}
export const themePaletteCss=themes.filter(t=>t.colors).map(t=>{const c=t.colors!;return ':root[data-theme="'+t.id+'"]{color-scheme:'+t.mode+';--bg:'+c.bg+';--panel:'+c.panel+';--line:'+c.border+';--muted:'+c.muted+';--lime:'+c.accent+';--text:'+c.text+';--raised:'+c.raised+';--selected:'+c.selected+';--on-accent:'+c.onAccent+';--warning-text:'+c.warning+';--art-stage:'+c.art+';}';}).join('\n');
