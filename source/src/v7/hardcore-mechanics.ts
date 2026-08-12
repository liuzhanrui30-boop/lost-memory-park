import type { ContractDefinition } from '../v2/types';

export interface ContractMetrics {
  failed:boolean;
  elapsed:number;
  deaths:number;
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

/** A tracking device is considered safely passed once the player clears its body and sightline. */
export function sentryPassed(playerX:number,sentryX:number,clearance=110):boolean{return playerX>sentryX+clearance;}

export function contractSuccess(contract:ContractDefinition|undefined,metrics:ContractMetrics):boolean{
  if(!contract||metrics.failed)return false;
  const target=contract.target??0;
  if(contract.rule==='no-death')return metrics.deaths===0;
  if(contract.rule==='speed')return metrics.elapsed<=target;
  return true;
}
