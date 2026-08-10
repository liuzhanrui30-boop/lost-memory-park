import type { SentryPattern } from '../v2/types';

export interface PatternProjectile {vx:number;vy:number;gravity:number;r:number}

const rotate=(x:number,y:number,angle:number):{vx:number;vy:number}=>({vx:x*Math.cos(angle)-y*Math.sin(angle),vy:x*Math.sin(angle)+y*Math.cos(angle)});

export function patternLabel(pattern:SentryPattern='aimed'):string{
  return{aimed:'点射',arc:'抛射',fan:'扇射',mirror:'镜射',burst:'连射'}[pattern];
}

export function patternGlyph(pattern:SentryPattern='aimed'):string{
  return{aimed:'●',arc:'∩',fan:'≪',mirror:'◇◇',burst:'•••'}[pattern];
}

export function buildProjectilePattern(pattern:SentryPattern,base:{vx:number;vy:number}):PatternProjectile[]{
  if(pattern==='arc')return[{vx:base.vx*.88,vy:base.vy*.68-175,gravity:390,r:13}];
  if(pattern==='fan')return[-.18,0,.18].map(angle=>({...rotate(base.vx,base.vy,angle),gravity:0,r:9}));
  if(pattern==='mirror')return[-.105,.105].map(angle=>({...rotate(base.vx,base.vy,angle),gravity:0,r:11}));
  if(pattern==='burst')return[.76,1,1.24].map(scale=>({vx:base.vx*scale,vy:base.vy*scale,gravity:0,r:8}));
  return[{...base,gravity:0,r:11}];
}
