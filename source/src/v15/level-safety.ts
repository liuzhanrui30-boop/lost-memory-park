import type { ButtonDef, CrusherDef, LaserDef, Rect, RoomDef, SpikeDef } from '../v2/types';

export type ButtonHazardKind='spike'|'laser'|'crusher';
export interface ButtonHazardConflict {buttonId:string;hazardId:string;kind:ButtonHazardKind}

export const rectsOverlap=(a:Rect,b:Rect):boolean=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;

export function buttonSafetyZone(button:ButtonDef,padding=6):Rect{
  return{x:button.x-padding,y:button.y-padding,w:button.w+padding*2,h:button.h+padding*2};
}

export function spikeSweptBounds(spike:SpikeDef):Rect{
  if(spike.orbit)return{x:spike.orbit.centerX-spike.orbit.radiusX-spike.w/2,y:spike.orbit.centerY-spike.orbit.radiusY-spike.h/2,w:spike.orbit.radiusX*2+spike.w,h:spike.orbit.radiusY*2+spike.h};
  if(spike.moving){
    const dx=spike.moving.axis==='x'?spike.moving.distance:0,dy=spike.moving.axis==='y'?spike.moving.distance:0;
    return{x:spike.x-Math.abs(dx),y:spike.y-Math.abs(dy),w:spike.w+Math.abs(dx)*2,h:spike.h+Math.abs(dy)*2};
  }
  return{x:spike.x,y:spike.y,w:spike.w,h:spike.h};
}

export function crusherSweptBounds(crusher:CrusherDef):Rect{
  const dx=crusher.axis==='x'?crusher.distance:0,dy=crusher.axis==='y'?crusher.distance:0;
  return{x:Math.min(crusher.x,crusher.x+dx),y:Math.min(crusher.y,crusher.y+dy),w:crusher.w+Math.abs(dx),h:crusher.h+Math.abs(dy)};
}

export function buttonHazardConflicts(room:Pick<RoomDef,'buttons'|'spikes'|'lasers'|'crushers'>,padding=6):ButtonHazardConflict[]{
  const conflicts:ButtonHazardConflict[]=[];
  for(const button of room.buttons??[]){
    const zone=buttonSafetyZone(button,padding);
    for(const spike of room.spikes)if(rectsOverlap(zone,spikeSweptBounds(spike)))conflicts.push({buttonId:button.id,hazardId:spike.id,kind:'spike'});
    for(const laser of room.lasers??[])if(rectsOverlap(zone,laser as LaserDef))conflicts.push({buttonId:button.id,hazardId:laser.id,kind:'laser'});
    for(const crusher of room.crushers??[])if(rectsOverlap(zone,crusherSweptBounds(crusher)))conflicts.push({buttonId:button.id,hazardId:crusher.id,kind:'crusher'});
  }
  return conflicts;
}
