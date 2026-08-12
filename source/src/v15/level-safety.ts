import type { ButtonDef, CrusherDef, LaserDef, Rect, RoomDef, SpikeDef } from '../v2/types';

export type ButtonHazardKind='spike'|'laser'|'crusher';
export interface ButtonHazardConflict {buttonId:string;hazardId:string;kind:ButtonHazardKind}
export interface SpikeObstacleConflict {spikeId:string;blockId:string}

export const rectsOverlap=(a:Rect,b:Rect):boolean=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;

/** Collision shape used by the runtime. The decorative base of a floor spike may sit
 * inside the floor; only the pointed lethal portion is relevant to overlap checks. */
export function spikeCollisionBounds(spike:SpikeDef):Rect{
  if(spike.direction==='up')return{x:spike.x+6,y:spike.y+8,w:Math.max(1,spike.w-12),h:Math.max(1,spike.h-8)};
  if(spike.direction==='down')return{x:spike.x+6,y:spike.y,w:Math.max(1,spike.w-12),h:Math.max(1,spike.h-8)};
  if(spike.direction==='left')return{x:spike.x,y:spike.y+6,w:Math.max(1,spike.w-8),h:Math.max(1,spike.h-12)};
  return{x:spike.x+8,y:spike.y+6,w:Math.max(1,spike.w-8),h:Math.max(1,spike.h-12)};
}

export function buttonSafetyZone(button:ButtonDef,padding=6):Rect{
  return{x:button.x-padding,y:button.y-padding,w:button.w+padding*2,h:button.h+padding*2};
}

export function spikeSweptBounds(spike:SpikeDef):Rect{
  const shape=spikeCollisionBounds(spike);
  if(spike.orbit)return{x:spike.orbit.centerX-spike.orbit.radiusX-spike.w/2+(shape.x-spike.x),y:spike.orbit.centerY-spike.orbit.radiusY-spike.h/2+(shape.y-spike.y),w:spike.orbit.radiusX*2+shape.w,h:spike.orbit.radiusY*2+shape.h};
  if(spike.moving){
    const dx=spike.moving.axis==='x'?spike.moving.distance:0,dy=spike.moving.axis==='y'?spike.moving.distance:0;
    return{x:shape.x-Math.abs(dx),y:shape.y-Math.abs(dy),w:shape.w+Math.abs(dx)*2,h:shape.h+Math.abs(dy)*2};
  }
  return shape;
}

function isFloorBlock(block:Rect):boolean{return block.y>=650&&block.h>=50;}

/** Finds lethal spike paths that enter a platform/wall. Static upward spikes planted
 * on a platform edge are intentional decoration/hazards and are exempted; animated
 * paths are never allowed to tunnel through authored geometry. */
export function spikeObstacleConflicts(room:Pick<RoomDef,'spikes'|'blocks'>):SpikeObstacleConflict[]{
  const conflicts:SpikeObstacleConflict[]=[];
  for(const spike of room.spikes){
    const swept=spikeSweptBounds(spike),animated=!!spike.moving||!!spike.orbit;
    for(const block of room.blocks){
      if(isFloorBlock(block)||!rectsOverlap(swept,block))continue;
      const anchoredUp=!animated&&spike.direction==='up'&&spike.y<block.y&&spike.y+spike.h<=block.y+12;
      const teachingFloorSpike=!animated&&spike.id.includes('-opening-fence-')&&spike.direction==='up'&&spike.y>=620;
      const authoredCeilingSpike=!animated&&spike.id.includes('-opening-ceiling-')&&spike.direction==='down';
      if(!anchoredUp&&!teachingFloorSpike&&!authoredCeilingSpike)conflicts.push({spikeId:spike.id,blockId:block.id});
    }
  }
  return conflicts;
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
