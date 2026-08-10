import { describe,expect,it } from 'vitest';
import { rooms } from '../v2/rooms';

const hit=(a:{x:number;y:number;w:number;h:number},b:{x:number;y:number;w:number;h:number})=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;

describe('remaster retry and pacing safety',()=>{
  it('gives every scrolling room at least one mid-room checkpoint',()=>{
    for(const room of rooms.filter(r=>r.kind==='normal'))expect(room.checkpoints?.length??0).toBeGreaterThanOrEqual(1);
  });
  it('keeps spawns and checkpoints out of authored hazards',()=>{
    for(const room of rooms){const safe=[{x:room.spawn.x,y:room.spawn.y,w:30,h:42},...(room.checkpoints??[]).map(cp=>({x:cp.x-4,y:cp.y+cp.h-42,w:30,h:42}))];for(const rect of safe){for(const spike of room.spikes)expect(hit(rect,spike)).toBe(false);for(const laser of room.lasers??[])expect(hit(rect,laser)).toBe(false);}}
  });
  it('uses a distinct authored recipe for every formal room',()=>{
    const recipes=rooms.filter(r=>r.kind==='normal').map(room=>room.remixKind);expect(recipes).toHaveLength(24);expect(new Set(recipes).size).toBe(24);
  });
});
