import type { ContractDefinition, Rect } from '../v2/types';

export interface ContractMetrics {
  failed:boolean;
  elapsed:number;
  deaths:number;
  maxHeat:number;
  maxCombo:number;
}

const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));

/** Pursuit walls slow down when they are breathing down the player's neck and accelerate only when safely off-screen. */
export function pursuitVelocity(baseSpeed:number,maxSpeed:number,distanceToPlayer:number):number{
  const closeMercy=distanceToPlayer<155?.62:distanceToPlayer<245?.82:1;
  const catchup=Math.max(0,distanceToPlayer-430)*.2;
  return clamp((baseSpeed+catchup)*closeMercy,baseSpeed*.6,maxSpeed);
}

export function aimedVelocity(from:{x:number;y:number},target:{x:number;y:number},speed:number):{vx:number;vy:number}{
  const dx=target.x-from.x,dy=target.y-from.y,length=Math.hypot(dx,dy)||1;
  return{vx:dx/length*speed,vy:dy/length*speed};
}

export function leadTarget(from:{x:number;y:number},player:{x:number;y:number},velocity:{x:number;y:number},projectileSpeed:number,maxLead=.85):{x:number;y:number}{
  const travel=Math.min(maxLead,Math.hypot(player.x-from.x,player.y-from.y)/Math.max(1,projectileSpeed));
  return{x:player.x+velocity.x*travel*.9,y:player.y+velocity.y*travel*.38};
}

export function contractSuccess(contract:ContractDefinition|undefined,metrics:ContractMetrics):boolean{
  if(!contract||metrics.failed)return false;
  const target=contract.target??0;
  if(contract.rule==='no-death')return metrics.deaths===0;
  if(contract.rule==='speed')return metrics.elapsed<=target;
  if(contract.rule==='heat')return metrics.maxHeat>=target;
  if(contract.rule==='combo')return metrics.maxCombo>=target;
  return true;
}

export function comboTier(combo:number):0|1|2|3|4{
  if(combo>=20)return 4;if(combo>=12)return 3;if(combo>=7)return 2;if(combo>=3)return 1;return 0;
}

export function expanded(rect:Rect,margin:number):Rect{return{x:rect.x-margin,y:rect.y-margin,w:rect.w+margin*2,h:rect.h+margin*2};}
const intersects=(a:Rect,b:Rect)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;

/** A near miss is close enough to read as danger, but never overlaps the real damage box. */
export function isNearMiss(player:Rect,hazard:Rect,margin=20):boolean{
  return !intersects(player,hazard)&&intersects(player,expanded(hazard,margin));
}
