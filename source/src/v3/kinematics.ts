import type { Rect } from '../v2/types';

const overlaps=(a:Rect,b:Rect)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;

export function splitMotion(amount:number,maxStep=3):number[]{
  if(!Number.isFinite(amount)||amount===0)return[];const size=Math.max(.25,Math.abs(maxStep)),count=Math.max(1,Math.ceil(Math.abs(amount)/size)),step=amount/count;
  return Array.from({length:count},()=>step);
}

export function findCornerCorrection(body:Rect,solids:Rect[],maxOffset=6):number{
  if(!solids.some(s=>overlaps(body,s)))return 0;
  for(let distance=1;distance<=maxOffset;distance++){
    const left={...body,x:body.x-distance};if(!solids.some(s=>overlaps(left,s)))return-distance;
    const right={...body,x:body.x+distance};if(!solids.some(s=>overlaps(right,s)))return distance;
  }
  return 0;
}

export function findSupport<T extends Rect>(body:Rect,solids:T[],tolerance=3):T|null{
  const bottom=body.y+body.h,candidates=solids.filter(s=>body.x+body.w>s.x+1&&body.x<s.x+s.w-1&&bottom<=s.y&&s.y-bottom<=tolerance);
  return candidates.sort((a,b)=>a.y-b.y)[0]??null;
}

/** Floor probes are valid while falling, or while a platform is carrying an already grounded player upward. */
export function shouldProbeSupport(verticalMotion:number,wasGrounded:boolean):boolean{return verticalMotion>=0||wasGrounded;}

/** Preserves useful platform momentum without allowing a fast device to fling the player uncontrollably. */
export function platformLaunchVelocity(deltaX:number,deltaY:number,dt:number):{x:number;y:number}{
  if(!Number.isFinite(dt)||dt<=0)return{x:0,y:0};
  const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
  return{x:clamp(deltaX/dt*.68,-160,160),y:deltaY<0?clamp(deltaY/dt*.48,-145,0):0};
}
