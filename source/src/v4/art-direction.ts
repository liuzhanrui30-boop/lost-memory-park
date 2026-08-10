export interface ChapterArt {
  skyTop:string;
  skyBottom:string;
  paper:string;
  paperShadow:string;
  ink:string;
  platform:string;
  platformDark:string;
  platformLight:string;
  accent:string;
  secondary:string;
  hazard:string;
  glow:string;
  curtain:string;
  mist:string;
}

const CHAPTER_ART:readonly ChapterArt[] = [
  {
    skyTop:'#6f4057',skyBottom:'#d88b78',paper:'#f2dfbd',paperShadow:'#a95e62',ink:'#291f2b',
    platform:'#cf6f78',platformDark:'#814450',platformLight:'#f2a48f',accent:'#efb84f',secondary:'#4f8f7d',
    hazard:'#c72f46',glow:'#ffd778',curtain:'#4a293d',mist:'#f6d8bd',
  },
  {
    skyTop:'#30243c',skyBottom:'#7a3d4c',paper:'#ead8b2',paperShadow:'#70404b',ink:'#211a26',
    platform:'#9f5860',platformDark:'#5c303b',platformLight:'#d98b79',accent:'#d8a541',secondary:'#3f7180',
    hazard:'#db3848',glow:'#ffd36a',curtain:'#321d2c',mist:'#cdb7a9',
  },
  {
    skyTop:'#172b35',skyBottom:'#4b6d72',paper:'#d9e0d6',paperShadow:'#536f72',ink:'#16242b',
    platform:'#6d9694',platformDark:'#385c60',platformLight:'#a8cebf',accent:'#d3b66b',secondary:'#8a6b8c',
    hazard:'#e04b55',glow:'#b9f4dc',curtain:'#162b33',mist:'#b9d5cf',
  },
  {
    skyTop:'#241522',skyBottom:'#70404b',paper:'#e3cfad',paperShadow:'#70414b',ink:'#1d1720',
    platform:'#8f535b',platformDark:'#4d2b36',platformLight:'#c67b70',accent:'#c99b48',secondary:'#4e8178',
    hazard:'#e13c4d',glow:'#f4c85f',curtain:'#271521',mist:'#b89791',
  },
] as const;

export function chapterArt(chapter:number):ChapterArt {
  const index=Math.max(0,Math.min(CHAPTER_ART.length-1,Math.round(chapter)-1));
  return CHAPTER_ART[index];
}

export function shade(hex:string,amount:number):string {
  const source=hex.replace('#','').padEnd(6,'0').slice(0,6);
  const value=Number.parseInt(source,16);
  const channels=[(value>>16)&255,(value>>8)&255,value&255].map(channel=>{
    const next=amount>=0?channel+(255-channel)*amount:channel*(1+amount);
    return Math.max(0,Math.min(255,Math.round(next)));
  });
  return `#${channels.map(channel=>channel.toString(16).padStart(2,'0')).join('')}`;
}

export function visualSeed(room:number,index:number):number {
  let value=(Math.imul(room+1,0x45d9f3b)^Math.imul(index+17,0x27d4eb2d))>>>0;
  value=(value^(value>>>16))>>>0;value=Math.imul(value,0x7feb352d)>>>0;value=(value^(value>>>15))>>>0;value=Math.imul(value,0x846ca68b)>>>0;value=(value^(value>>>16))>>>0;
  return value/0x100000000;
}
